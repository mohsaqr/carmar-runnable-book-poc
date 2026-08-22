(() => {
  // src/r-kernel.js
  var DEFAULT_ROW_CAP = 500;
  function createRKernel(opts) {
    const { url, onEvent, onStatus } = opts;
    const WS = opts.WebSocketImpl || (typeof WebSocket !== "undefined" ? WebSocket : null);
    if (!WS) throw new Error("carmar: no WebSocket implementation available");
    if (!url) throw new Error("carmar: kernel url is required");
    let sock = null;
    let status = "idle";
    let info = null;
    let seq = 0;
    let current = null;
    const queue = [];
    let readyWaiters = [];
    const pendingRequests = /* @__PURE__ */ new Map();
    const viewListeners = /* @__PURE__ */ new Set();
    const frameListeners = /* @__PURE__ */ new Set();
    const setStatus = (s) => {
      status = s;
      if (onStatus) onStatus(s);
    };
    const blankAcc = () => ({
      stdout: [],
      stderr: [],
      messages: [],
      plots: [],
      tables: [],
      views: [],
      widgets: [],
      traceback: null
    });
    function pump() {
      if (current || queue.length === 0 || status !== "ready") return;
      current = queue.shift();
      sock.send(JSON.stringify({ type: "exec", id: current.id, source: current.source, dims: current.dims || null }));
    }
    function finish(frame) {
      if (!current || frame.id !== current.id) return;
      const { resolve, acc } = current;
      current = null;
      resolve({
        status: frame.status,
        stdout: acc.stdout.join("\n"),
        stderr: acc.stderr.join("\n"),
        messages: acc.messages,
        plots: acc.plots,
        tables: acc.tables,
        views: acc.views,
        widgets: acc.widgets,
        traceback: acc.traceback,
        message: frame.message ?? null
      });
      pump();
    }
    function handle(frame) {
      if (onEvent) onEvent(frame);
      frameListeners.forEach((fn) => {
        try {
          fn(frame);
        } catch (e) {
        }
      });
      if (frame.id && pendingRequests.has(frame.id)) {
        const pending = pendingRequests.get(frame.id);
        const responseType = pending.type === "rm" ? "removed" : pending.type;
        if (frame.type !== responseType && frame.type !== pending.type) return;
        clearTimeout(pending.timer);
        pending.resolve(frame);
        pendingRequests.delete(frame.id);
        return;
      }
      const belongsToCurrent = Boolean(current && (frame.id === current.id || frame.id == null));
      switch (frame.type) {
        case "ready":
          info = {
            pid: frame.pid,
            r: frame.r,
            home: frame.home,
            libs: frame.libs,
            commands: frame.commands
          };
          setStatus("ready");
          readyWaiters.forEach((w) => w.resolve(info));
          readyWaiters = [];
          pump();
          break;
        case "stdout":
          if (belongsToCurrent) current.acc.stdout.push(frame.text);
          break;
        case "stderr":
          if (belongsToCurrent) current.acc.stderr.push(frame.text);
          break;
        case "stream":
          if (belongsToCurrent) current.acc.messages.push({ kind: frame.kind, text: frame.text });
          break;
        case "plot":
          if (belongsToCurrent) current.acc.plots.push({
            mime: frame.mime,
            data: frame.data,
            width: frame.width,
            height: frame.height,
            // `res` is not optional. lib/output-pane.js sizes the figure by
            // pixels ÷ (res ÷ 96) — a 1500px plot at 300 dpi is a 5-inch
            // figure, not a 1500px one — and it was being dropped here, so the
            // divisor always fell back to 1 and every high-dpi plot displayed
            // at ~3x its true size while the zoom label read 100%. The worker
            // has always sent it (spike/worker.R emit_plot_frame).
            res: frame.res
          });
          break;
        case "dataframe":
          if (belongsToCurrent) current.acc.tables.push(normalizeTable(frame));
          break;
        case "widget":
          if (belongsToCurrent) current.acc.widgets.push({ class: frame.class, html: frame.html });
          break;
        // Where an error happened, captured before the stack unwound
        // (spike/worker.R capture_trace). One per failed cell.
        case "traceback":
          if (belongsToCurrent) {
            current.acc.traceback = {
              message: frame.message || "",
              line: frame.line == null ? null : Number(frame.line),
              call: frame.call || "",
              frames: Array.isArray(frame.frames) ? frame.frames : frame.frames ? [frame.frames] : []
            };
          }
          break;
        // A `view` frame here is unsolicited: it arrives because the cell called
        // View(df). When a data panel has registered itself it goes THERE — that
        // is what View() means in an IDE — and only falls back to the running
        // cell's output when no panel exists (e.g. headless tests).
        case "view":
          if (viewListeners.size) {
            viewListeners.forEach((fn) => {
              try {
                fn(frame);
              } catch (e) {
              }
            });
          } else if (belongsToCurrent) {
            current.acc.views.push(frame);
          }
          break;
        case "done":
          finish(frame);
          break;
        case "worker-died":
          failAll(new Error("The R worker died. Restart the kernel to continue."));
          setStatus("closed");
          break;
        default:
          break;
      }
    }
    function request(type, payload = {}, opts2 = {}) {
      if (status !== "ready") return Promise.reject(new Error("The R kernel is not connected."));
      const id = `${type}-${++seq}`;
      const timeoutMs = opts2.timeoutMs || 6e4;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error(`${type} timed out`));
          }
        }, timeoutMs);
        pendingRequests.set(id, { resolve, reject, type, timer });
        try {
          sock.send(JSON.stringify({ type, id, ...payload }));
        } catch (error) {
          clearTimeout(timer);
          pendingRequests.delete(id);
          reject(error);
        }
      });
    }
    function failAll(err) {
      const victims = current ? [current, ...queue] : [...queue];
      queue.length = 0;
      current = null;
      victims.forEach((c) => c.reject(err));
      readyWaiters.forEach((w) => w.reject(err));
      readyWaiters = [];
      pendingRequests.forEach((pending) => {
        clearTimeout(pending.timer);
        pending.reject(err);
      });
      pendingRequests.clear();
    }
    return {
      /** @returns {'idle'|'connecting'|'ready'|'closed'|'error'} */
      get status() {
        return status;
      },
      /** The worker's pid and R version, once it has announced itself. */
      get info() {
        return info;
      },
      /** True while a cell is running — core's `engineBusy`. */
      get busy() {
        return current !== null;
      },
      /** Cells waiting behind the running one. */
      get pending() {
        return queue.length;
      },
      /** Open the socket. Resolves when the worker announces itself. */
      connect() {
        if (sock) return this.whenReady();
        setStatus("connecting");
        sock = new WS(url);
        sock.addEventListener("message", (ev) => {
          let frame = null;
          try {
            frame = JSON.parse(ev.data);
          } catch (e) {
            return;
          }
          handle(frame);
        });
        sock.addEventListener("close", () => {
          setStatus("closed");
          failAll(new Error("Connection to the R kernel closed."));
        });
        sock.addEventListener("error", () => {
          setStatus("error");
          failAll(new Error("Could not reach the R kernel."));
        });
        return this.whenReady();
      },
      /** @returns {Promise<{pid:number,r:string}>} */
      whenReady() {
        if (status === "ready") return Promise.resolve(info);
        if (status === "closed" || status === "error") {
          return Promise.reject(new Error("The R kernel is not connected."));
        }
        return new Promise((resolve, reject) => readyWaiters.push({ resolve, reject }));
      },
      /**
       * Run R source. Resolves with a CellResult whatever R made of it — an R
       * error is a result, not a rejection. The promise rejects only when the
       * kernel itself is unreachable, which is a different problem needing a
       * different message.
       *
       * @param {string} source
       * @param {{id?:string}} [o]
       * @returns {Promise<CellResult>}
       */
      exec(source, o = {}) {
        if (status === "closed" || status === "error") {
          return Promise.reject(new Error("The R kernel is not connected."));
        }
        const id = o.id || `c${++seq}`;
        return new Promise((resolve, reject) => {
          queue.push({ id, source, dims: o.dims || null, resolve, reject, acc: blankAcc() });
          pump();
        });
      },
      request,
      /** Register a listener for unsolicited `view` frames — `View(df)` in a
       *  cell. While any listener is registered, views go to it INSTEAD of the
       *  running cell's output. Returns an unsubscribe function. */
      onView(fn) {
        viewListeners.add(fn);
        return () => viewListeners.delete(fn);
      },
      /** Tap every incoming frame, modelled or not. Returns unsubscribe. */
      onFrame(fn) {
        frameListeners.add(fn);
        return () => frameListeners.delete(fn);
      },
      /** Send a raw control frame (the MCP bridge's replies). True when it
       *  actually went out; false is "not connected", never an exception —
       *  a status report must not throw at whoever is only reporting. */
      sendFrame(obj) {
        if (!sock || status !== "ready" && status !== "connecting") return false;
        try {
          sock.send(JSON.stringify(obj));
          return true;
        } catch (e) {
          return false;
        }
      },
      /** Stop the running cell — core's `cancelEngine`. SIGINT, not SIGKILL: the
       *  session and its variables survive, and the cell resolves `interrupted`. */
      cancel() {
        if (sock && status === "ready" && current) {
          sock.send(JSON.stringify({ type: "interrupt", id: current.id }));
        }
      },
      /** A NEW worker process: fresh globalenv, fresh packages. Everything
       *  running or queued dies with an explicit message; resolves when the new
       *  worker announces ready. */
      restart() {
        if (!sock || status === "closed" || status === "error") {
          return Promise.reject(new Error("The R kernel is not connected."));
        }
        failAll(new Error("R was restarted \u2014 this run was abandoned."));
        setStatus("connecting");
        sock.send(JSON.stringify({ type: "restart" }));
        return this.whenReady();
      },
      close() {
        failAll(new Error("Connection to the R kernel closed."));
        if (sock) {
          try {
            sock.close();
          } catch (e) {
          }
        }
        sock = null;
        setStatus("closed");
      }
    };
  }
  function normalizeTable(frame) {
    const rows = Array.isArray(frame.rows) ? frame.rows : frame.rows ? [frame.rows] : [];
    return {
      columns: frame.columns.map((name, i) => ({
        name,
        rType: frame.types[i],
        type: mapRType(frame.types[i])
      })),
      rows,
      nrow: frame.nrow,
      ncol: frame.ncol,
      truncated: Boolean(frame.truncated),
      shown: rows.length,
      rowCap: DEFAULT_ROW_CAP
    };
  }
  function mapRType(rType) {
    if (rType === "numeric" || rType === "integer") return "number";
    if (rType === "logical") return "boolean";
    return "string";
  }

  // publish/published-runtime.js
  var DEFAULT_PORT = 4747;
  var PAIR_TIMEOUT_MS = 5 * 60 * 1e3;
  function element(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function numberMeta(doc, name, fallback) {
    const value = Number(doc.querySelector(`meta[name="${name}"]`)?.content || "");
    return Number.isInteger(value) && value > 0 && value < 65536 ? value : fallback;
  }
  function publishedConfig(doc = document) {
    return {
      port: numberMeta(doc, "carmar-port", DEFAULT_PORT),
      label: doc.querySelector('meta[name="carmar-label"]')?.content || "Run on my computer"
    };
  }
  function rCodeBlocks(doc = document) {
    const nodes = doc.querySelectorAll(
      ".cell .sourceCode.cell-code code.sourceCode.r, .cell pre > code.sourceCode.r"
    );
    return [...nodes].filter((code) => {
      const cell = code.closest(".cell");
      return cell && !cell.dataset.carmarPublished && !cell.closest(".carmar-no-run");
    });
  }
  function appendTextSection(doc, root, title, value, kind = "") {
    if (!value) return;
    const section = element(doc, "section", `carmar-published-stream ${kind}`.trim());
    section.append(element(doc, "div", "carmar-published-output-label", title));
    section.append(element(doc, "pre", "", String(value)));
    root.append(section);
  }
  function appendTable(doc, root, table) {
    const wrap = element(doc, "div", "carmar-published-table-wrap");
    const el = element(doc, "table", "carmar-published-table");
    const head = element(doc, "thead");
    const hr = element(doc, "tr");
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    columns.forEach((column) => hr.append(element(doc, "th", "", column.name)));
    head.append(hr);
    el.append(head);
    const body = element(doc, "tbody");
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    rows.forEach((row) => {
      const tr = element(doc, "tr");
      columns.forEach((column) => {
        const value = row?.[column.name];
        tr.append(element(doc, "td", "", value == null ? "" : String(value)));
      });
      body.append(tr);
    });
    el.append(body);
    wrap.append(el);
    if (table?.truncated) {
      wrap.append(element(
        doc,
        "div",
        "carmar-published-note",
        `Showing ${rows.length} of ${table.nrow} rows.`
      ));
    }
    root.append(wrap);
  }
  function csvCell(value) {
    if (value == null) return "";
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
  function tableCsv(table) {
    const columns = Array.isArray(table?.columns) ? table.columns : [];
    const rows = Array.isArray(table?.rows) ? table.rows : [];
    return [
      columns.map((column) => csvCell(column.name)).join(","),
      ...rows.map((row) => columns.map((column) => csvCell(row?.[column.name])).join(","))
    ].join("\r\n");
  }
  function textReport(result) {
    const parts = [];
    if (result?.stdout) parts.push(`Output
${result.stdout}`);
    (result?.messages || []).forEach((message) => {
      parts.push(`${message.kind === "warning" ? "Warning" : "Message"}
${message.text}`);
    });
    if (result?.stderr) parts.push(`R diagnostics
${result.stderr}`);
    if (result?.message) parts.push(`Error
${result.message}`);
    return `${parts.join("\n\n") || "Completed."}
`;
  }
  function exportLink(doc, label, filename, href) {
    const link = element(doc, "a", "carmar-published-export-link", label);
    link.href = href;
    link.download = filename;
    return link;
  }
  function updateExports(doc, menu, result, cellNumber) {
    const list = menu.querySelector(".carmar-published-export-list");
    list.replaceChildren();
    const prefix = `carmar-chunk-${cellNumber}`;
    list.append(exportLink(
      doc,
      "Result (.txt)",
      `${prefix}.txt`,
      `data:text/plain;charset=utf-8,${encodeURIComponent(textReport(result))}`
    ));
    (result?.tables || []).forEach((table, index) => {
      list.append(exportLink(
        doc,
        `Table ${index + 1} (.csv)`,
        `${prefix}-table-${index + 1}.csv`,
        `data:text/csv;charset=utf-8,${encodeURIComponent(tableCsv(table))}`
      ));
    });
    (result?.plots || []).forEach((plot, index) => {
      const mime = plot.mime || "image/png";
      const extension = mime === "image/svg+xml" ? "svg" : "png";
      list.append(exportLink(
        doc,
        `Plot ${index + 1} (.${extension})`,
        `${prefix}-plot-${index + 1}.${extension}`,
        `data:${mime};base64,${plot.data}`
      ));
    });
    menu.hidden = false;
  }
  function renderPublishedResult(result, root) {
    const doc = root.ownerDocument;
    root.replaceChildren();
    root.dataset.status = result?.status || "error";
    appendTextSection(doc, root, "Output", result?.stdout);
    (result?.messages || []).forEach((message) => {
      appendTextSection(
        doc,
        root,
        message.kind === "warning" ? "Warning" : "Message",
        message.text,
        message.kind
      );
    });
    appendTextSection(doc, root, "R diagnostics", result?.stderr, "stderr");
    (result?.tables || []).forEach((table) => appendTable(doc, root, table));
    (result?.plots || []).forEach((plot) => {
      const img = element(doc, "img", "carmar-published-plot");
      img.alt = "Plot produced by this R chunk";
      img.src = `data:${plot.mime || "image/png"};base64,${plot.data}`;
      if (Number(plot.width) > 0) img.width = Number(plot.width);
      if (Number(plot.height) > 0) img.height = Number(plot.height);
      root.append(img);
    });
    if (result?.status === "error") {
      appendTextSection(doc, root, "Error", result.message || "R stopped with an error.", "error");
    } else if (result?.status === "interrupted") {
      root.append(element(doc, "div", "carmar-published-note", "Run interrupted."));
    } else if (!root.childNodes.length) {
      root.append(element(doc, "div", "carmar-published-note", "Completed."));
    }
    root.hidden = false;
  }
  function pairingNonce(win) {
    if (win.crypto?.randomUUID) return win.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  function createPublishedSession(win, config, onStatus = () => {
  }) {
    const localOrigin = `http://127.0.0.1:${config.port}`;
    const socketUrl = `ws://127.0.0.1:${config.port}/ws`;
    let kernel = null;
    let bridge = null;
    let connecting = null;
    let pairing = null;
    const status = (state, text) => onStatus(state, text);
    function bridgeSocketClass(activeBridge) {
      return class BridgeSocket {
        constructor() {
          this.listeners = /* @__PURE__ */ new Map();
          this.closed = false;
          this.receive = (event) => {
            const data = event.data || {};
            if (event.source !== activeBridge.popup || event.origin !== localOrigin || data.nonce !== activeBridge.nonce) return;
            if (data.type === "carmar:bridge-frame") this.emit("message", { data: data.data });
            if (data.type === "carmar:bridge-error") this.emit("error", {});
            if (data.type === "carmar:bridge-close") this.finishClose();
          };
          win.addEventListener("message", this.receive);
          activeBridge.popup.postMessage({
            type: "carmar:bridge-attach",
            nonce: activeBridge.nonce
          }, localOrigin);
        }
        addEventListener(type, callback) {
          const listeners = this.listeners.get(type) || [];
          listeners.push(callback);
          this.listeners.set(type, listeners);
        }
        emit(type, event) {
          (this.listeners.get(type) || []).forEach((callback) => callback(event));
        }
        send(data) {
          if (this.closed || activeBridge.popup.closed) throw new Error("The CarmaR bridge is closed.");
          activeBridge.popup.postMessage({
            type: "carmar:bridge-send",
            nonce: activeBridge.nonce,
            data
          }, localOrigin);
        }
        finishClose() {
          if (this.closed) return;
          this.closed = true;
          activeBridge.closed = true;
          win.removeEventListener("message", this.receive);
          this.emit("close", {});
        }
        close() {
          if (!this.closed && !activeBridge.popup.closed) {
            activeBridge.popup.postMessage({
              type: "carmar:bridge-close",
              nonce: activeBridge.nonce
            }, localOrigin);
          }
          this.finishClose();
        }
      };
    }
    async function connect() {
      if (kernel?.status === "ready") return kernel;
      if (connecting) return connecting;
      kernel?.close();
      kernel = createRKernel({
        url: socketUrl,
        ...bridge ? { WebSocketImpl: bridgeSocketClass(bridge) } : {},
        onStatus: (state) => {
          if (state === "ready") status("ready", kernel?.info?.r || "R ready");
        }
      });
      status("connecting", "Connecting to R\u2026");
      connecting = kernel.connect().then(() => kernel).finally(() => {
        connecting = null;
      });
      return connecting;
    }
    function pair() {
      if (pairing) return pairing;
      const pageOrigin = win.location.origin;
      if (!/^https?:\/\//.test(pageOrigin)) {
        return Promise.reject(new Error("This published page must be opened from an http(s) site."));
      }
      const nonce = pairingNonce(win);
      const pairUrl = `${localOrigin}/pair?origin=${encodeURIComponent(pageOrigin)}&nonce=${encodeURIComponent(nonce)}`;
      status("pairing", "Approve this site in the CarmaR window\u2026");
      const popup = win.open(pairUrl, "carmar-pair", "popup,width=620,height=680");
      if (!popup) {
        return Promise.reject(new Error("The browser blocked the CarmaR approval window. Allow pop-ups and try again."));
      }
      pairing = new Promise((resolve, reject) => {
        const timer = win.setTimeout(() => finish(new Error("CarmaR approval timed out.")), PAIR_TIMEOUT_MS);
        const closed = win.setInterval(() => {
          if (popup.closed) finish(new Error("The local CarmaR bridge was closed."));
        }, 500);
        const receive = (event) => {
          const data = event.data;
          if (event.origin !== localOrigin || data?.type !== "carmar:paired" || data.origin !== pageOrigin || data.nonce !== nonce) return;
          finish(null, { popup, nonce, closed: false });
        };
        const finish = (error, value = null) => {
          win.clearTimeout(timer);
          win.clearInterval(closed);
          win.removeEventListener("message", receive);
          pairing = null;
          if (error) reject(error);
          else resolve(value);
        };
        win.addEventListener("message", receive);
      });
      return pairing;
    }
    async function ready() {
      const pageOrigin = win.location.origin;
      const needsBridge = /^https?:\/\//.test(pageOrigin) && pageOrigin !== localOrigin;
      if (needsBridge && bridge && (bridge.closed || bridge.popup.closed)) {
        kernel?.close();
        kernel = null;
        bridge = null;
        status("disconnected", "The local CarmaR window closed \u2014 approve it again to reconnect.");
      }
      if (kernel?.status === "ready") return kernel;
      if (needsBridge && !bridge) {
        bridge = await pair();
      }
      return connect();
    }
    return {
      ready,
      async run(source, dims) {
        const active = await ready();
        return active.exec(source, { dims: dims || null });
      },
      cancel() {
        kernel?.cancel();
      },
      get connected() {
        return kernel?.status === "ready";
      }
    };
  }
  function mountCell(doc, code, session, cellNumber) {
    const cell = code.closest(".cell");
    const source = code.closest("div.sourceCode") || code.closest("pre") || code.parentElement;
    if (!cell || !source) return null;
    cell.dataset.carmarPublished = "true";
    cell.classList.add("carmar-published-cell");
    const original = code.textContent || "";
    const editor = element(doc, "textarea", "carmar-published-editor");
    editor.value = original;
    editor.hidden = true;
    editor.spellcheck = false;
    editor.setAttribute("aria-label", "Editable R code");
    const toolbar = element(doc, "div", "carmar-published-cell-toolbar");
    const run = element(doc, "button", "carmar-published-run", "\u25B6 Run in CarmaR");
    run.type = "button";
    const edit = element(doc, "button", "carmar-published-edit", "Edit");
    edit.type = "button";
    const exports = element(doc, "details", "carmar-published-exports");
    exports.hidden = true;
    exports.append(
      element(doc, "summary", "", "Export"),
      element(doc, "div", "carmar-published-export-list")
    );
    const state = element(doc, "span", "carmar-published-cell-state", "Not run");
    toolbar.append(run, edit, exports, state);
    const output = element(doc, "div", "carmar-published-output");
    output.hidden = true;
    source.after(editor, toolbar, output);
    edit.addEventListener("click", () => {
      const opening = editor.hidden;
      editor.hidden = !opening;
      source.hidden = opening;
      edit.textContent = opening ? "Done" : "Edit";
      if (opening) {
        editor.style.height = "auto";
        editor.style.height = `${Math.max(editor.scrollHeight, 96)}px`;
        editor.focus();
      }
    });
    editor.addEventListener("input", () => {
      editor.style.height = "auto";
      editor.style.height = `${Math.max(editor.scrollHeight, 96)}px`;
      state.textContent = "Changed \u2014 not run";
    });
    const runCell = async () => {
      const sourceText = editor.value.trim();
      if (!sourceText) return;
      run.disabled = true;
      run.textContent = "Running\u2026";
      state.textContent = "Running";
      cell.dataset.carmarStatus = "running";
      try {
        const result = await session.run(sourceText);
        renderPublishedResult(result, output);
        updateExports(doc, exports, result, cellNumber);
        state.textContent = result.status === "ok" ? "Done" : result.status === "interrupted" ? "Interrupted" : "Error";
        cell.dataset.carmarStatus = result.status;
      } catch (error) {
        renderPublishedResult({ status: "error", message: String(error?.message || error) }, output);
        state.textContent = "Could not run";
        cell.dataset.carmarStatus = "error";
        throw error;
      } finally {
        run.disabled = false;
        run.textContent = "\u25B6 Run in CarmaR";
      }
    };
    run.addEventListener("click", () => {
      runCell().catch(() => {
      });
    });
    return { run: runCell, button: run };
  }
  function mountPublishedCarmaR(doc = document, win = window) {
    const blocks = rCodeBlocks(doc);
    if (!blocks.length) return null;
    const config = publishedConfig(doc);
    const firstCell = blocks[0].closest(".cell");
    const launcher = element(doc, "aside", "carmar-published-launcher");
    const brand = element(doc, "strong", "carmar-published-brand", "CarmaR");
    const bridgeState = element(doc, "span", "carmar-published-bridge-state", "Bridge disconnected");
    const message = element(
      doc,
      "span",
      "carmar-published-session-state",
      "Run these chunks with the R and packages installed on your computer."
    );
    const connect = element(doc, "button", "carmar-published-connect", config.label);
    connect.type = "button";
    const runAll = element(doc, "button", "carmar-published-run-all", "Run all");
    runAll.type = "button";
    runAll.hidden = true;
    launcher.append(brand, bridgeState, message, connect, runAll);
    firstCell.before(launcher);
    const setStatus = (state, text) => {
      launcher.dataset.status = state;
      bridgeState.textContent = state === "ready" ? "Bridge connected" : state === "pairing" || state === "connecting" ? "Bridge connecting" : "Bridge disconnected";
      message.textContent = text;
      connect.hidden = state === "ready";
      runAll.hidden = state !== "ready";
    };
    const session = createPublishedSession(win, config, setStatus);
    const cells = blocks.map((code, index) => mountCell(doc, code, session, index + 1)).filter(Boolean);
    connect.addEventListener("click", async () => {
      connect.disabled = true;
      try {
        await session.ready();
        setStatus("ready", "R ready \u2014 this page is running on your computer.");
      } catch (error) {
        setStatus("error", `${String(error?.message || error)} Start CarmaR in R with carmar::run_published(), then try again.`);
      } finally {
        connect.disabled = false;
      }
    });
    runAll.addEventListener("click", async () => {
      runAll.disabled = true;
      try {
        for (const cell of cells) await cell.run();
      } catch (error) {
        setStatus("error", String(error?.message || error));
      } finally {
        runAll.disabled = false;
      }
    });
    return { session, cells, launcher };
  }

  // publish/published-entry.js
  var start = () => mountPublishedCarmaR(document, window);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
