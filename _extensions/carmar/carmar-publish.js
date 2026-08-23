(() => {
  // ../Note/carmnote-core/src/primitives/csv-stream.js
  var QUOTE = 34;
  var QUOTE_BYTES = Uint8Array.of(QUOTE);

  // ../Note/carmnote-core/src/primitives/stream-dataset.js
  var LARGE_FILE_BYTES = 50 * 1024 * 1024;

  // ../Note/carmnote-core/src/primitives/table.js
  var PAGE_SIZES = [10, 25, 50, 100];
  var WIDE_COL_THRESHOLD = 12;
  function extractRows(data, opts = {}) {
    const colSpec = data ? Array.isArray(data.columns) ? data.columns : Array.isArray(data.headers) ? data.headers : null : null;
    if (data && colSpec && Array.isArray(data.rows)) {
      const headers = colSpec.map(
        (c) => c && typeof c === "object" && "name" in c ? String(c.name) : String(c)
      );
      const rows = data.rows.map((r) => {
        if (Array.isArray(r)) return r.slice();
        return headers.map((h) => r && h in r ? r[h] : "");
      });
      return { headers, rows };
    }
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { headers: opts.columns ? colNames(opts.columns) : [], rows: [] };
      }
      if (Array.isArray(data[0])) {
        const headers2 = opts.columns ? colNames(opts.columns) : data[0].map((_, i) => `V${i + 1}`);
        return { headers: headers2, rows: data.map((r) => r.slice()) };
      }
      if (data[0] && typeof data[0] === "object") {
        const headers2 = opts.columns ? colNames(opts.columns) : Object.keys(data[0]);
        const rows = data.map((o) => headers2.map((h) => h in o ? o[h] : ""));
        return { headers: headers2, rows };
      }
      const headers = opts.columns ? colNames(opts.columns) : ["value"];
      return { headers, rows: data.map((v) => [v]) };
    }
    return { headers: [], rows: [] };
  }
  function colNames(columns) {
    return columns.map(
      (c) => c && typeof c === "object" && "name" in c ? String(c.name) : String(c)
    );
  }
  function fmtCell(v, digits) {
    if (v == null) return "";
    if (typeof v === "number") {
      if (!Number.isFinite(v)) return String(v);
      if (Number.isInteger(v)) return String(v);
      return digits == null ? String(v) : Number(v.toFixed(digits)).toString();
    }
    return String(v);
  }
  var TABLE_CSS = `
.carm-tbl-shell{--cnr-accent:var(--cn-accent,#2563EB);--cnr-border:var(--cn-border,#e5e7eb);--cnr-grid:var(--cn-border-soft,#eef0f3);--cnr-text:var(--cn-text,#1a1a2e);--cnr-text-muted:var(--cn-text-muted,#5f6368);--cnr-surface:var(--cn-surface,#fff);--cnr-surface-soft:var(--cn-surface-soft,#fbfcfd);--cnr-head:var(--cn-surface-soft,#f6f8fa);--cnr-radius:var(--cn-radius-sm,4px);font:var(--cn-fs,13px) var(--cn-font,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif);color:var(--cnr-text);border:1px solid var(--cnr-border);border-radius:var(--cnr-radius);overflow:hidden;background:var(--cnr-surface)}
.carm-tbl-caption{padding:7px 10px;background:var(--cnr-head);border-bottom:1px solid var(--cnr-border);font-weight:600;font-size:var(--cn-fs-sm,12px);color:var(--cnr-text);letter-spacing:.2px}
.carm-tbl-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 10px;background:var(--cnr-head);border-bottom:1px solid var(--cnr-border);flex-wrap:wrap}
.carm-tbl-left,.carm-tbl-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.carm-pgn-label{color:var(--cnr-text-muted);font-size:var(--cn-fs-sm,11px);white-space:nowrap}
.carm-tbl-shell select,.carm-tbl-shell button{font-family:inherit;font-size:var(--cn-fs-sm,11px);color:var(--cnr-text);background:var(--cnr-surface);border:1px solid var(--cnr-border);border-radius:var(--cnr-radius);padding:3px 8px;cursor:pointer}
.carm-tbl-shell button:hover,.carm-tbl-shell select:hover{border-color:var(--cnr-accent)}
.carm-tbl-shell button:disabled{opacity:.45;cursor:default}
.carm-tbl-shell .carm-export-btn{position:relative}
.carm-tbl-menu{position:absolute;top:100%;right:0;margin-top:2px;background:var(--cnr-surface);border:1px solid var(--cnr-border);border-radius:var(--cnr-radius);box-shadow:var(--cn-shadow-lg,0 4px 14px rgba(0,0,0,.12));z-index:30;min-width:120px;overflow:hidden}
.carm-tbl-menu[hidden]{display:none}
.carm-tbl-menu button{display:block;width:100%;text-align:left;border:none;border-radius:0;background:var(--cnr-surface);padding:6px 12px}
.carm-tbl-menu button:hover{background:var(--cnr-accent);color:var(--cn-on-dark,#fff)}
.carm-tbl-scroll{overflow:auto;max-height:var(--carm-tbl-maxh,520px)}
.carm-tbl-scroll table{border-collapse:separate;border-spacing:0;width:100%;font-size:var(--cn-fs,13px)}
.carm-tbl-scroll th,.carm-tbl-scroll td{padding:5px 10px;border-bottom:1px solid var(--cnr-grid);text-align:left;white-space:nowrap;background:var(--cnr-surface)}
.carm-tbl-scroll thead th{position:sticky;top:0;z-index:3;background:var(--cnr-head);font-weight:600;border-bottom:1px solid var(--cnr-border);cursor:pointer;user-select:none}
.carm-tbl-scroll tbody tr:nth-child(even) td{background:var(--cnr-surface-soft)}
.carm-tbl-scroll .carm-stick-col{position:sticky;left:0;z-index:2;background:var(--cnr-surface);font-weight:600;border-right:1px solid var(--cnr-border)}
.carm-tbl-scroll tbody tr:nth-child(even) .carm-stick-col{background:var(--cnr-surface-soft)}
.carm-tbl-scroll thead th.carm-stick-col{z-index:4;background:var(--cnr-head)}
.carm-tbl-scroll th .carm-sort-ind{color:var(--cnr-accent);font-size:var(--cn-fs-xs,10px);margin-left:4px}
.carm-tbl-num{text-align:right;font-variant-numeric:tabular-nums}
.carm-tbl-empty{padding:18px;text-align:center;color:var(--cnr-text-muted)}
`;
  function ensureStyles(doc) {
    const root = doc || document;
    const target = root.head || root;
    if (!target || !target.querySelector) return;
    if (target.querySelector("style[data-carm-table]")) return;
    const style = (root.ownerDocument || document).createElement("style");
    style.setAttribute("data-carm-table", "");
    style.textContent = TABLE_CSS;
    target.appendChild(style);
  }
  function renderTable(data, mountEl, opts = {}) {
    if (!mountEl) throw new Error("renderTable: mountEl is required");
    const doc = mountEl.ownerDocument || document;
    const rootNode = mountEl.getRootNode ? mountEl.getRootNode() : doc;
    ensureStyles(rootNode && rootNode.host ? rootNode : doc);
    const { headers, rows } = extractRows(data, opts);
    const digits = opts.digits;
    const stickyFirst = opts.stickyFirstColumn !== false;
    const exportable = opts.exportable !== false;
    const title = opts.title || "table";
    const numericCol = headers.map((_, c) => {
      let num = 0, seen = 0;
      for (let r = 0; r < rows.length; r++) {
        const v = rows[r][c];
        if (v == null || v === "") continue;
        seen++;
        if (typeof v === "number" || typeof v === "string" && /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(v.trim())) num++;
      }
      return seen > 0 && num === seen;
    });
    const showToolbar = opts.toolbar !== false;
    const state = {
      pageSize: showToolbar ? opts.pageSize || 10 : Infinity,
      // number, or Infinity for "All"
      page: 0,
      // vertical page index
      colPage: 0,
      // horizontal page index
      sortCol: null,
      sortDir: 1,
      // 1 asc, -1 desc
      order: rows.map((_, i) => i)
      // row index order after sort
    };
    while (mountEl.firstChild) mountEl.removeChild(mountEl.firstChild);
    const shell = doc.createElement("div");
    shell.className = "carm-tbl-shell";
    mountEl.appendChild(shell);
    if (opts.caption) {
      const cap = doc.createElement("div");
      cap.className = "carm-tbl-caption";
      cap.textContent = String(opts.caption);
      shell.appendChild(cap);
    }
    if (headers.length === 0 || rows.length === 0) {
      const empty = doc.createElement("div");
      empty.className = "carm-tbl-empty";
      empty.textContent = headers.length === 0 ? "No columns." : "No rows.";
      shell.appendChild(empty);
      return { refresh: () => {
      }, getState: () => ({ ...state }) };
    }
    const toolbar = doc.createElement("div");
    toolbar.className = "carm-tbl-toolbar";
    const left = doc.createElement("div");
    left.className = "carm-tbl-left";
    const right = doc.createElement("div");
    right.className = "carm-tbl-right";
    toolbar.appendChild(left);
    toolbar.appendChild(right);
    if (showToolbar) shell.appendChild(toolbar);
    const label = doc.createElement("span");
    label.className = "carm-pgn-label";
    left.appendChild(label);
    const sizeSel = doc.createElement("select");
    sizeSel.setAttribute("aria-label", "Rows per page");
    PAGE_SIZES.forEach((n) => {
      const o = doc.createElement("option");
      o.value = String(n);
      o.textContent = `${n} rows`;
      sizeSel.appendChild(o);
    });
    const allOpt = doc.createElement("option");
    allOpt.value = "all";
    allOpt.textContent = "All";
    sizeSel.appendChild(allOpt);
    sizeSel.value = state.pageSize === Infinity ? "all" : String(state.pageSize);
    left.appendChild(sizeSel);
    const prevBtn = doc.createElement("button");
    prevBtn.textContent = "\u2039 Prev";
    const pageInfo = doc.createElement("span");
    pageInfo.className = "carm-pgn-label";
    const nextBtn = doc.createElement("button");
    nextBtn.textContent = "Next \u203A";
    left.appendChild(prevBtn);
    left.appendChild(pageInfo);
    left.appendChild(nextBtn);
    const wide = headers.length > WIDE_COL_THRESHOLD;
    let colPrev, colNext, colInfo;
    if (wide) {
      colPrev = doc.createElement("button");
      colPrev.textContent = "\u2039 Cols";
      colInfo = doc.createElement("span");
      colInfo.className = "carm-pgn-label";
      colNext = doc.createElement("button");
      colNext.textContent = "Cols \u203A";
      left.appendChild(colPrev);
      left.appendChild(colInfo);
      left.appendChild(colNext);
    }
    if (exportable && showToolbar) {
      const wrap = doc.createElement("div");
      wrap.className = "carm-export-btn";
      const btn = doc.createElement("button");
      btn.textContent = "Export \u25BE";
      const menu = doc.createElement("div");
      menu.className = "carm-tbl-menu";
      menu.hidden = true;
      let outsideClose = null;
      const closeMenu = () => {
        menu.hidden = true;
        if (outsideClose) {
          doc.removeEventListener("click", outsideClose);
          outsideClose = null;
        }
      };
      [["tsv", "TSV"], ["csv", "CSV"], ["md", "Markdown"], ["json", "JSON"], ["html", "HTML"], ["docx", "Word (.doc)"]].forEach(([fmt, lab]) => {
        const mb = doc.createElement("button");
        mb.textContent = lab;
        mb.addEventListener("click", () => {
          closeMenu();
          triggerDownload({ headers, rows: state.order.map((i) => rows[i]) }, fmt, title, digits, doc);
        });
        menu.appendChild(mb);
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!menu.hidden) {
          closeMenu();
          return;
        }
        menu.hidden = false;
        outsideClose = () => closeMenu();
        doc.addEventListener("click", outsideClose);
      });
      wrap.appendChild(btn);
      wrap.appendChild(menu);
      right.appendChild(wrap);
    }
    const scroll = doc.createElement("div");
    scroll.className = "carm-tbl-scroll";
    shell.appendChild(scroll);
    const table = doc.createElement("table");
    const thead = doc.createElement("thead");
    const tbody = doc.createElement("tbody");
    table.appendChild(thead);
    table.appendChild(tbody);
    scroll.appendChild(table);
    function visibleCols() {
      if (!wide) return headers.map((_, i) => i);
      const start2 = state.colPage * WIDE_COL_THRESHOLD;
      const idxs = [];
      if (stickyFirst && start2 > 0) idxs.push(0);
      for (let i = start2; i < Math.min(start2 + WIDE_COL_THRESHOLD, headers.length); i++) {
        if (!(stickyFirst && i === 0 && idxs.includes(0))) idxs.push(i);
      }
      return idxs;
    }
    function applySort() {
      const c = state.sortCol;
      if (c == null) {
        state.order = rows.map((_, i) => i);
        return;
      }
      const dir = state.sortDir;
      state.order = rows.map((_, i) => i).sort((a, b) => {
        const va = rows[a][c], vb = rows[b][c];
        const na = typeof va === "number" ? va : Number(va);
        const nb = typeof vb === "number" ? vb : Number(vb);
        if (Number.isFinite(na) && Number.isFinite(nb)) return (na - nb) * dir;
        return String(va == null ? "" : va).localeCompare(String(vb == null ? "" : vb)) * dir;
      });
    }
    function renderHead() {
      while (thead.firstChild) thead.removeChild(thead.firstChild);
      const tr = doc.createElement("tr");
      visibleCols().forEach((c) => {
        const th = doc.createElement("th");
        th.textContent = headers[c];
        if (numericCol[c]) th.classList.add("carm-tbl-num");
        if (stickyFirst && c === 0) th.classList.add("carm-stick-col");
        if (state.sortCol === c) {
          const ind = doc.createElement("span");
          ind.className = "carm-sort-ind";
          ind.textContent = state.sortDir === 1 ? "\u25B2" : "\u25BC";
          th.appendChild(ind);
        }
        th.addEventListener("click", () => {
          if (state.sortCol === c) state.sortDir = -state.sortDir;
          else {
            state.sortCol = c;
            state.sortDir = 1;
          }
          applySort();
          state.page = 0;
          render();
        });
        tr.appendChild(th);
      });
      thead.appendChild(tr);
    }
    function renderBody() {
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      const size = state.pageSize === Infinity ? state.order.length : state.pageSize;
      const start2 = state.page * size;
      const slice = state.order.slice(start2, start2 + size);
      const cols = visibleCols();
      slice.forEach((ri) => {
        const tr = doc.createElement("tr");
        cols.forEach((c) => {
          const td = doc.createElement("td");
          td.textContent = fmtCell(rows[ri][c], digits);
          if (numericCol[c]) td.classList.add("carm-tbl-num");
          if (stickyFirst && c === 0) td.classList.add("carm-stick-col");
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
    function renderPager() {
      const total = rows.length;
      const size = state.pageSize === Infinity ? total : state.pageSize;
      const pages = Math.max(1, Math.ceil(total / size));
      if (state.page >= pages) state.page = pages - 1;
      const from = total === 0 ? 0 : state.page * size + 1;
      const to = Math.min(total, (state.page + 1) * size);
      label.textContent = `${total} row${total === 1 ? "" : "s"}`;
      pageInfo.textContent = `${from}\u2013${to} of ${total}`;
      prevBtn.disabled = state.page <= 0;
      nextBtn.disabled = state.page >= pages - 1;
      if (wide) {
        const colPages = Math.ceil(headers.length / WIDE_COL_THRESHOLD);
        colInfo.textContent = `cols ${state.colPage + 1}/${colPages}`;
        colPrev.disabled = state.colPage <= 0;
        colNext.disabled = state.colPage >= colPages - 1;
      }
    }
    function render() {
      renderHead();
      renderBody();
      renderPager();
    }
    sizeSel.addEventListener("change", () => {
      state.pageSize = sizeSel.value === "all" ? Infinity : Number(sizeSel.value);
      state.page = 0;
      render();
    });
    prevBtn.addEventListener("click", () => {
      if (state.page > 0) {
        state.page--;
        render();
      }
    });
    nextBtn.addEventListener("click", () => {
      state.page++;
      render();
    });
    if (wide) {
      colPrev.addEventListener("click", () => {
        if (state.colPage > 0) {
          state.colPage--;
          render();
        }
      });
      colNext.addEventListener("click", () => {
        state.colPage++;
        render();
      });
    }
    applySort();
    render();
    return {
      refresh: render,
      getState: () => ({ ...state })
    };
  }
  function escCsv(s, delim) {
    const str = s == null ? "" : String(s);
    if (str.includes('"') || str.includes(delim) || str.includes("\n") || str.includes("\r")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  function escHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function exportTable(data, format, opts = {}) {
    const { headers, rows } = extractRows(data, opts);
    const digits = opts.digits;
    const cells = rows.map((r) => r.map((v) => fmtCell(v, digits)));
    const fmt = String(format || "csv").toLowerCase();
    switch (fmt) {
      case "tsv": {
        const head = headers.map((h) => escCsv(h, "	")).join("	");
        const body = cells.map((r) => r.map((c) => escCsv(c, "	")).join("	")).join("\n");
        return body ? head + "\n" + body : head;
      }
      case "csv": {
        const head = headers.map((h) => escCsv(h, ",")).join(",");
        const body = cells.map((r) => r.map((c) => escCsv(c, ",")).join(",")).join("\n");
        return body ? head + "\n" + body : head;
      }
      case "md": {
        const head = "| " + headers.map((h) => String(h).replace(/\|/g, "\\|")).join(" | ") + " |";
        const sep = "| " + headers.map(() => "---").join(" | ") + " |";
        const body = cells.map((r) => "| " + r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ") + " |").join("\n");
        return [head, sep, body].filter(Boolean).join("\n");
      }
      case "json": {
        const objs = rows.map((r) => {
          const o = {};
          headers.forEach((h, i) => {
            o[h] = r[i] == null ? null : r[i];
          });
          return o;
        });
        return JSON.stringify(objs, null, 2);
      }
      case "html": {
        const thead = "<thead><tr>" + headers.map((h) => `<th>${escHtml(h)}</th>`).join("") + "</tr></thead>";
        const tbody = "<tbody>" + cells.map((r) => "<tr>" + r.map((c) => `<td>${escHtml(c)}</td>`).join("") + "</tr>").join("") + "</tbody>";
        return `<table border="1" cellspacing="0" cellpadding="4">${thead}${tbody}</table>`;
      }
      case "docx": {
        const inner = exportTable(data, "html", opts);
        return [
          '<html xmlns:o="urn:schemas-microsoft-com:office:office" ',
          'xmlns:w="urn:schemas-microsoft-com:office:word" ',
          'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">',
          "<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt}",
          "th,td{border:1px solid #999;padding:4px 8px}th{background:#f0f0f0}</style>",
          "</head><body>",
          inner,
          "</body></html>"
        ].join("");
      }
      default:
        throw new Error(`exportTable: unsupported format "${format}"`);
    }
  }
  var MIME = {
    tsv: "text/tab-separated-values",
    csv: "text/csv",
    md: "text/markdown",
    json: "application/json",
    html: "text/html",
    docx: "application/msword"
  };
  var EXT = { tsv: "tsv", csv: "csv", md: "md", json: "json", html: "html", docx: "doc" };
  function safeName(s) {
    return String(s || "table").replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "table";
  }
  function triggerDownload(data, format, title, digits, doc) {
    const fmt = String(format).toLowerCase();
    const content = exportTable(data, fmt, { digits });
    const blob = new Blob([content], { type: (MIME[fmt] || "text/plain") + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement("a");
    a.href = url;
    a.download = `${safeName(title)}.${EXT[fmt] || "txt"}`;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // ../Note/carmnote-core/src/primitives/svg-export.js
  var PNG_DPI = 600;
  var PNG_SCALE = PNG_DPI / 96;

  // ../Note/carmnote-core/src/shell/icons.js
  var ICONS = {
    // Header: load data (down-into-tray arrow).
    upload: {
      children: [
        { tag: "path", attrs: { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" } },
        { tag: "polyline", attrs: { points: "17 8 12 3 7 8" } },
        { tag: "line", attrs: { x1: "12", y1: "3", x2: "12", y2: "15" } }
      ]
    },
    // Empty-state: bigger version, sized by caller.
    "upload-big": {
      width: 48,
      height: 48,
      children: [
        { tag: "path", attrs: { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" } },
        { tag: "polyline", attrs: { points: "17 8 12 3 7 8" } },
        { tag: "line", attrs: { x1: "12", y1: "3", x2: "12", y2: "15" } }
      ],
      stroke: "#4e79a7"
    },
    // Header row 2: New notebook (plus). carm-tna uses stroke-width 2.5; we keep
    // the default 2 so it matches the surrounding stroke set on the dark header.
    plus: {
      children: [
        { tag: "line", attrs: { x1: "12", y1: "5", x2: "12", y2: "19" } },
        { tag: "line", attrs: { x1: "5", y1: "12", x2: "19", y2: "12" } }
      ]
    },
    // Header row 1: container-width cycle (four corner brackets). Path copied
    // verbatim from carm-tna's #btn-width-toggle.
    "width-cycle": {
      children: [
        { tag: "polyline", attrs: { points: "4 8 4 4 8 4" } },
        { tag: "polyline", attrs: { points: "16 4 20 4 20 8" } },
        { tag: "polyline", attrs: { points: "4 16 4 20 8 20" } },
        { tag: "polyline", attrs: { points: "16 20 20 20 20 16" } }
      ]
    },
    // File menu.
    file: {
      children: [
        { tag: "path", attrs: { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" } },
        { tag: "polyline", attrs: { points: "14 2 14 8 20 8" } }
      ]
    },
    // Re-run all.
    play: {
      children: [{ tag: "polygon", attrs: { points: "5 3 19 12 5 21 5 3" } }]
    },
    // Save (floppy).
    save: {
      children: [
        { tag: "path", attrs: { d: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" } },
        { tag: "polyline", attrs: { points: "17 21 17 13 7 13 7 21" } },
        { tag: "polyline", attrs: { points: "7 3 7 8 15 8" } }
      ]
    },
    // HTML report (document with lines).
    report: {
      children: [
        { tag: "path", attrs: { d: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" } },
        { tag: "polyline", attrs: { points: "14 2 14 8 20 8" } },
        { tag: "line", attrs: { x1: "16", y1: "13", x2: "8", y2: "13" } },
        { tag: "line", attrs: { x1: "16", y1: "17", x2: "8", y2: "17" } }
      ]
    },
    // Print / PDF.
    print: {
      children: [
        { tag: "polyline", attrs: { points: "6 9 6 2 18 2 18 9" } },
        { tag: "path", attrs: { d: "M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" } },
        { tag: "rect", attrs: { x: "6", y: "14", width: "12", height: "8" } }
      ]
    },
    // Cell: minimize (chevron down; rotates 180deg via CSS when minimized).
    "chevron-down": {
      children: [{ tag: "polyline", attrs: { points: "6 9 12 15 18 9" } }]
    },
    // Cell: minimize — two arrows collapsing inward (feather minimize-2). The
    // cell-host swaps this with 'expand' as the cell state toggles.
    "minimize": {
      children: [
        { tag: "polyline", attrs: { points: "4 14 10 14 10 20" } },
        { tag: "polyline", attrs: { points: "20 10 14 10 14 4" } },
        { tag: "line", attrs: { x1: "14", y1: "10", x2: "21", y2: "3" } },
        { tag: "line", attrs: { x1: "3", y1: "21", x2: "10", y2: "14" } }
      ]
    },
    // Cell: expand — two arrows opening outward (feather maximize-2).
    "expand": {
      children: [
        { tag: "polyline", attrs: { points: "15 3 21 3 21 9" } },
        { tag: "polyline", attrs: { points: "9 21 3 21 3 15" } },
        { tag: "line", attrs: { x1: "21", y1: "3", x2: "14", y2: "10" } },
        { tag: "line", attrs: { x1: "3", y1: "21", x2: "10", y2: "14" } }
      ]
    },
    // Cell: locked padlock.
    "lock-closed": {
      children: [
        { tag: "rect", attrs: { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" } },
        { tag: "path", attrs: { d: "M7 11V7a5 5 0 0110 0v4" } }
      ]
    },
    // Cell: open padlock.
    "lock-open": {
      children: [
        { tag: "rect", attrs: { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" } },
        { tag: "path", attrs: { d: "M7 11V7a5 5 0 019.9-1" } }
      ]
    },
    // Cell: close (x).
    x: {
      children: [
        { tag: "line", attrs: { x1: "18", y1: "6", x2: "6", y2: "18" } },
        { tag: "line", attrs: { x1: "6", y1: "6", x2: "18", y2: "18" } }
      ]
    },
    // Export (down arrow into tray) — used by cell export menus.
    download: {
      children: [
        { tag: "path", attrs: { d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" } },
        { tag: "polyline", attrs: { points: "7 10 12 15 17 10" } },
        { tag: "line", attrs: { x1: "12", y1: "15", x2: "12", y2: "3" } }
      ]
    },
    // Cell: duplicate (two overlapping cards).
    copy: {
      children: [
        { tag: "rect", attrs: { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" } },
        { tag: "path", attrs: { d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" } }
      ]
    },
    // Undo (corner arrow up-left).
    undo: {
      children: [
        { tag: "polyline", attrs: { points: "9 14 4 9 9 4" } },
        { tag: "path", attrs: { d: "M20 20v-7a4 4 0 00-4-4H4" } }
      ]
    },
    // Library (open book) — the multi-notebook picker.
    book: {
      children: [
        { tag: "path", attrs: { d: "M4 19.5A2.5 2.5 0 016.5 17H20" } },
        { tag: "path", attrs: { d: "M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" } }
      ]
    },
    // Seal / integrity (shield).
    shield: {
      children: [
        { tag: "path", attrs: { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" } }
      ]
    },
    // Edit (pencil) — leave a hard lock tier / rename.
    edit: {
      children: [
        { tag: "path", attrs: { d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" } },
        { tag: "path", attrs: { d: "M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" } }
      ]
    },
    // Delete (trash).
    trash: {
      children: [
        { tag: "polyline", attrs: { points: "3 6 5 6 21 6" } },
        { tag: "path", attrs: { d: "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" } }
      ]
    },
    // Carm mark — a small connected-node triad (network motif). The brand glyph
    // on each embedded analysis pill. Nodes filled, edges stroked.
    "carm-mark": {
      children: [
        { tag: "line", attrs: { x1: "12", y1: "6", x2: "5.5", y2: "17.5" } },
        { tag: "line", attrs: { x1: "12", y1: "6", x2: "18.5", y2: "17.5" } },
        { tag: "line", attrs: { x1: "5.5", y1: "17.5", x2: "18.5", y2: "17.5" } },
        { tag: "circle", attrs: { cx: "12", cy: "6", r: "3.2", fill: "currentColor", stroke: "none" } },
        { tag: "circle", attrs: { cx: "5.5", cy: "17.5", r: "3.2", fill: "currentColor", stroke: "none" } },
        { tag: "circle", attrs: { cx: "18.5", cy: "17.5", r: "3.2", fill: "currentColor", stroke: "none" } }
      ]
    },
    // Settings (gear) — embed (piece) mode "⚙ reveal the form" toggle. A plain,
    // universally recognizable cog (Lucide "settings"): an 8-notch outline + a
    // centre hub. Reads as "settings" even at 15px, unlike the old vertical
    // sliders which crowded into illegible ticks. Key is `gear`; alias `sliders`
    // kept so any existing reference keeps resolving.
    gear: {
      children: [
        { tag: "path", attrs: { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" } },
        { tag: "circle", attrs: { cx: "12", cy: "12", r: "3" } }
      ]
    }
  };
  ICONS.sliders = ICONS.gear;
  var ICON_NAMES = Object.keys(ICONS);

  // ../Note/carmnote-core/src/shell/styles.js
  var SHELL_CSS = `
:host, .cn-root {
  /* \u2500\u2500 Chrome identity (dark header gradient + on-dark text) \u2500\u2500 */
  --cn-header-from:#1a1a2e; --cn-header-to:#16213e;
  --cn-on-dark:#ffffff; --cn-on-dark-dim:#c8d1dd; --cn-on-dark-soft:#dfe6ee;
  --cn-on-dark-muted:#8899aa;  /* dim ghost-chip text on the dark header (carm-sna) */

  /* \u2500\u2500 Accent (a notebook re-skins this via tokens; default steel-blue) \u2500\u2500 */
  --cn-accent:#4e79a7; --cn-accent-deep:#3a6a9f; --cn-accent-soft:#eef3f8;

  /* \u2500\u2500 Neutral surface system (ported from carm-sna v2.1.22) \u2500\u2500 */
  --cn-canvas:#f3f5f8; --cn-surface:#ffffff; --cn-surface-soft:#fafbfc;
  --cn-border:#e6e8eb; --cn-border-soft:#eef0f2;
  --cn-text:#1f2937; --cn-text-muted:#5f6368; --cn-text-dim:#9aa0a6;
  --cn-danger:#dc2626; --cn-danger-bg:#fef2f2; --cn-danger-line:#fecaca;

  /* \u2500\u2500 Elevation scale (ported from carm-sna) \u2500\u2500 */
  --cn-shadow-sm:0 1px 2px rgba(15,23,42,.04),0 1px 4px rgba(15,23,42,.06);
  --cn-shadow-md:0 1px 2px rgba(15,23,42,.04),0 4px 12px rgba(15,23,42,.08);
  --cn-shadow-lg:0 1px 2px rgba(15,23,42,.04),0 8px 24px rgba(15,23,42,.12);

  /* \u2500\u2500 Radius scale (ported from carm-sna). --cn-radius is a back-compat
     alias for -sm so the 'radius' brand token still lands somewhere. \u2500\u2500 */
  --cn-radius-sm:6px; --cn-radius-md:8px; --cn-radius-lg:12px;
  --cn-radius:var(--cn-radius-sm);

  --cn-font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --cn-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  /* \u2500\u2500 Type scale: FOUR sizes, TWO weights (400/600), TWO families. Every
     rule below maps to one of these \u2014 no ad-hoc sizes. \u2500\u2500 */
  --cn-fs-h:14px;   /* section headings */
  --cn-fs:13px;     /* body + tables (matches the table primitive) */
  --cn-fs-sm:11px;  /* labels, meta, chips, buttons, verbs */
  --cn-fs-xs:10px;  /* type badges, helper text */

  /* \u2500\u2500 Control-surface tints (ported from carm-sna's form controls). The
     resting control fill is a hair softer than --cn-surface; its hover border
     is one notch darker than --cn-border. These are the ONLY two extra neutral
     stops the form/slider system needs beyond the surface scale. \u2500\u2500 */
  --cn-control-bg:#fafbfc;      /* resting fill of inputs/selects/sliders */
  --cn-control-track:#e3e6ea;   /* range-slider track */
  --cn-border-strong:#cfd3d8;   /* control hover border, scrollbar thumb */
  --cn-danger-soft:#fce8e6;     /* danger-tinted hover (close buttons) */
  --cn-danger-border:#f5c2c0;   /* danger-tinted hover border */
  --cn-danger-text:#c5221f;     /* danger-tinted hover text */
  --cn-warn:#f28e2b;            /* secondary "shake/jiggle" action accent */
  --cn-warn-deep:#e07514;       /* hover/pressed of --cn-warn */

  /* \u2500\u2500 Focus ring \u2014 accent at low alpha (the carm-sna 3px halo). \u2500\u2500 */
  --cn-focus-ring:0 0 0 3px color-mix(in srgb,var(--cn-accent) 22%,transparent);

  /* \u2500\u2500 Motion scale \u2014 TWO durations, ONE ease. Every transition/animation in
     this sheet resolves to these (no ad-hoc 120/150/180/200ms sprinkle), and
     prefers-reduced-motion collapses them all at once. \u2500\u2500 */
  --cn-dur-1:150ms;   /* micro feedback: hovers, focus, chips, toggles */
  --cn-dur-2:200ms;   /* surface movement: cards lifting, toasts, menus, modals */
  --cn-ease:cubic-bezier(.2,.6,.2,1);

  /* \u2500\u2500 Per-verb signature gradients (ported verbatim from carm-sna v2.1.22
     lines 154-162). Each verb chip/badge carries its own two-stop gradient;
     these are SEMANTIC verb-identity colors (like the two --col-badge type
     colors), defined once here so the badge rules below stay token-only. \u2500\u2500 */
  --cn-verb-network:linear-gradient(135deg,#2563eb,#1a73e8);
  --cn-verb-properties:linear-gradient(135deg,#6366f1,#5c6bc0);
  --cn-verb-metrics:linear-gradient(135deg,#16a34a,#2e7d32);
  --cn-verb-centrality:linear-gradient(135deg,#f59e0b,#ea7c1d);
  --cn-verb-community:linear-gradient(135deg,#a855f7,#9333ea);
  --cn-verb-cliques:linear-gradient(135deg,#14b8a6,#0d9488);
  --cn-verb-generate:linear-gradient(135deg,#ef4444,#dc2626);
  --cn-verb-cooccurrence:linear-gradient(135deg,#22c55e,#16a34a);
  --cn-verb-edgelist:linear-gradient(135deg,#14b8a6,#0d9488);
}
.cn-root{font-family:var(--cn-font);font-size:var(--cn-fs);font-weight:400;line-height:1.45;color:var(--cn-text);background:var(--cn-canvas);display:block;min-height:100%;}
.cn-root *{box-sizing:border-box;}
/* Enforce HTML's [hidden] semantics. Several shell elements (the <header> while
   published, the .cn-pub-bar until published) carry explicit display:flex rules
   that out-specify the UA [hidden] sheet; without this an element toggled via
   the hidden attribute stays visible. !important keeps "hidden means hidden"
   true regardless of any component display rule. */
.cn-root [hidden]{display:none!important;}
/* Tame <b>/<strong> to the single emphasis weight (UA default is 700). */
.cn-root b,.cn-root strong{font-weight:600;}
/* Buttons + form controls inherit the scale \u2014 kills the 16px / 13.33px UA defaults. */
.cn-root button,.cn-root select,.cn-root input,.cn-root textarea{font-family:inherit;font-size:inherit;}

/* Header + verb bar.
   Two-row header ported from carm-tna (lines 779-847): <header> is a COLUMN
   flex of two .hdr-row elements; W1 (chrome.js) emits .hdr-row.hdr-row-id
   (identity) above .hdr-row.hdr-row-work (workspace). Each row is its own
   align-center, wrapping flex line. */
.cn-root header{background:linear-gradient(135deg,var(--cn-header-from) 0%,var(--cn-header-to) 100%);color:var(--cn-on-dark);display:flex;flex-direction:column;gap:6px;padding:8px 16px;box-shadow:var(--cn-shadow-sm);}
.cn-root .hdr-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.cn-root .hdr-row-work{gap:6px;}
.cn-root header h1{font-size:var(--cn-fs-h);font-weight:600;letter-spacing:.8px;text-transform:uppercase;margin:0;}
.cn-root header h1 b{color:var(--cn-accent);}
.cn-root .hdr-brand{display:inline-flex;align-items:baseline;gap:6px;}
.cn-root .hdr-badge{font-family:var(--cn-mono);font-size:var(--cn-fs-sm);color:var(--cn-on-dark-dim);}
.cn-root .hdr-sep{width:1px;height:18px;background:rgba(255,255,255,.15);}
.cn-root .hdr-sp{flex:1;}
/* Row 1 widgets \u2014 notebook-title input + saved/build indicators + width cycle.
   Sit ON the dark header, so all text uses --cn-on-dark* (never --cn-text*). */
.cn-root .hdr-title-input{flex:0 1 280px;min-width:140px;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.18);color:var(--cn-on-dark);font-family:var(--cn-font);font-size:var(--cn-fs);font-weight:600;padding:3px 2px;transition:border-color var(--cn-dur-1);}
.cn-root .hdr-title-input::placeholder{color:var(--cn-on-dark-dim);font-weight:400;opacity:.7;}
.cn-root .hdr-title-input:focus{outline:none;border-bottom-color:var(--cn-accent);}
.cn-root .hdr-saved{font-size:var(--cn-fs-xs);color:var(--cn-on-dark-dim);min-width:64px;transition:color var(--cn-dur-2);}
.cn-root .hdr-saved.is-dirty{color:var(--cn-warn);}
.cn-root .hdr-build{font-family:var(--cn-mono);font-size:var(--cn-fs-xs);color:var(--cn-on-dark-dim);opacity:.7;}
/* Header buttons + verb chips \u2014 lifted from carm-sna v2.1.22: GHOST chrome.
   Buttons are transparent (NOT filled pills), dim until hover; verb chips are
   borderless dim tabs (color #8899aa @ .55 opacity) that brighten on hover.
   Only the primary (Save) button carries the accent fill. */
.cn-root .hdr-width-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border:none;border-radius:var(--cn-radius-sm);background:transparent;color:var(--cn-on-dark-dim);font-size:var(--cn-fs-xs);font-weight:600;cursor:pointer;transition:background var(--cn-dur-1),color var(--cn-dur-1);}
.cn-root .hdr-width-btn:hover{background:rgba(255,255,255,.08);color:var(--cn-on-dark);}
.cn-root .hdr-width-btn svg{width:13px;height:13px;}
.cn-root .hdr-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:none;border-radius:var(--cn-radius-sm);background:transparent;color:var(--cn-on-dark-dim);font-size:var(--cn-fs-sm);font-weight:600;cursor:pointer;transition:background var(--cn-dur-1),color var(--cn-dur-1);white-space:nowrap;}
.cn-root .hdr-btn:hover{background:rgba(255,255,255,.08);color:var(--cn-on-dark);}
.cn-root .hdr-btn.primary{background:var(--cn-accent);color:var(--cn-on-dark);font-weight:600;}
.cn-root .hdr-btn.primary:hover{background:var(--cn-accent-deep);}
.cn-root .hdr-btn svg{width:14px;height:14px;flex-shrink:0;}
.cn-root .hdr-verbs{display:flex;align-items:center;gap:2px;flex-wrap:wrap;}
.cn-root .hdr-verb{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:none;border-radius:6px;background:transparent;color:var(--cn-on-dark-muted);opacity:.55;font-size:var(--cn-fs-sm);font-weight:600;cursor:pointer;white-space:nowrap;transition:background var(--cn-dur-1),color var(--cn-dur-1),opacity var(--cn-dur-1);}
.cn-root .hdr-verb:hover{background:rgba(255,255,255,.12);opacity:1;color:var(--cn-on-dark);}
/* "Added" = full-strength accent TEXT, not a filled box (keeps the bar light). */
.cn-root .hdr-verb.added{opacity:1;color:var(--cn-accent);font-weight:600;}
.cn-root .hdr-verb.added:hover{background:rgba(255,255,255,.12);color:var(--cn-accent);}
.cn-root .hdr-export-wrap{position:relative;}
.cn-root .hdr-export-drop{display:none;position:absolute;top:100%;left:0;margin-top:4px;background:var(--cn-surface);color:var(--cn-text);border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-lg);min-width:180px;padding:4px 0;z-index:300;}
.cn-root .hdr-export-drop.show{display:block;}
.cn-root .hdr-export-drop button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:7px 16px;border:none;background:none;font-size:var(--cn-fs);color:var(--cn-text);cursor:pointer;}
.cn-root .hdr-export-drop button:hover{background:var(--cn-canvas);}
.cn-root .hdr-export-drop button svg{width:14px;height:14px;flex-shrink:0;color:var(--cn-text-muted);}
.cn-root .ex-sep{border-top:1px solid var(--cn-border-soft);margin:4px 0;}

/* Main + cell stack. Width modifiers (W2 sets the class on <main>) are layout
   dimensions \u2014 the one place raw px is allowed, per the contract. */
.cn-root main{display:block;max-width:980px;margin:0 auto;padding:14px 18px 40px;}
.cn-root main.w-standard{max-width:980px;}
.cn-root main.w-wide{max-width:1280px;}
.cn-root main.w-full{max-width:none;}
.cn-root .cell-stack{display:flex;flex-direction:column;gap:10px;}

/* Publish / read-only bar (W3 emits .cn-pub-bar + its .cn-pub-edit button).
   A slim resting card-strip on the canvas, NOT the dark header. */
.cn-root .cn-pub-bar{position:sticky;top:0;z-index:200;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 18px;background:var(--cn-surface);border-bottom:1px solid var(--cn-border-soft);box-shadow:var(--cn-shadow-sm);font-size:var(--cn-fs-sm);color:var(--cn-text-muted);}
.cn-root .cn-pub-bar .cn-pub-title{font-weight:600;color:var(--cn-text);}
/* Gated on .cn-published: the pub-bar exists in the DOM before publish (hidden), and an
   unconditional ::after put a stray "\xB7 read-only" text node into the a11y tree on fresh boot. */
.cn-published .cn-pub-bar .cn-pub-title::after{content:"\xB7 read-only";margin-left:8px;font-weight:400;color:var(--cn-text-dim);}
.cn-root .cn-pub-bar b{color:var(--cn-text);font-weight:600;}
.cn-root .cn-pub-bar .cn-pub-edit{margin-left:auto;}
.cn-root .cn-pub-bar .hdr-sp{flex:1;}
/* Read-only published view \u2014 setPublished(true) adds .published to the stack.
   Hide every editing affordance (cell forms, run buttons, add-strips, per-cell
   control buttons, the data-card mapping form) so only rendered results show.
   Cells stay locked (publish() also calls lockAll) so results never re-run. */
.cn-root .cell-stack.published .cell-form,
.cn-root .cell-stack.published .btn-run,
.cn-root .cell-stack.published .cn-add-strip,
.cn-root .cell-stack.published .add-strip,
.cn-root .cell-stack.published .cn-cell-add-strip,
.cn-root .cell-stack.published .cell-header .cell-btn,
.cn-root .cell-stack.published .cell-grip,
.cn-root .cell-stack.published .sna-controls-toggle,
.cn-root .cell-stack.published .dct-selector,
.cn-root .cell-stack.published .sb-sel-btn{display:none!important;}
/* Locked cell \u2014 the contract setCellLocked promises: the cached result stays,
   the editable form and its Run affordances hide, so a "preserved" result can't
   be silently replaced from the cell's own controls. The header lock/unlock
   button itself stays usable (it lives outside .cell-form). */
.cn-root .cell.locked .cell-form,
.cn-root .cell.locked .btn-run{display:none!important;}
/* "Edit" affordance \u2014 accent button echoing .hdr-btn.primary, but on a light bar. */
.cn-root .cn-pub-edit{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border:none;border-radius:var(--cn-radius-sm);background:var(--cn-accent);color:var(--cn-on-dark);font-size:var(--cn-fs-sm);font-weight:600;cursor:pointer;transition:background var(--cn-dur-1);}
.cn-root .cn-pub-edit:hover{background:var(--cn-accent-deep);}
.cn-root .cn-pub-edit svg{width:13px;height:13px;}

/* Footer */
/* Footer \u2014 the previous notebooks' dark, centered, stacked brand block (ported
   from carm-sna .cn-footer). Dark gradient (header tokens), accent on the brand
   tail, links + license stacked and centered, generous top margin. */
.cn-root .cn-footer{
  display:block;text-align:center;margin-top:48px;padding:24px;
  background:linear-gradient(135deg,var(--cn-header-from) 0%,var(--cn-header-to) 100%);
  color:var(--cn-on-dark-muted);font:400 var(--cn-fs-sm)/1.7 var(--cn-font);
  box-shadow:0 -1px 0 rgba(255,255,255,.04) inset;
}
.cn-root .cn-footer .ft-brand{font-size:var(--cn-fs-h);font-weight:600;color:var(--cn-on-dark);letter-spacing:-.3px;}
.cn-root .cn-footer .ft-brand b{color:var(--cn-accent);}
.cn-root .cn-footer .ft-author{color:var(--cn-on-dark-soft);font-size:var(--cn-fs);margin-top:6px;}
.cn-root .cn-footer .ft-affil{color:var(--cn-on-dark-muted);font-size:var(--cn-fs-sm);}
.cn-root .cn-footer .ft-links{margin-top:8px;}
.cn-root .cn-footer .ft-links a{color:var(--cn-accent);text-decoration:none;transition:color var(--cn-dur-1);}
.cn-root .cn-footer .ft-links a:hover{text-decoration:underline;}
.cn-root .cn-footer .ft-sep{display:inline-block;width:1px;height:10px;background:rgba(255,255,255,.15);margin:0 8px;vertical-align:middle;}
.cn-root .cn-footer .ft-license{color:var(--cn-on-dark-dim);font-size:var(--cn-fs-xs);margin-top:10px;}
@media print{.cn-root .cn-footer{display:none;}}

/* Empty state / drop zone */
.cn-root .empty-state{border:1px dashed var(--cn-border);border-radius:var(--cn-radius-lg);padding:40px 24px;text-align:center;color:var(--cn-text-muted);background:var(--cn-surface);box-shadow:var(--cn-shadow-sm);margin:8px 0;}
.cn-root .empty-state h2{font-size:var(--cn-fs-h);font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--cn-text);margin:0 0 6px;}
.cn-root .empty-state h2 b{color:var(--cn-accent);}
.cn-root .empty-state p{font-size:var(--cn-fs-sm);margin:0;}
.cn-root .drop-zone{border:2px dashed var(--cn-border);border-radius:var(--cn-radius-lg);padding:32px;margin:18px auto 0;max-width:440px;cursor:pointer;background:var(--cn-surface-soft);transition:border-color var(--cn-dur-1),background var(--cn-dur-1);}
.cn-root .drop-zone:hover,.cn-root .drop-zone.drag{border-color:var(--cn-accent);background:var(--cn-accent-soft);}
.cn-root .empty-demo{margin:14px 0 0;text-align:center;}
.cn-root .demo-link{background:none;border:0;padding:4px 6px;cursor:pointer;font:inherit;font-size:var(--cn-fs-sm);color:var(--cn-text-muted);text-decoration:underline;text-underline-offset:3px;border-radius:var(--cn-radius);}
.cn-root .demo-link:hover{color:var(--cn-accent);}
.cn-root .demo-link:focus-visible{outline:2px solid var(--cn-accent);outline-offset:2px;}
.cn-root .drop-zone h3{font-size:var(--cn-fs);font-weight:600;color:var(--cn-text);margin:0 0 4px;}
.cn-root .drop-zone p{font-size:var(--cn-fs-sm);color:var(--cn-text-muted);margin:0;}

/* Data card */
.cn-root .data-card-top{background:var(--cn-surface);border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-sm);overflow:hidden;}
.cn-root .dct-header{display:flex;align-items:baseline;gap:10px;padding:10px 14px;border-bottom:1px solid var(--cn-border-soft);}
.cn-root .dct-fn{font-weight:600;font-size:var(--cn-fs);}
.cn-root .dct-meta{font-size:var(--cn-fs-sm);color:var(--cn-text-muted);}
.cn-root .dct-badges{font-size:var(--cn-fs-sm);}
.cn-root .col-badge{display:inline-flex;align-items:center;justify-content:center;min-width:15px;height:15px;padding:0 4px;border-radius:3px;font-family:var(--cn-mono);font-size:var(--cn-fs-xs);font-weight:600;}
.cn-root .col-badge.num{background:#e8f0fe;color:#1a73e8;}
.cn-root .col-badge.cat{background:#fce8e6;color:#c5221f;}
.cn-root .dct-table-wrap{padding:10px 14px;}
.cn-root .cn-varsel-chip{font-size:var(--cn-fs-sm)!important;}
.cn-root .sb-sel-btn{border:1px solid var(--cn-border);background:var(--cn-surface);color:var(--cn-text-muted);font-size:var(--cn-fs-sm);font-weight:600;padding:3px 9px;border-radius:12px;cursor:pointer;}
.cn-root .sb-sel-btn:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);border-color:var(--cn-accent);}
.cn-root .panel-title{font-weight:600;font-size:var(--cn-fs-sm);color:var(--cn-text-muted);}

/* Cells \u2014 resting card lifts on hover (carm-sna .cell:hover -> shadow-md). */
.cn-root .cell{position:relative;background:var(--cn-surface);border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-sm);overflow:hidden;transition:box-shadow var(--cn-dur-2),border-color var(--cn-dur-2);}
.cn-root .cell:hover{box-shadow:var(--cn-shadow-md);border-color:var(--cn-border-strong);}
.cn-root .cell-header{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--cn-surface-soft);border-bottom:1px solid var(--cn-border-soft);border-radius:var(--cn-radius-md) var(--cn-radius-md) 0 0;}
/* \u2500\u2500 EMBED (piece) mode \u2014 a CLEAN, self-contained analysis block. Output-first,
   but clearly delineated: each analysis is one light card with a quiet title so
   a reader can tell what it is and where it starts/ends. No notebook badge /
   pills / management chrome; controls live in a floating action bar (\u25B6 run \xB7
   \u2699 settings \xB7 \u29C9 export) pinned top-right that fades in on hover (carm-embed's
   .carm-action-bar). The form is collapsed by default (.minimized); \u2699 reveals it. \u2500\u2500 */
/* In embed mode the HOST PAGE is the page: strip the notebook's grey canvas
   (--cn-canvas) and the main scroll-runway padding (18/20/64px) so each <carm-*>
   piece sits flush in host content instead of floating in a grey frame with dead
   space under it. Gated on .carm-embed-root (present ONLY in the native-embed
   build) \u2014 the standalone notebook + the shared sna suite keep their canvas. */
.carm-embed-root .cn-root{background:transparent;min-height:0;}
.carm-embed-root .cn-root main{padding:0;}
.cn-root .cell.piece{border:1px solid var(--cn-border-soft);border-radius:var(--cn-radius-md);box-shadow:none;background:var(--cn-surface);overflow:visible;padding:12px 16px 12px;transition:box-shadow var(--cn-dur-2),border-color var(--cn-dur-2);}
.cn-root .cell.piece:hover{box-shadow:var(--cn-shadow-sm);border-color:var(--cn-border);}
/* Discrete BRAND PILL \u2014 Carm mark + analysis name + quiet "Carm" wordmark.
   Names the block and credits the engine (carm-embed style). */
.cn-root .cell.piece .cell-piece-title{display:inline-flex;align-items:center;gap:5px;font-size:var(--cn-fs-sm);font-weight:600;line-height:1.2;color:var(--cn-text);background:var(--cn-surface-soft);border:1px solid var(--cn-border-soft);border-radius:999px;padding:4px 12px 4px 8px;margin:0 0 12px;}
/* Carm brand colour is a FIXED blue (carm-embed #2563eb), NOT the notebook's
   accent \u2014 so the mark + wordmark read the same blue in every notebook. */
.cn-root .cell.piece .cell-piece-title svg{width:20px;height:20px;color:#2563eb;flex-shrink:0;}
.cn-root .cell.piece .cpt-brand{font-size:var(--cn-fs);font-weight:600;color:#2563eb;letter-spacing:.01em;}
.cn-root .cell.piece .cpt-name{color:var(--cn-text-muted);font-weight:600;}
.cn-root .cell.piece .cpt-name::before{content:"\xB7";margin:0 5px 0 3px;color:var(--cn-text-dim);font-weight:400;}
.cn-root .cell.piece.minimized .cell-piece-title{margin-bottom:6px;}
.cn-root .cell.piece .cell-form{border:none;padding:6px 0 2px;}
.cn-root .cell.piece .cell-result{padding:0;}
/* Floating action bar \u2014 absolute top-right, hover-revealed (carm-embed model:
   0 \u2192 .35 on cell hover \u2192 1 on bar hover/focus). The cell is position:relative. */
/* A clean GROUPED toolbar pill (not loose icons), revealed on hover. Quiet muted
   icons that warm to accent on hover; the run glyph is a solid play. Flat \u2014 a
   1px soft border, no shadow / 3D. */
.cn-root .cell.piece .cell-actionbar{position:absolute;top:6px;right:6px;z-index:2;display:inline-flex;align-items:center;gap:1px;padding:2px;background:var(--cn-surface-soft);border:1px solid var(--cn-border-soft);border-radius:8px;opacity:.6;transition:opacity var(--cn-dur-1) ease;}
.cn-root .cell.piece:hover .cell-actionbar,.cn-root .cell.piece:focus-within .cell-actionbar,.cn-root .cell.piece .cell-actionbar:hover{opacity:1;}
.cn-root .cell.piece .cell-actionbar .cell-btn{padding:4px;color:var(--cn-text-muted);border-radius:6px;}
.cn-root .cell.piece .cell-actionbar .cell-btn svg{width:15px;height:15px;}
.cn-root .cell.piece .cell-actionbar .cell-btn:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);}
.cn-root .cell.piece .cell-actionbar .cell-btn.run-btn svg{fill:currentColor;stroke:none;}
.cn-root .cell.piece .cell-actionbar .cell-btn.set-btn.active{color:var(--cn-accent);background:var(--cn-accent-soft);}
/* \u2699 Settings as a LABELLED PILL (gear + word + chevron) \u2014 a bare icon read as
   "ugly / unrecognizable". Mirrors the notebook plot cell's "\u2699 Settings \u25B8"
   toggle; the chevron points right when closed, rotates down when open. */
.cn-root .cell.piece .cell-actionbar .set-pill{gap:5px;padding:4px 8px 4px 7px;font-size:var(--cn-fs-xs);font-weight:600;letter-spacing:.01em;color:var(--cn-text-muted);}
.cn-root .cell.piece .cell-actionbar .set-pill .set-pill-label{line-height:1;white-space:nowrap;}
.cn-root .cell.piece .cell-actionbar .set-pill .set-pill-chev{width:13px;height:13px;transform:rotate(-90deg);transition:transform var(--cn-dur-1) ease;}
.cn-root .cell.piece .cell-actionbar .set-pill.active .set-pill-chev{transform:rotate(0deg);}
.cn-root .cell.piece .cell-actionbar .set-pill:hover,.cn-root .cell.piece .cell-actionbar .set-pill.active{color:var(--cn-accent-deep);background:var(--cn-accent-soft);}
.cn-root .cell.piece .cell-export{display:inline-flex;align-items:center;gap:1px;margin:0;}
.cn-root .cell.piece .cell-exp-btn{padding:3px 6px;font-size:var(--cn-fs-xs);}
/* Deferred (heavy embed) verbs: a quiet, centered "\u25B6 Run {verb}" placeholder
   shown until the user runs it \u2014 keeps the page fast. */
.cn-root .cell.piece .cell-deferred-run,.cn-root .cell-deferred-run{display:inline-flex;align-items:center;gap:6px;margin:4px 0;padding:8px 16px;border:1px solid var(--cn-border);border-radius:999px;background:var(--cn-surface);color:var(--cn-text-muted);font-size:var(--cn-fs-sm);font-weight:600;cursor:pointer;transition:background var(--cn-dur-1),color var(--cn-dur-1),border-color var(--cn-dur-1);}
.cn-root .cell-deferred-run:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);border-color:var(--cn-accent);}
.cn-root .cell-deferred-run svg{width:13px;height:13px;}
.cn-root .verb-badge{font-size:var(--cn-fs-sm);font-weight:600;text-transform:uppercase;letter-spacing:.4px;padding:3px 9px;border-radius:12px;background:var(--cn-accent-soft);color:var(--cn-accent-deep);display:inline-flex;align-items:center;}
/* Per-verb signature badges (ported from carm-sna v2.1.22 lines 154-162). The
   verb key flows through as a className; each carries its own gradient token so
   the chip reads its analysis family at a glance. White text on the gradient. */
.cn-root .verb-badge.network{background:var(--cn-verb-network);color:var(--cn-on-dark);}
.cn-root .verb-badge.properties{background:var(--cn-verb-properties);color:var(--cn-on-dark);}
.cn-root .verb-badge.metrics{background:var(--cn-verb-metrics);color:var(--cn-on-dark);}
.cn-root .verb-badge.centrality{background:var(--cn-verb-centrality);color:var(--cn-on-dark);}
.cn-root .verb-badge.community{background:var(--cn-verb-community);color:var(--cn-on-dark);}
.cn-root .verb-badge.cliques{background:var(--cn-verb-cliques);color:var(--cn-on-dark);}
.cn-root .verb-badge.generate{background:var(--cn-verb-generate);color:var(--cn-on-dark);}
.cn-root .verb-badge.cooccurrence{background:var(--cn-verb-cooccurrence);color:var(--cn-on-dark);}
.cn-root .verb-badge.edgelist{background:var(--cn-verb-edgelist);color:var(--cn-on-dark);}
.cn-root .cell-spacer{flex:1;}
/* Drag-to-reorder grip \u2014 dim until the row is hovered; grab cursor. */
.cn-root .cell-grip{cursor:grab;color:var(--cn-text-dim);font-size:var(--cn-fs);line-height:1;letter-spacing:-2px;user-select:none;opacity:.45;transition:opacity var(--cn-dur-1),color var(--cn-dur-1);padding:0 2px;}
.cn-root .cell-header:hover .cell-grip{opacity:1;}
.cn-root .cell-grip:active{cursor:grabbing;}
.cn-root .cell.cn-dragging{opacity:.5;}
.cn-root .cell.cn-drop-above{box-shadow:0 -3px 0 0 var(--cn-accent);}
.cn-root .cell.cn-drop-below{box-shadow:0 3px 0 0 var(--cn-accent);}
/* Per-cell runtime badge \u2014 quiet mono time of the last run. */
.cn-root .cell-runtime{font-family:var(--cn-mono);font-size:var(--cn-fs-xs);color:var(--cn-text-dim);}
.cn-root .cell-runtime:empty{display:none;}
/* Which dataset a cell analyses. ALWAYS present: a chip when there is nothing to
   choose, a picker when there is. Quiet by default \u2014 it is orientation, not an
   action \u2014 and loud only when the reference is broken. */
.cn-root .cell-dataset{font-size:var(--cn-fs-xs);color:var(--cn-text-dim);white-space:nowrap;}
.cn-root .cell-dataset[hidden]{display:none;}
.cn-root .cell-dataset-select{font-size:var(--cn-fs-xs);padding:1px 4px;max-width:18ch;}
.cn-root .cell-dataset-dangling{color:var(--cn-danger,#c0392b);font-weight:600;}
/* The data loader cell: its FIRST control is the one that fetches a file. */
.cn-root .cn-loader-bar{display:flex;align-items:center;gap:8px;margin:0 0 10px 0;}
.cn-root .cn-loader-browse{font-size:var(--cn-fs-sm);padding:4px 10px;border-radius:5px;cursor:pointer;border:1px solid var(--cn-border,#d8d8d8);background:var(--cn-surface,#fff);}
.cn-root .cn-loader-browse:hover{border-color:var(--cn-accent);}
.cn-root .cn-loader-file{font-size:var(--cn-fs-xs);color:var(--cn-text-dim);}
.cn-root .cn-loader-summary{font-size:var(--cn-fs-sm);color:var(--cn-text-muted);}
.cn-root .cell-btn{border:none;background:transparent;cursor:pointer;color:var(--cn-text-muted);padding:3px 6px;border-radius:4px;display:inline-flex;}
.cn-root .cell-btn:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);}
.cn-root .cell-btn svg{width:14px;height:14px;}
.cn-root .cell-btn.lock-btn.locked{color:var(--cn-accent-deep);}
/* Header quick-run: tinted as the cell's primary action, still compact. */
.cn-root .cell-btn.run-btn{color:var(--cn-accent);}
.cn-root .cell-btn.run-btn:hover{background:var(--cn-accent);color:var(--cn-on-dark);}
/* Header figure-export group (one per cell). Compact text buttons that sit with
   the other header controls \u2014 never inside the figure (screenshot-safe). */
.cn-root .cell-export{display:inline-flex;align-items:center;gap:2px;margin-right:4px;}
.cn-root .cell-exp-btn{font-size:var(--cn-fs-xs,11px);font-weight:600;letter-spacing:.2px;padding:2px 7px;color:var(--cn-text-muted);}
.cn-root .cell-exp-btn:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);}
@media print{.cn-root .cell-export{display:none!important;}}
.cn-root .cell-form{padding:10px 12px;border-bottom:1px solid var(--cn-border-soft);}
.cn-root .form-grid{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;}
.cn-root .form-grid>div{display:flex;flex-direction:column;gap:4px;min-width:150px;}
.cn-root .cell-form label{font-size:var(--cn-fs-sm);font-weight:600;color:var(--cn-text-muted);}
.cn-root .cell-form select,.cn-root .cell-form input[type=number],.cn-root .cell-form input[type=text],.cn-root .cell-form .col-select{padding:6px 8px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);transition:background var(--cn-dur-1),border-color var(--cn-dur-1),box-shadow var(--cn-dur-1);}
.cn-root .cell-form select:hover,.cn-root .cell-form input[type=number]:hover,.cn-root .cell-form input[type=text]:hover,.cn-root .cell-form .col-select:hover{background:var(--cn-surface);border-color:var(--cn-border);}
.cn-root .cell-form select:focus,.cn-root .cell-form input[type=number]:focus,.cn-root .cell-form input[type=text]:focus,.cn-root .cell-form .col-select:focus{outline:none;background:var(--cn-surface);border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}
.cn-root .cell-form .col-select{min-width:180px;}
.cn-root .cell-form .carm-textarea{grid-column:1/-1;width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:var(--cn-fs-xs);line-height:1.5;resize:vertical;tab-size:2;transition:background var(--cn-dur-1),border-color var(--cn-dur-1),box-shadow var(--cn-dur-1);}
.cn-root .cell-form .carm-textarea:hover{background:var(--cn-surface);}
.cn-root .cell-form .carm-textarea:focus{outline:none;background:var(--cn-surface);border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}
.cn-root .cell-form .checks label{font-weight:400;color:var(--cn-text);display:inline-flex;align-items:center;gap:6px;}
.cn-root .cell-form .helper{font-size:var(--cn-fs-xs);color:var(--cn-text-dim);}
.cn-root .btn-run{margin-top:6px;padding:7px 16px;border:none;border-radius:var(--cn-radius-sm);background:var(--cn-accent);color:var(--cn-on-dark);font-size:var(--cn-fs);font-weight:600;cursor:pointer;}
.cn-root .btn-run:hover{background:var(--cn-accent-deep);}
.cn-root .cell-result{padding:10px 12px;}
/* A cell that hasn't produced output yet shows NO result band at all \u2014 the
   empty element used to keep its padding and leave a dead strip under the
   form until the first run. */
.cn-root .cell-result:empty{display:none;}
/* Per-cell add-strip \u2014 "+ verb" pills (opt-in via cellAddStrip). Lifted from
   carm-sna v2.1.22 .add-strip: a CENTERED row of small rounded pills, dimmed to
   .45 and brightening on hover, with NO bounding strip/border \u2014 it floats
   quietly between cells. Pills insert a cell after this one. */
.cn-root .cn-add-strip{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;padding:3px 0;margin:2px 0;opacity:.45;transition:opacity var(--cn-dur-2);}
.cn-root .cn-add-strip:hover{opacity:1;}
.cn-root .cn-add-pill{border:1px solid var(--cn-border);background:var(--cn-surface);color:var(--cn-text-muted);font-size:var(--cn-fs-xs);font-weight:600;letter-spacing:.2px;padding:4px 11px;border-radius:999px;cursor:pointer;transition:background var(--cn-dur-1),color var(--cn-dur-1),border-color var(--cn-dur-1);}
.cn-root .cn-add-pill:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);border-color:var(--cn-accent);}
.cn-root .cell.minimized .cn-add-strip{display:none;}
.cn-root .cell-result.cn-busy{opacity:.5;}
/* Minimize collapses the CONTROLS only \u2014 output stays visible, so a finished
   cell shrinks to header + result and expands back to reveal the form. */
.cn-root .cell.minimized .cell-form{display:none;}
.cn-root .error-banner{color:var(--cn-danger);font-family:var(--cn-mono);font-size:var(--cn-fs-sm);white-space:pre-wrap;padding:8px 10px;background:var(--cn-danger-bg);border:1px solid var(--cn-danger-line);border-radius:var(--cn-radius-sm);}

/* Off-thread analysis worker: busy spinner + Cancel + live elapsed timer
   (analysis-worker.js engineBusy). Shown in a result area while a heavy engine
   verb runs off the main thread. */
.cn-root .eng-busy{display:flex;align-items:center;gap:10px;font-size:var(--cn-fs-sm);color:var(--cn-text-muted);padding:10px 4px;}
.cn-root .eng-busy svg{color:var(--cn-accent);flex:0 0 auto;}
.cn-root .eng-busy .eng-elapsed{font-variant-numeric:tabular-nums;color:var(--cn-text-dim);min-width:32px;}
.cn-root .eng-cancel{padding:4px 12px;font:600 11px inherit;color:var(--cn-danger);background:var(--cn-danger-bg);border:none;border-radius:var(--cn-radius-sm);cursor:pointer;}
.cn-root .eng-cancel:hover{filter:brightness(0.96);}
.cn-root .eng-cancelled{font-size:var(--cn-fs-sm);color:var(--cn-text-dim);font-style:italic;padding:8px 4px;}

/* Disabled header buttons (e.g. Undo before any history). */
.cn-root .hdr-btn:disabled{opacity:.4;cursor:default;pointer-events:none;}

/* \u2500\u2500 Toasts \u2014 transient notifications, stacked bottom-right. \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root .cn-toasts{position:fixed;right:18px;bottom:18px;z-index:1000;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;}
.cn-root .cn-toast{
  pointer-events:auto;cursor:pointer;max-width:340px;padding:9px 14px;border-radius:var(--cn-radius-md);
  background:var(--cn-text);color:var(--cn-on-dark);font-size:var(--cn-fs-sm);font-weight:600;
  box-shadow:var(--cn-shadow-lg);opacity:0;transform:translateY(8px);transition:opacity var(--cn-dur-2),transform var(--cn-dur-2);
  border-left:3px solid var(--cn-accent);
}
.cn-root .cn-toast.cn-toast-in{opacity:1;transform:translateY(0);}
.cn-root .cn-toast.cn-toast-out{opacity:0;transform:translateY(8px);}
.cn-root .cn-toast-success{border-left-color:var(--cn-accent);}
.cn-root .cn-toast-warn{border-left-color:var(--cn-warn);}
.cn-root .cn-toast-error{border-left-color:var(--cn-danger);}

/* \u2500\u2500 Lock tiers \u2014 seal stamp (inline in the published bar) + hard-lock escape. */
.cn-root .cn-seal-stamp{
  display:inline-flex;align-items:center;font-family:var(--cn-mono);font-size:var(--cn-fs-xs);
  font-weight:600;letter-spacing:.3px;padding:3px 10px;border-radius:999px;
  background:var(--cn-canvas);color:var(--cn-text-muted);border:1px solid var(--cn-border-strong);
}
.cn-root .cn-seal-stamp.cn-seal-tamper{color:var(--cn-danger-text);border-color:var(--cn-danger-border);background:var(--cn-danger-soft);}
/* Hard tiers (locked / sealed) hide the Edit escape and reveal a Duplicate-to-
   edit button instead \u2014 the published bar always offers ONE way back, so a
   sealed notebook is never a dead end (you can always reach Load Data / New
   again after duplicating to an editable copy). */
.cn-root.cn-hard-lock .cn-pub-edit{display:none!important;}
.cn-root .cn-pub-dup{display:none;margin-left:auto;align-items:center;gap:5px;padding:5px 11px;border:none;border-radius:var(--cn-radius-sm);background:var(--cn-accent);color:var(--cn-on-dark);font-size:var(--cn-fs-sm);font-weight:600;cursor:pointer;transition:background var(--cn-dur-1);}
.cn-root .cn-pub-dup:hover{background:var(--cn-accent-deep);}
.cn-root .cn-pub-dup svg{width:13px;height:13px;}
.cn-root.cn-hard-lock .cn-pub-dup{display:inline-flex;}

/* \u2500\u2500 Library picker modal. \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root .cn-modal-overlay{position:fixed;inset:0;z-index:1100;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:24px;}
.cn-root .cn-modal{width:min(560px,100%);max-height:80vh;display:flex;flex-direction:column;background:var(--cn-surface);border:1px solid var(--cn-border-strong);border-radius:var(--cn-radius-lg);box-shadow:var(--cn-shadow-lg);overflow:hidden;}
.cn-root .cn-modal-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--cn-border);}
.cn-root .cn-modal-title{flex:1;font-size:var(--cn-fs);font-weight:600;color:var(--cn-text);}
.cn-root .cn-modal-x{border:none;background:transparent;cursor:pointer;color:var(--cn-text-muted);padding:4px;border-radius:var(--cn-radius-sm);display:inline-flex;}
.cn-root .cn-modal-x:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);}
.cn-root .cn-modal-x svg{width:16px;height:16px;}
.cn-root .cn-modal-body{flex:1;overflow:auto;padding:8px 10px;}
.cn-root .cn-modal-foot{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--cn-border);background:var(--cn-surface-soft);}
.cn-root .cn-lib-empty{padding:24px 12px;text-align:center;color:var(--cn-text-muted);font-size:var(--cn-fs-sm);line-height:1.55;max-width:44ch;margin:0 auto;}
/* Replaces the old "Save current to library" button: the fact, not a duplicate control. */
.cn-root .cn-lib-foot-note{color:var(--cn-text-muted);font-size:var(--cn-fs-xs);}
.cn-root .cn-lib-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:var(--cn-radius-sm);transition:background var(--cn-dur-1);}
.cn-root .cn-lib-row:hover{background:var(--cn-canvas);}
.cn-root .cn-lib-row.cn-lib-current{background:var(--cn-accent-soft);}
.cn-root .cn-lib-main{flex:1;min-width:0;cursor:pointer;}
.cn-root .cn-lib-title{font-size:var(--cn-fs-sm);font-weight:600;color:var(--cn-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .cn-lib-meta{font-size:var(--cn-fs-xs);color:var(--cn-text-dim);}
.cn-root .cn-lib-acts{display:flex;gap:2px;flex-shrink:0;}
.cn-root .cn-lib-check{flex-shrink:0;width:14px;height:14px;margin:0;accent-color:var(--cn-accent);cursor:pointer;}
.cn-root .cn-lib-row.cn-lib-selected{background:var(--cn-accent-soft);}
.cn-root .cn-lib-selectbar{display:flex;align-items:center;gap:10px;padding:4px 10px 6px;font-size:var(--cn-fs-xs);color:var(--cn-text-muted);}
.cn-root .cn-lib-selectall{display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;}
.cn-root .cn-lib-selcount{margin-left:auto;font-weight:600;color:var(--cn-text-dim);}
.cn-root .cn-lib-usage .cn-lib-delete-selected{margin-left:auto;border-color:var(--cn-danger,#a7372e);color:var(--cn-danger,#a7372e);}
.cn-root .cn-lib-usage .cn-lib-delete-selected + .cn-lib-clean{margin-left:0;}
/* Storage usage strip \u2014 quiet meta line + a pill Clean-up action (mirrors the
   add-pill chrome) between the list and the modal footer. */
.cn-root .cn-lib-usage{display:flex;align-items:center;gap:8px;padding:7px 16px;border-top:1px solid var(--cn-border-soft);font-size:var(--cn-fs-xs);color:var(--cn-text-dim);}
.cn-root .cn-lib-usage .cn-lib-clean{margin-left:auto;border:1px solid var(--cn-border);background:var(--cn-surface);color:var(--cn-text-muted);font-size:var(--cn-fs-xs);font-weight:600;padding:3px 10px;border-radius:999px;cursor:pointer;transition:background var(--cn-dur-1),color var(--cn-dur-1),border-color var(--cn-dur-1);}
.cn-root .cn-lib-usage .cn-lib-clean:hover{background:var(--cn-accent-soft);color:var(--cn-accent-deep);border-color:var(--cn-accent);}

/* \u2500\u2500 Keyboard focus \u2014 every interactive control gets the accent halo on
   :focus-visible (mouse clicks stay ring-free). Form fields already carry the
   ring via their :focus rules; this extends it to buttons, chips and links so
   the notebook is fully keyboard-navigable. \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root button:focus-visible,.cn-root a:focus-visible,.cn-root [tabindex]:focus-visible{outline:none;box-shadow:var(--cn-focus-ring);}

/* \u2500\u2500 Entrance motion \u2014 dropdowns and the library modal ease in instead of
   popping. display:none\u2192block can't transition, so a keyframe runs on .show /
   mount. Scoped names (cn- prefix) so host pages never collide. \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@keyframes cn-menu-in{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
@keyframes cn-modal-in{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}
.cn-root .hdr-export-drop.show{animation:cn-menu-in var(--cn-dur-1) var(--cn-ease);}
.cn-root .cn-modal{animation:cn-modal-in var(--cn-dur-2) var(--cn-ease);}

/* \u2500\u2500 Scrollbars \u2014 thin, quiet, surface-matched (thumb = --cn-border-strong per
   the contract's neutral table). WebKit rules cover every shell scroller;
   the two known overflow containers also get the Firefox properties. \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root ::-webkit-scrollbar{width:10px;height:10px;}
.cn-root ::-webkit-scrollbar-track{background:transparent;}
.cn-root ::-webkit-scrollbar-thumb{background:var(--cn-border-strong);border-radius:999px;border:2px solid var(--cn-surface);}
.cn-root ::-webkit-scrollbar-thumb:hover{background:var(--cn-text-dim);}
.cn-root .cn-modal-body,.cn-root .dct-table-wrap{scrollbar-width:thin;scrollbar-color:var(--cn-border-strong) transparent;}

/* \u2500\u2500 Reduced motion \u2014 collapse every transition/animation in one place (the
   motion tokens above are the only durations in this sheet). \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
@media (prefers-reduced-motion:reduce){
  .cn-root *,.cn-root{transition-duration:.01ms!important;animation-duration:.01ms!important;}
}

/* Session-import report. Sits above the first cell; the user must not have to scroll to
   learn that half their notebook is resting on a clustering that came out different. */
.carm-restore-report{position:relative;border-radius:8px;padding:12px 40px 12px 14px;margin:0 0 14px;
  border:1px solid;font-size:13px;line-height:1.5;}
.carm-restore-report.ok{background:#e8f5e9;border-color:#66bb6a;color:#1b5e20;}
.carm-restore-report.warn{background:#fff9e6;border-color:#e0a800;color:#5c4700;}
.carm-restore-report.bad{background:#fdecea;border-color:#d93025;color:#8c1d16;}
.carm-restore-report .rr-title{font-weight:700;margin-bottom:4px;}
.carm-restore-report .rr-line{margin-top:4px;}
.carm-restore-report .rr-close{position:absolute;top:8px;right:10px;border:0;background:transparent;
  font-size:18px;line-height:1;cursor:pointer;color:inherit;opacity:.6;}
.carm-restore-report .rr-close:hover{opacity:1;}
/* Actions on the "did not resume" banner. The work is one click away and must LOOK it \u2014
   a banner that only explains leaves the user to go hunting through the File menu. */
.carm-restore-report .rr-actions{margin-top:9px;display:flex;gap:8px;flex-wrap:wrap;}
.carm-restore-report .rr-act{border:1px solid currentColor;border-radius:var(--cn-radius-sm,6px);
  background:transparent;color:inherit;font:inherit;font-weight:600;padding:5px 12px;cursor:pointer;
  opacity:.85;transition:opacity var(--cn-dur-1,.12s),background var(--cn-dur-1,.12s);}
.carm-restore-report .rr-act:hover{opacity:1;background:rgba(0,0,0,.06);}
.carm-restore-report .rr-act.primary{background:currentColor;border-color:currentColor;}
.carm-restore-report .rr-act.primary span,
.carm-restore-report.warn .rr-act.primary{color:#fff9e6;}
.carm-restore-report .rr-act.primary:hover{opacity:.9;background:currentColor;}

/* \u2500\u2500 Shared named-palette editor -------------------------------------------
   Used inside visualization-cell Settings. Core owns the folded/searchable
   interaction; each note supplies semantic items (states, actors, clusters,
   series). Kept in the shell sheet so every CarmNote type receives it. \u2500\u2500\u2500\u2500\u2500 */
.cn-root .cn-color-editor{width:100%;box-sizing:border-box;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-md);background:var(--cn-surface);overflow:hidden;}
.cn-root .cn-color-editor>summary{display:flex;align-items:center;gap:8px;min-height:34px;padding:6px 9px;
  cursor:pointer;list-style-position:inside;color:var(--cn-text);user-select:none;}
.cn-root .cn-color-editor>summary:hover{background:var(--cn-surface-soft);}
.cn-root .cn-color-editor[open]>summary{border-bottom:1px solid var(--cn-border-soft);background:var(--cn-surface-soft);}
.cn-root .cn-color-title{font-size:var(--cn-fs-sm);font-weight:600;}
.cn-root .cn-color-status{margin-left:auto;color:var(--cn-text-muted);font-size:var(--cn-fs-xs);white-space:nowrap;}
.cn-root .cn-color-preview{display:inline-flex;align-items:center;}
.cn-root .cn-color-preview i{display:block;width:11px;height:11px;margin-left:-2px;border:1px solid var(--cn-surface);
  border-radius:50%;background:var(--cn-color,#999);}
.cn-root .cn-color-body{padding:9px;}
.cn-root .cn-color-head{display:flex;align-items:end;gap:8px;}
.cn-root .cn-color-head>label{display:grid;gap:3px;flex:1;color:var(--cn-text-muted);font-size:var(--cn-fs-xs);}
.cn-root .cn-color-head select,.cn-root .cn-color-search{width:100%;box-sizing:border-box;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);font:inherit;padding:5px 7px;}
.cn-root .cn-color-reset{border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);background:var(--cn-surface);
  color:var(--cn-text-muted);font:600 var(--cn-fs-xs) var(--cn-font);padding:6px 8px;cursor:pointer;}
.cn-root .cn-color-reset:hover{border-color:var(--cn-accent);color:var(--cn-accent-deep);background:var(--cn-accent-soft);}
.cn-root .cn-color-help{margin:6px 0;color:var(--cn-text-dim);font-size:var(--cn-fs-xs);line-height:1.4;}
.cn-root .cn-color-search{margin:2px 0 6px;}
.cn-root .cn-color-single{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 2px;
  color:var(--cn-text);font-size:var(--cn-fs-sm);}
.cn-root .cn-color-single input,.cn-root .cn-color-row input{width:36px;height:24px;padding:1px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-surface);cursor:pointer;}
.cn-root .cn-color-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;max-height:260px;overflow:auto;}
.cn-root .cn-color-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;padding:4px 6px;
  border-radius:var(--cn-radius-sm);color:var(--cn-text);font-size:var(--cn-fs-sm);}
.cn-root .cn-color-row:hover{background:var(--cn-surface-soft);}
.cn-root .cn-color-row>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@media(max-width:620px){.cn-root .cn-color-list{grid-template-columns:1fr;}}
`;

  // ../Note/carmnote-core/src/primitives/color-palette.js
  var DEFAULT_COLOR_PALETTE = Object.freeze([
    "#E8C547",
    "#9B8FC9",
    "#76B7B2",
    "#E1815A",
    "#8AA6C1",
    "#B07AA1",
    "#59A14F",
    "#F28E2B",
    "#4E79A7",
    "#EDC948",
    "#FF9DA7",
    "#BAB0AC"
  ]);

  // src/r-kernel.js
  var DEFAULT_ROW_CAP = 500;
  function createRKernel(opts) {
    const { url, onEvent, onStatus } = opts;
    const WS = opts.WebSocketImpl || (typeof WebSocket !== "undefined" ? WebSocket : null);
    if (!WS) throw new Error("carmar: no WebSocket implementation available");
    if (!url) throw new Error("carmar: kernel url is required");
    let sock = null;
    let beat = null;
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
    const HEARTBEAT_MS = 25e3;
    const stopBeat = () => {
      if (beat) {
        clearInterval(beat);
        beat = null;
      }
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
        sock.addEventListener("open", () => {
          stopBeat();
          beat = setInterval(() => {
            if (!sock || sock.readyState !== 1) return;
            try {
              sock.send(JSON.stringify({ type: "hb" }));
            } catch (e) {
            }
          }, HEARTBEAT_MS);
          if (beat && typeof beat.unref === "function") beat.unref();
        });
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
          stopBeat();
          setStatus("closed");
          failAll(new Error("Connection to the R kernel closed."));
        });
        sock.addEventListener("error", () => {
          stopBeat();
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

  // lib/var-rows.js
  var BADGE = {
    numeric: "N",
    integer: "N",
    logical: "L",
    categorical: "C",
    character: "C",
    factor: "F",
    data: "D",
    list: "\u2261",
    "function": "\u0192",
    environment: "E",
    s4: "S",
    // completion kinds (the kernel `complete` command's vocabulary)
    variable: "x",
    argument: "a",
    package: "P",
    file: "f",
    keyword: "k"
  };
  function typeBadge(doc, kind, cls) {
    const b = doc.createElement("span");
    b.className = "carmar-var-badge" + (cls ? ` ${cls}` : "");
    b.dataset.kind = String(kind || "");
    b.textContent = BADGE[kind] || "?";
    return b;
  }

  // lib/r-highlight.js
  var KEYWORDS = /* @__PURE__ */ new Set([
    "function",
    "if",
    "else",
    "for",
    "while",
    "repeat",
    "return",
    "break",
    "next",
    "in",
    "library",
    "require"
  ]);
  var CONSTANTS = /* @__PURE__ */ new Set([
    "TRUE",
    "FALSE",
    "NULL",
    "NA",
    "NA_integer_",
    "NA_real_",
    "NA_character_",
    "NA_complex_",
    "Inf",
    "NaN",
    "T",
    "F"
  ]);
  var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  var attr = (s) => esc(s).replace(/"/g, "&quot;");
  var TOKEN = new RegExp(
    [
      "(#'[^\\n]*)",
      // 1 roxygen comment
      "(#[^\\n]*)",
      // 2 comment
      '("(?:\\\\.|[^"\\\\\\n])*"?)',
      // 3 double-quoted string
      "('(?:\\\\.|[^'\\\\\\n])*'?)",
      // 4 single-quoted string
      "(`[^`\\n]*`?)",
      // 5 backtick name
      "(\\b0[xX][0-9a-fA-F]+L?|\\b(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?[Li]?)",
      // 6 number
      "([A-Za-z._][A-Za-z0-9._]*)",
      // 7 identifier
      "(<<-|<-|->>|->|\\|>|%[^%\\n]*%|:::?|\\$|@|~)"
      // 8 operator worth colouring
    ].join("|"),
    "g"
  );
  function renderLine(src, state, glance, marksRel) {
    const marks = Array.isArray(marksRel) && marksRel.length ? marksRel : null;
    const plain = (text, offset) => {
      if (!marks || !text) return esc(text);
      const hits = marks.filter((k) => k >= offset && k < offset + text.length).sort((a, b) => a - b);
      if (!hits.length) return esc(text);
      let out2 = "";
      let cur = 0;
      hits.forEach((k) => {
        const rel = k - offset;
        out2 += esc(text.slice(cur, rel)) + `<span class="rtok-brmatch">${esc(text[rel])}</span>`;
        cur = rel + 1;
      });
      return out2 + esc(text.slice(cur));
    };
    let out = "";
    let last = 0;
    TOKEN.lastIndex = 0;
    let m;
    let prevOp = state ? state.op : null;
    let prevIdent = state ? state.id : null;
    while ((m = TOKEN.exec(src)) !== null) {
      const gap = src.slice(last, m.index);
      out += plain(gap, last);
      if (gap.trim()) {
        prevOp = null;
        prevIdent = null;
      }
      last = m.index + m[0].length;
      const [tok, roxy, com, dstr, sstr, btick, num, ident, op] = m;
      if (roxy != null) out += `<span class="rtok-doc">${esc(tok)}</span>`;
      else if (com != null) out += `<span class="rtok-com">${esc(tok)}</span>`;
      else if (dstr != null || sstr != null || btick != null) {
        out += `<span class="rtok-str">${esc(tok)}</span>`;
        prevOp = null;
        prevIdent = null;
      } else if (num != null) {
        out += `<span class="rtok-num">${esc(tok)}</span>`;
        prevOp = null;
        prevIdent = null;
      } else if (op != null) {
        out += `<span class="rtok-op">${esc(tok)}</span>`;
        prevOp = tok;
        if (!/^:::?$/.test(tok)) prevIdent = null;
      } else if (ident != null) {
        const rest = src.slice(last);
        let isCall, isArg;
        if (/\S/.test(rest)) {
          isCall = /^\s*\(/.test(rest);
          isArg = /^\s*=(?!=)/.test(rest);
        } else {
          isCall = glance.charAt(0) === "(";
          isArg = glance.charAt(0) === "=" && glance.charAt(1) !== "=";
        }
        const nsCall = /^:::?$/.test(prevOp || "") && prevIdent;
        const afterDollar = prevOp === "$" || prevOp === "@";
        if (KEYWORDS.has(ident)) out += `<span class="rtok-kw">${esc(tok)}</span>`;
        else if (CONSTANTS.has(ident)) out += `<span class="rtok-const">${esc(tok)}</span>`;
        else if (isArg) out += `<span class="rtok-arg">${esc(tok)}</span>`;
        else if (nsCall) {
          out += `<span class="rtok-fn" data-hover="${attr(prevIdent + prevOp + ident)}">${esc(tok)}</span>`;
        } else if (isCall) out += `<span class="rtok-fn">${esc(tok)}</span>`;
        else if (afterDollar) out += `<span class="rtok-id" data-nohover="1">${esc(tok)}</span>`;
        else out += `<span class="rtok-id">${esc(tok)}</span>`;
        prevIdent = ident;
        prevOp = null;
      } else out += esc(tok);
    }
    const tail = src.slice(last);
    out += plain(tail, last);
    if (tail.trim()) {
      prevOp = null;
      prevIdent = null;
    }
    return {
      html: out,
      state: prevOp != null || prevIdent != null ? { op: prevOp, id: prevIdent } : null
    };
  }
  var sameLineState = (a, b) => a === b || !!a && !!b && a.op === b.op && a.id === b.id;
  var NONWS = /\S/g;
  function createLineHighlighter() {
    let lines = null;
    let states = [];
    let glances = [];
    let htmls = [];
    let starts = [];
    const rebuildStarts = () => {
      starts = new Array(lines.length);
      let off = 0;
      for (let i = 0; i < lines.length; i += 1) {
        starts[i] = off;
        off += lines[i].length + 1;
      }
    };
    const glanceAt = (src, endOffset) => {
      NONWS.lastIndex = endOffset;
      const m = NONWS.exec(src);
      return m ? src.substr(m.index, 2) : "";
    };
    function update(text) {
      const src = String(text == null ? "" : text);
      const next = src.split("\n");
      const old = lines || [];
      const oldStates = states;
      const oldGlances = glances;
      const oldHtmls = htmls;
      const oldN = old.length;
      const newN = next.length;
      let p = 0;
      const maxP = Math.min(oldN, newN);
      while (p < maxP && old[p] === next[p]) p += 1;
      if (p === oldN && p === newN) return null;
      let s = 0;
      const maxS = Math.min(oldN, newN) - p;
      while (s < maxS && old[oldN - 1 - s] === next[newN - 1 - s]) s += 1;
      let start2 = p;
      while (start2 > 0 && !/\S/.test(next[start2 - 1])) start2 -= 1;
      if (start2 > 0) start2 -= 1;
      const newEnd = newN - s;
      const delta = newN - oldN;
      lines = next;
      rebuildStarts();
      const nStates = oldStates.slice(0, start2);
      const nGlances = oldGlances.slice(0, start2);
      const nHtmls = oldHtmls.slice(0, start2);
      let state = start2 > 0 ? oldStates[start2] : null;
      let i = start2;
      let converged = -1;
      for (; i < newN; i += 1) {
        if (i >= newEnd && sameLineState(state, oldStates[i - delta])) {
          converged = i;
          break;
        }
        const glance = glanceAt(src, starts[i] + next[i].length);
        nStates.push(state);
        nGlances.push(glance);
        const r = renderLine(next[i], state, glance, null);
        nHtmls.push(r.html);
        state = r.state;
      }
      const scannedEnd = converged >= 0 ? converged : newN;
      if (converged >= 0) {
        for (let k = converged - delta; k < oldN; k += 1) {
          nStates.push(oldStates[k]);
          nGlances.push(oldGlances[k]);
          nHtmls.push(oldHtmls[k]);
        }
      }
      states = nStates;
      glances = nGlances;
      htmls = nHtmls;
      return { start: start2, oldEnd: scannedEnd - delta, newEnd: scannedEnd };
    }
    return {
      update,
      lineCount: () => lines ? lines.length : 0,
      lineHTML: (i) => htmls[i],
      /** Re-render one line with caret-driven bracket marks (line-relative). */
      lineHTMLWithMarks: (i, marksRel) => renderLine(lines[i], states[i], glances[i], marksRel).html,
      lineStart: (i) => starts[i],
      /** The line containing absolute offset `off` (its newline included). */
      lineOfOffset: (off) => {
        if (!lines || !lines.length) return -1;
        let lo = 0;
        let hi = lines.length - 1;
        let ans = -1;
        while (lo <= hi) {
          const mid = lo + hi >> 1;
          if (starts[mid] <= off) {
            ans = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        return ans;
      },
      /** The whole buffer's HTML — what `highlightR(text)` would return. */
      html: () => htmls.join("\n") + "\n"
    };
  }

  // lib/editor-history.js
  var DEFAULT_CAP = 500;
  var COALESCE_MS = 2e3;
  var sameSel = (a, b) => !!a && !!b && a.anchor === b.anchor && a.head === b.head;
  var copySel = (s) => s ? { anchor: s.anchor, head: s.head } : null;
  function spliceKind(sp) {
    if (sp.removed === "" && sp.inserted !== "" && !sp.inserted.includes("\n")) return "insert";
    if (sp.inserted === "" && sp.removed !== "" && !sp.removed.includes("\n")) return "delete";
    return "replace";
  }
  function createEditorHistory(opts = {}) {
    const cap = Number.isInteger(opts.cap) && opts.cap > 0 ? opts.cap : DEFAULT_CAP;
    const now = typeof opts.now === "function" ? opts.now : Date.now;
    const onTrim = typeof opts.onTrim === "function" ? opts.onTrim : null;
    const undoStack = [];
    const redoStack = [];
    let txn = null;
    let broken = false;
    const trim = () => {
      while (undoStack.length > cap) {
        const dropped = undoStack.shift();
        if (onTrim) onTrim(dropped);
      }
    };
    function coalesce(next) {
      if (broken || !undoStack.length || next.splices.length !== 1) return false;
      const prev = undoStack[undoStack.length - 1];
      if (!prev.coalescible || prev.source !== "user") return false;
      if (now() - prev.time > COALESCE_MS) return false;
      if (!sameSel(prev.selAfter, next.selBefore)) return false;
      const P = prev.splices[0];
      const S = next.splices[0];
      const kind = spliceKind(S);
      if (kind !== prev.kind) return false;
      if (kind === "insert") {
        if (S.from !== P.from + P.inserted.length) return false;
        P.inserted += S.inserted;
      } else if (kind === "delete") {
        if (S.from + S.removed.length === P.from) {
          P.removed = S.removed + P.removed;
          P.from = S.from;
        } else if (S.from === P.from) {
          P.removed += S.removed;
        } else return false;
        P.to = P.from + P.removed.length;
      } else return false;
      prev.selAfter = copySel(next.selAfter);
      prev.time = now();
      return true;
    }
    function record(step) {
      const splices = (step.splices || []).map((sp) => ({
        from: sp.from,
        to: sp.to,
        inserted: sp.inserted == null ? "" : String(sp.inserted),
        removed: sp.removed == null ? "" : String(sp.removed)
      }));
      if (!splices.length) return;
      if (txn) {
        if (!txn.selBefore) txn.selBefore = copySel(step.selBefore);
        txn.selAfter = copySel(step.selAfter);
        txn.splices.push(...splices);
        return;
      }
      redoStack.length = 0;
      const entry = {
        splices,
        selBefore: copySel(step.selBefore),
        selAfter: copySel(step.selAfter),
        label: step.label || null,
        source: step.source === "user" ? "user" : "api",
        time: now()
      };
      entry.kind = splices.length === 1 ? spliceKind(splices[0]) : "replace";
      entry.coalescible = entry.source === "user" && entry.kind !== "replace";
      if (entry.source === "user" && coalesce(entry)) {
        broken = false;
        return;
      }
      undoStack.push(entry);
      broken = false;
      trim();
    }
    function transaction(label, fn) {
      if (txn) return fn();
      txn = { label: label || null, splices: [], selBefore: null, selAfter: null };
      try {
        return fn();
      } finally {
        const t = txn;
        txn = null;
        if (t.splices.length) {
          redoStack.length = 0;
          undoStack.push({
            splices: t.splices,
            selBefore: t.selBefore,
            selAfter: t.selAfter,
            label: t.label,
            source: "api",
            time: now(),
            kind: "replace",
            coalescible: false
          });
          broken = true;
          trim();
        }
      }
    }
    return {
      record,
      transaction,
      /** Pop the newest step onto the redo stack and return it (null if none). */
      undo: () => {
        if (txn || !undoStack.length) return null;
        const step = undoStack.pop();
        redoStack.push(step);
        broken = true;
        return step;
      },
      /** Move the newest undone step back and return it (null if none). */
      redo: () => {
        if (txn || !redoStack.length) return null;
        const step = redoStack.pop();
        undoStack.push(step);
        broken = true;
        return step;
      },
      undoDepth: () => undoStack.length,
      redoDepth: () => redoStack.length,
      /** The current typing run ends here (selection moved, focus lost, …). */
      breakRun: () => {
        broken = true;
      },
      inTransaction: () => !!txn,
      /** Test/debug view of the stacks (live entries — read only). */
      steps: () => ({ undo: undoStack.slice(), redo: redoStack.slice() })
    };
  }

  // lib/editor-adapter-textarea.js
  var INDENT = "  ";
  var DECO_KINDS = /* @__PURE__ */ new Set(["range", "line", "gutter"]);
  var DIAG_SEVERITIES = /* @__PURE__ */ new Set(["error", "warning", "info", "hint"]);
  var ASKABLE_KINDS = /* @__PURE__ */ new Set(["fn", "id", "kw", "const"]);
  var DIAG_TINT = {
    error: "rgba(220,53,69,.14)",
    warning: "rgba(255,193,7,.16)",
    info: "rgba(13,110,253,.10)",
    hint: "rgba(108,117,125,.10)"
  };
  var DIAG_INK = {
    error: "rgb(220,53,69)",
    warning: "rgb(200,140,0)",
    info: "rgb(13,110,253)",
    hint: "rgb(108,117,125)"
  };
  var wave = (ink) => `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='M0 2.5 L1.5 0.6 L3 2.5 L4.5 0.6 L6 2.5' fill='none' stroke='${ink}' stroke-width='1'/></svg>`
  )}")`;
  function createTextareaAdapter(surface, opts = {}) {
    const ta = surface.textarea;
    const body = surface.body;
    const gutter = surface.gutter;
    const doc = ta.ownerDocument || document;
    const win = doc.defaultView || window;
    const profile = opts.profile === "script" ? "script" : "chunk";
    const minRows = opts.minRows || 1;
    const hooks = opts.hooks || {};
    const mountEl = body.parentElement;
    const hlEl = body.querySelector(".carmar-highlight");
    const val = () => ta.value;
    const clampOff = (n) => {
      const k = Math.floor(Number(n));
      if (!Number.isFinite(k) || k < 0) return 0;
      return Math.min(k, val().length);
    };
    const handlers = {
      change: /* @__PURE__ */ new Set(),
      selectionchange: /* @__PURE__ */ new Set(),
      focus: /* @__PURE__ */ new Set(),
      blur: /* @__PURE__ */ new Set(),
      viewport: /* @__PURE__ */ new Set(),
      destroy: /* @__PURE__ */ new Set()
    };
    let destroyed = false;
    const fire = (type, payload) => {
      if (destroyed && type !== "destroy") return;
      handlers[type].forEach((h) => {
        try {
          h(payload);
        } catch (e) {
          console.error("editor-adapter handler:", e);
        }
      });
    };
    const on = (type, handler) => {
      const set = handlers[type];
      if (!set || typeof handler !== "function" || destroyed) return () => {
      };
      set.add(handler);
      return () => set.delete(handler);
    };
    const listeners = [];
    const listen = (target, type, fn) => {
      target.addEventListener(type, fn);
      listeners.push([target, type, fn]);
    };
    let version = 0;
    let lastValue = val();
    let pending = null;
    const history = createEditorHistory();
    const diffChanges = (oldV, newV) => {
      let p = 0;
      const maxP = Math.min(oldV.length, newV.length);
      while (p < maxP && oldV.charCodeAt(p) === newV.charCodeAt(p)) p += 1;
      let s = 0;
      const maxS = Math.min(oldV.length, newV.length) - p;
      while (s < maxS && oldV.charCodeAt(oldV.length - 1 - s) === newV.charCodeAt(newV.length - 1 - s)) s += 1;
      return [{ from: p, to: oldV.length - s, insert: newV.slice(p, newV.length - s) }];
    };
    function commit() {
      if (destroyed) return;
      paintNumbering();
      const now = val();
      if (now === lastValue) {
        pending = null;
        reportSelection();
        return;
      }
      const entry = pending;
      pending = null;
      const changes = entry && entry.changes ? entry.changes : diffChanges(lastValue, now);
      const origin = entry && entry.origin || { source: "user" };
      if (!entry || !entry.skipHistory) {
        const splices = [];
        for (let i = changes.length - 1; i >= 0; i -= 1) {
          const c = changes[i];
          splices.push({
            from: c.from,
            to: c.to,
            inserted: c.insert,
            removed: lastValue.slice(c.from, c.to)
          });
        }
        history.record({
          splices,
          selBefore: entry && entry.selBefore || { anchor: lastSel.anchor, head: lastSel.head },
          selAfter: selRange(),
          label: origin.label || null,
          source: origin.source
        });
      }
      lastValue = now;
      version += 1;
      fire("change", { version, changes, origin });
      reportSelection(true);
    }
    hooks.afterSync = commit;
    const noteOrigin = (origin) => {
      if (!pending) pending = { origin, changes: null, selBefore: selRange() };
    };
    hooks.notePending = noteOrigin;
    hooks.undo = () => undoEdit();
    hooks.redo = () => redoEdit();
    const selRange = () => {
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const backward = ta.selectionDirection === "backward";
      const anchor = backward ? e : s;
      const head = backward ? s : e;
      return { anchor, head, empty: anchor === head };
    };
    let lastSel = { anchor: ta.selectionStart, head: ta.selectionEnd };
    function reportSelection(fromCommit) {
      if (destroyed) return;
      const r = selRange();
      if (r.anchor === lastSel.anchor && r.head === lastSel.head) return;
      lastSel = { anchor: r.anchor, head: r.head };
      if (!fromCommit) history.breakRun();
      fire("selectionchange", { main: r, ranges: [r] });
    }
    function applySelection(anchor, head) {
      const a = clampOff(anchor);
      const h = head == null ? a : clampOff(head);
      ta.setSelectionRange(Math.min(a, h), Math.max(a, h), a > h ? "backward" : "forward");
    }
    function reveal(target, o = {}) {
      const off = target != null && typeof target === "object" ? clampOff(target.from) : clampOff(target);
      const cs = win.getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 20;
      const line = lineInfoAt(off).number;
      const viewH = ta.clientHeight || 0;
      if (o.center) {
        const visible = Math.max(1, Math.floor(viewH / lh));
        ta.scrollTop = Math.max(0, (line - Math.floor(visible / 2)) * lh);
        return;
      }
      const top = line * lh;
      if (top < ta.scrollTop) ta.scrollTop = top;
      else if (top + lh > ta.scrollTop + viewH) ta.scrollTop = Math.max(0, top + lh - viewH);
    }
    const selection = {
      getSelection: selRange,
      getSelections: () => [selRange()],
      // [primary] until multi-range ships
      selectedText: () => val().slice(ta.selectionStart, ta.selectionEnd),
      setSelection: (anchor, head, o = {}) => {
        applySelection(anchor, head);
        if (o.reveal) reveal(selRange().head);
        reportSelection();
      },
      setSelections: (ranges, primaryIndex = 0) => {
        if (!Array.isArray(ranges) || !ranges.length) {
          throw new RangeError("setSelections: at least one range is required");
        }
        const i = Math.max(0, Math.min(Math.floor(primaryIndex) || 0, ranges.length - 1));
        const r = ranges[i] || ranges[0];
        applySelection(r.anchor, r.head);
        reportSelection();
      },
      reveal
    };
    const lineCount = () => {
      const v = val();
      let n = 1;
      for (let i = v.indexOf("\n"); i !== -1; i = v.indexOf("\n", i + 1)) n += 1;
      return n;
    };
    function lineInfoAt(offset) {
      const v = val();
      const from = v.lastIndexOf("\n", offset - 1) + 1;
      let to = v.indexOf("\n", offset);
      if (to === -1) to = v.length;
      let number = 0;
      for (let i = v.indexOf("\n"); i !== -1 && i < from; i = v.indexOf("\n", i + 1)) number += 1;
      return { number, from, to, text: v.slice(from, to) };
    }
    function lineInfo(n) {
      const v = val();
      const total = lineCount();
      let idx = Math.floor(Number(n));
      if (!Number.isFinite(idx) || idx < 0) idx = 0;
      if (idx > total - 1) idx = total - 1;
      let from = 0;
      for (let k = 0; k < idx; k += 1) from = v.indexOf("\n", from) + 1;
      let to = v.indexOf("\n", from);
      if (to === -1) to = v.length;
      return { number: idx, from, to, text: v.slice(from, to) };
    }
    function tokenAt(offset) {
      const off = clampOff(offset);
      const li = lineInfoAt(off);
      const col = off - li.from;
      if (col >= li.text.length) return null;
      const lineSpan = hlEl && hlEl.children[li.number];
      if (!lineSpan) return null;
      let acc = 0;
      for (const node of lineSpan.childNodes) {
        const text = node.textContent;
        const len = text.length;
        if (col < acc + len) {
          if (node.nodeType !== 1) return null;
          const m = /(?:^|\s)rtok-([a-z]+)/.exec(node.className || "");
          if (!m) return null;
          const kind = m[1];
          let hoverName = null;
          if (node.dataset && node.dataset.nohover) hoverName = null;
          else if (node.dataset && node.dataset.hover) hoverName = node.dataset.hover;
          else if (ASKABLE_KINDS.has(kind)) hoverName = text;
          return { from: li.from + acc, to: li.from + acc + len, kind, hoverName };
        }
        acc += len;
      }
      return null;
    }
    function setValue(value, origin) {
      const text = value == null ? "" : String(value);
      pending = {
        origin: origin || { source: "api", label: "setValue" },
        changes: [{ from: 0, to: lastValue.length, insert: text }],
        selBefore: selRange()
      };
      surface.setValue(text);
    }
    function applyChanges(changes, o = {}) {
      if (!Array.isArray(changes)) {
        throw new RangeError("applyChanges: changes must be an array of {from, to, insert}");
      }
      const v = val();
      const norm = changes.map((c) => {
        const from = c && c.from;
        const to = c && c.to;
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > v.length) {
          throw new RangeError(
            `applyChanges: bad range [${from}, ${to}) in a document of length ${v.length}`
          );
        }
        return { from, to, insert: c.insert == null ? "" : String(c.insert) };
      }).sort((a, b) => a.from - b.from || a.to - b.to);
      for (let i = 1; i < norm.length; i += 1) {
        if (norm[i].from < norm[i - 1].to) {
          throw new RangeError("applyChanges: ranges overlap");
        }
      }
      if (!norm.length) return { version };
      pending = { origin: o.origin || { source: "api" }, changes: norm, selBefore: selRange() };
      for (let i = norm.length - 1; i >= 0; i -= 1) {
        ta.setRangeText(norm[i].insert, norm[i].from, norm[i].to, "preserve");
      }
      if (o.selection) {
        const sel = Array.isArray(o.selection) ? o.selection[0] : o.selection;
        if (sel) applySelection(sel.anchor, sel.head);
      }
      surface.sync();
      if (o.scrollIntoView) reveal(selRange().head);
      return { version };
    }
    const documentApi = {
      getValue: val,
      getRange: (from, to) => {
        const a = clampOff(from);
        const b = clampOff(to);
        return val().slice(Math.min(a, b), Math.max(a, b));
      },
      setValue,
      applyChanges,
      version: () => version,
      lineCount,
      line: lineInfo,
      lineAt: (offset) => lineInfoAt(clampOff(offset)),
      tokenAt
    };
    function insertAtCursor(text) {
      pending = {
        origin: { source: "api", label: "Insert" },
        changes: null,
        selBefore: selRange()
      };
      surface.insertAtCursor(String(text == null ? "" : text));
    }
    function applyHistoryStep(step, dir) {
      if (doc.activeElement !== ta) {
        try {
          ta.focus({ preventScroll: true });
        } catch (e) {
        }
      }
      pending = {
        origin: { source: "api", label: step.label || (dir === "undo" ? "Undo" : "Redo") },
        changes: null,
        selBefore: null,
        skipHistory: true
      };
      const splices = step.splices;
      if (dir === "redo") {
        for (let i = 0; i < splices.length; i += 1) {
          const sp = splices[i];
          ta.setRangeText(sp.inserted, sp.from, sp.to, "preserve");
        }
      } else {
        for (let i = splices.length - 1; i >= 0; i -= 1) {
          const sp = splices[i];
          ta.setRangeText(sp.removed, sp.from, sp.from + sp.inserted.length, "preserve");
        }
      }
      const sel = dir === "undo" ? step.selBefore : step.selAfter;
      if (sel) applySelection(sel.anchor, sel.head);
      const EventCtor = win && win.Event || Event;
      ta.dispatchEvent(new EventCtor("input", { bubbles: true }));
      return true;
    }
    function undoEdit() {
      if (destroyed) return false;
      const step = history.undo();
      if (!step) return false;
      return applyHistoryStep(step, "undo");
    }
    function redoEdit() {
      if (destroyed) return false;
      const step = history.redo();
      if (!step) return false;
      return applyHistoryStep(step, "redo");
    }
    let completionApi = null;
    let completionDismiss = null;
    const dismissCompletion = () => {
      try {
        if (completionDismiss) completionDismiss();
        else {
          const p = doc.__carmarAC;
          if (p) p.hidden = true;
        }
      } catch (e) {
      }
    };
    const completionVisible = () => {
      try {
        return !!completionApi && completionApi.visible() === true;
      } catch (e) {
        return false;
      }
    };
    const canTriggerCompletion = () => !!completionApi && typeof completionApi.trigger === "function";
    const currentLead = () => {
      const upto = val().slice(0, ta.selectionStart);
      const line = upto.slice(upto.lastIndexOf("\n") + 1);
      return (line.match(/^[ \t]*/) || [""])[0];
    };
    function commentAction(action) {
      const v = val();
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const from = v.lastIndexOf("\n", Math.max(0, s - 1)) + 1;
      const endAnchor = e > s && v[e - 1] === "\n" ? e - 1 : e;
      const nextBreak = v.indexOf("\n", endAnchor);
      const to = nextBreak < 0 ? v.length : nextBreak;
      const sourceText = v.slice(from, to);
      if (!sourceText.trim()) return false;
      const lines = sourceText.split("\n");
      const mode = action === "toggle" ? lines.filter((l) => l.trim()).every((l) => /^\s*#/.test(l)) ? "uncomment" : "comment" : action;
      const replacement = lines.map((l) => {
        if (!l.trim()) return l;
        if (mode === "uncomment") return l.replace(/^(\s*)# ?/, "$1");
        return l.replace(/^(\s*)/, "$1# ");
      }).join("\n");
      if (replacement === sourceText) return false;
      applyChanges([{ from, to, insert: replacement }], {
        origin: { source: "api", label: "Toggle comment" },
        selection: { anchor: from, head: from + replacement.length }
      });
      return true;
    }
    function outdentLine() {
      const s = ta.selectionStart;
      const v = val();
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      if (v.slice(lineStart, lineStart + INDENT.length) !== INDENT) return true;
      const at = Math.max(lineStart, s - INDENT.length);
      applyChanges([{ from: lineStart, to: lineStart + INDENT.length, insert: "" }], {
        origin: { source: "api", label: "Outdent" },
        selection: { anchor: at, head: at }
      });
      return true;
    }
    function lineBlock() {
      const v = val();
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const from = v.lastIndexOf("\n", Math.max(0, s - 1)) + 1;
      const endAnchor = e > s && v[e - 1] === "\n" ? e - 1 : e;
      const nextBreak = v.indexOf("\n", endAnchor);
      return { v, s, e, from, to: nextBreak < 0 ? v.length : nextBreak };
    }
    function moveLines(dir) {
      const { v, s, e, from, to } = lineBlock();
      const block = v.slice(from, to);
      if (dir < 0) {
        if (from === 0) return true;
        const prevFrom = v.lastIndexOf("\n", from - 2) + 1;
        const prev = v.slice(prevFrom, from - 1);
        const shift2 = from - prevFrom;
        applyChanges([{ from: prevFrom, to, insert: `${block}
${prev}` }], {
          origin: { source: "api", label: "Move line up" },
          selection: { anchor: s - shift2, head: e - shift2 }
        });
        return true;
      }
      if (to >= v.length) return true;
      const nextBreak = v.indexOf("\n", to + 1);
      const nextTo = nextBreak < 0 ? v.length : nextBreak;
      const next = v.slice(to + 1, nextTo);
      const shift = next.length + 1;
      applyChanges([{ from, to: nextTo, insert: `${next}
${block}` }], {
        origin: { source: "api", label: "Move line down" },
        selection: { anchor: s + shift, head: e + shift }
      });
      return true;
    }
    function duplicateLines() {
      const { v, s, e, from, to } = lineBlock();
      const block = v.slice(from, to);
      const shift = block.length + 1;
      applyChanges([{ from: to, to, insert: `
${block}` }], {
        origin: { source: "api", label: "Duplicate line" },
        selection: { anchor: s + shift, head: e + shift }
      });
      return true;
    }
    function deleteLines() {
      const { v, from, to } = lineBlock();
      const end = to < v.length ? to + 1 : to;
      const start2 = end === to && from > 0 ? from - 1 : from;
      applyChanges([{ from: start2, to: end, insert: "" }], {
        origin: { source: "api", label: "Delete line" },
        selection: { anchor: start2, head: start2 }
      });
      return true;
    }
    function selectLines() {
      const { v, from, to } = lineBlock();
      ta.setSelectionRange(from, to < v.length ? to + 1 : to);
      return true;
    }
    const PAIRS = { '"': '"', "'": "'", "`": "`", "(": ")", "[": "]", "{": "}" };
    const CLOSERS = new Set(Object.values(PAIRS));
    const closeable = (after) => after === "" || /^[\s)\]},;]/.test(after);
    function pairKey(char) {
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const v = val();
      const close = PAIRS[char];
      if (s !== e) {
        if (!close) return false;
        const inner = v.slice(s, e);
        applyChanges([{ from: s, to: e, insert: char + inner + close }], {
          origin: { source: "api", label: "Surround" },
          selection: { anchor: s + 1, head: s + 1 + inner.length }
        });
        return true;
      }
      if (CLOSERS.has(char) && v[s] === char) {
        if (!PAIRS[char] || char === close) {
          ta.setSelectionRange(s + 1, s + 1);
          return true;
        }
      }
      if (!close) return false;
      if (!closeable(v.slice(s, s + 1))) return false;
      if (char === close && /[\w.]/.test(v.slice(s - 1, s))) return false;
      applyChanges([{ from: s, to: s, insert: char + close }], {
        origin: { source: "api", label: "Auto-close" },
        selection: { anchor: s + 1, head: s + 1 }
      });
      return true;
    }
    function pairBackspace() {
      const s = ta.selectionStart;
      if (s !== ta.selectionEnd || s === 0) return false;
      const v = val();
      const open = v[s - 1];
      if (!PAIRS[open] || v[s] !== PAIRS[open]) return false;
      applyChanges([{ from: s - 1, to: s + 1, insert: "" }], {
        origin: { source: "api", label: "Delete pair" },
        selection: { anchor: s - 1, head: s - 1 }
      });
      return true;
    }
    function gotoMatchingBracket() {
      const v = val();
      const s = ta.selectionStart;
      const OPEN = { "(": ")", "[": "]", "{": "}" };
      const SHUT = { ")": "(", "]": "[", "}": "{" };
      const tries = [s, s - 1].filter((i) => i >= 0 && i < v.length);
      for (const i of tries) {
        const ch = v[i];
        const forward = !!OPEN[ch];
        if (!forward && !SHUT[ch]) continue;
        const want = forward ? OPEN[ch] : SHUT[ch];
        const step = forward ? 1 : -1;
        let depth = 0;
        for (let j = i; j >= 0 && j < v.length; j += step) {
          if (v[j] === ch) depth += 1;
          else if (v[j] === want) {
            depth -= 1;
            if (depth === 0) {
              ta.setSelectionRange(j, j);
              return true;
            }
          }
        }
      }
      return false;
    }
    const COMMANDS = {
      "editor.run": () => {
        if (typeof opts.onRun !== "function") return false;
        dismissCompletion();
        opts.onRun();
        return true;
      },
      "editor.runAll": () => {
        if (typeof opts.onRunAll !== "function") return false;
        opts.onRunAll();
        return true;
      },
      // No "editor.find"/"editor.replace": the per-chunk find bar is gone and
      // ⌘F is the notebook-wide `doc.find` (lib/prose-find.js). A command the
      // surface cannot honour must DECLINE, not pretend.
      "editor.indent": () => {
        insertAtCursor(INDENT);
        return true;
      },
      "editor.outdent": outdentLine,
      "editor.moveLineUp": () => moveLines(-1),
      "editor.moveLineDown": () => moveLines(1),
      "editor.duplicateLine": duplicateLines,
      "editor.deleteLine": deleteLines,
      "editor.selectLine": selectLines,
      "editor.matchingBracket": gotoMatchingBracket,
      "editor.pairKey": (args) => pairKey(args && args.char),
      "editor.pairBackspace": pairBackspace,
      "editor.comment": () => commentAction("toggle"),
      "editor.commentLines": () => commentAction("comment"),
      "editor.uncommentLines": () => commentAction("uncomment"),
      "editor.undo": undoEdit,
      "editor.redo": redoEdit,
      "editor.assign": () => {
        insertAtCursor(" <- ");
        return true;
      },
      "editor.pipe": () => {
        insertAtCursor(" |> ");
        return true;
      },
      "editor.fold": () => false,
      // descoped: no folding on a textarea
      // ── the promoted surface keys (stage-0-command-registry.md) ──────────
      "editor.help": () => {
        if (typeof opts.onHelp !== "function") return false;
        const sym = typeof opts.symbolAtCaret === "function" ? opts.symbolAtCaret() : null;
        if (sym) opts.onHelp(sym);
        return true;
      },
      "editor.newlineAutoIndent": () => {
        const lead = currentLead();
        if (!lead) return false;
        insertAtCursor("\n" + lead);
        return true;
      },
      "editor.completionDismiss": () => {
        if (!completionVisible()) return false;
        completionApi.hide();
        return true;
      },
      "editor.completionNext": () => {
        if (!completionVisible()) return false;
        completionApi.move(1);
        return true;
      },
      "editor.completionPrev": () => {
        if (!completionVisible()) return false;
        completionApi.move(-1);
        return true;
      },
      "editor.completionAccept": () => {
        if (!completionVisible()) return false;
        completionApi.accept();
        return true;
      },
      "editor.completionTrigger": () => {
        if (!canTriggerCompletion()) return false;
        completionApi.trigger(true);
        return true;
      },
      "editor.completionFromTab": () => {
        if (!canCompleteFromTab()) return false;
        completionApi.trigger(true);
        return true;
      }
    };
    function canCompleteFromTab() {
      return canTriggerCompletion() && ta.selectionStart === ta.selectionEnd && typeof opts.wantsCompletion === "function" && opts.wantsCompletion() === true;
    }
    const CAN_EXEC = {
      "editor.run": () => typeof opts.onRun === "function",
      "editor.runAll": () => typeof opts.onRunAll === "function",
      "editor.help": () => typeof opts.onHelp === "function",
      "editor.newlineAutoIndent": () => !!currentLead(),
      "editor.completionDismiss": completionVisible,
      "editor.completionNext": completionVisible,
      "editor.completionPrev": completionVisible,
      "editor.completionAccept": completionVisible,
      "editor.completionTrigger": canTriggerCompletion,
      "editor.completionFromTab": canCompleteFromTab,
      "editor.fold": () => false
    };
    const commandsApi = {
      execCommand: (id, args) => {
        if (destroyed) return false;
        const run = COMMANDS[id];
        if (!run) return false;
        try {
          return run(args) !== false;
        } catch (e) {
          return false;
        }
      },
      /** Router-guard probe: would execCommand(id) act right now? */
      canExec: (id) => {
        if (destroyed || !COMMANDS[id]) return false;
        const probe = CAN_EXEC[id];
        if (!probe) return true;
        try {
          return probe() === true;
        } catch (e) {
          return false;
        }
      },
      undo: undoEdit,
      redo: redoEdit,
      undoDepth: () => history.undoDepth(),
      redoDepth: () => history.redoDepth(),
      insertAtCursor,
      dismissCompletion
    };
    const measurable = () => ta.isConnected && ta.getClientRects().length > 0;
    const coordinates = {
      offsetToPosition: (offset) => {
        const off = clampOff(offset);
        const li = lineInfoAt(off);
        return { line: li.number, ch: off - li.from };
      },
      positionToOffset: (pos) => {
        const li = lineInfo(pos && pos.line);
        let ch = Math.floor(Number(pos && pos.ch));
        if (!Number.isFinite(ch) || ch < 0) ch = 0;
        return li.from + Math.min(ch, li.text.length);
      },
      offsetToScreen: (offset) => {
        if (!measurable()) return null;
        const off = clampOff(offset);
        const cs = win.getComputedStyle(ta);
        const lh = parseFloat(cs.lineHeight) || 20;
        const padTop = parseFloat(cs.paddingTop) || 0;
        const rect = ta.getBoundingClientRect();
        const line = lineInfoAt(off).number;
        return {
          x: caretViewportXY(ta, off).x,
          y: rect.top + padTop + line * lh - ta.scrollTop,
          lineHeight: lh
        };
      },
      screenToOffset: (x, y) => {
        if (!measurable()) return null;
        const rect = ta.getBoundingClientRect();
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
        const cs = win.getComputedStyle(ta);
        const lh = parseFloat(cs.lineHeight) || 20;
        const padTop = parseFloat(cs.paddingTop) || 0;
        const contentY = y - rect.top - padTop + ta.scrollTop;
        const line = Math.floor(contentY / lh);
        if (line < 0 || line >= lineCount()) return null;
        const li = lineInfo(line);
        let lo = 0;
        let hi = li.text.length;
        while (lo < hi) {
          const mid = lo + hi + 1 >> 1;
          if (caretViewportXY(ta, li.from + mid).x <= x) lo = mid;
          else hi = mid - 1;
        }
        if (lo < li.text.length) {
          const a = caretViewportXY(ta, li.from + lo).x;
          const b = caretViewportXY(ta, li.from + lo + 1).x;
          if (Math.abs(b - x) < Math.abs(x - a)) lo += 1;
        }
        return li.from + lo;
      }
    };
    const decoOwners = /* @__PURE__ */ new Map();
    const diagOwners = /* @__PURE__ */ new Map();
    let decoLayer = null;
    let decoCarrier = null;
    const positionDecoLayer = () => {
      if (decoCarrier) decoCarrier.style.transform = `translateY(${-ta.scrollTop}px)`;
    };
    const ensureLayer = () => {
      if (decoLayer && decoLayer.isConnected) return;
      decoLayer = doc.createElement("div");
      decoLayer.className = "carmar-adapter-decor";
      decoLayer.setAttribute("aria-hidden", "true");
      Object.assign(decoLayer.style, {
        position: "absolute",
        inset: "0",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: "0"
      });
      decoCarrier = doc.createElement("div");
      Object.assign(decoCarrier.style, {
        position: "absolute",
        left: "0",
        right: "0",
        top: "0"
      });
      decoLayer.appendChild(decoCarrier);
      const wrap = ta.parentElement;
      const active = wrap.querySelector(".carmar-activeline");
      wrap.insertBefore(decoLayer, active ? active.nextSibling : wrap.firstChild);
      positionDecoLayer();
    };
    function paintBands() {
      if (!decoLayer && !decoOwners.size && !diagOwners.size) return;
      ensureLayer();
      decoCarrier.replaceChildren();
      if (gutterLayer) gutterLayer.replaceChildren();
      const cs = win.getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 20;
      const padTop = parseFloat(cs.paddingTop) || 0;
      const lineOf = (offset) => lineInfoAt(clampOff(offset)).number;
      const band = (lineFrom, lineTo, className, decorate) => {
        const b = doc.createElement("div");
        b.className = ("carmar-deco-band " + (className || "")).trim();
        Object.assign(b.style, {
          position: "absolute",
          left: "0",
          right: "0",
          pointerEvents: "none",
          top: `${padTop + lineFrom * lh}px`,
          height: `${(lineTo - lineFrom + 1) * lh}px`
        });
        if (decorate) decorate(b);
        decoCarrier.appendChild(b);
      };
      decoOwners.forEach((specs, ownerId) => {
        specs.forEach((d) => {
          if (d.kind === "gutter") return;
          const lineFrom = lineOf(d.from);
          const lineTo = d.kind === "range" ? lineOf(Math.max(d.from, d.to - 1)) : lineFrom;
          band(lineFrom, lineTo, d.className, (b) => {
            b.setAttribute("data-owner", ownerId);
            if (d.attributes) {
              Object.entries(d.attributes).forEach(([k, v2]) => b.setAttribute(k, String(v2)));
            }
          });
        });
      });
      const measurableNow = measurable();
      diagOwners.forEach((specs, ownerId) => {
        specs.forEach((d) => {
          const first = lineOf(d.from);
          const last = lineOf(Math.max(d.from, d.to - 1));
          const title = d.source ? `${d.source}: ${d.message}` : d.message;
          gutterMark(first, last, d.severity, title, ownerId);
          if (!measurableNow) {
            band(first, last, null, (b) => {
              b.setAttribute("data-owner", ownerId);
              b.setAttribute("data-severity", d.severity);
              b.title = title;
              b.style.background = DIAG_TINT[d.severity];
            });
            return;
          }
          const x0 = ta.getBoundingClientRect().left;
          for (let line = first; line <= last; line += 1) {
            const li = lineInfo(line);
            const segFrom = Math.max(d.from, li.from);
            const segTo = Math.min(d.to, li.from + li.text.length);
            const left = caretViewportXY(ta, segFrom).x - x0;
            const right = segTo > segFrom ? caretViewportXY(ta, segTo).x - x0 : left + charWidth();
            const u = doc.createElement("div");
            u.className = "carmar-diag-squiggle";
            u.setAttribute("data-owner", ownerId);
            u.setAttribute("data-severity", d.severity);
            u.title = title;
            Object.assign(u.style, {
              position: "absolute",
              pointerEvents: "none",
              left: `${left}px`,
              width: `${Math.max(right - left, 2)}px`,
              top: `${padTop + (line + 1) * lh - 3}px`,
              height: "3px",
              backgroundImage: wave(DIAG_INK[d.severity] || DIAG_INK.error),
              backgroundRepeat: "repeat-x"
            });
            decoCarrier.appendChild(u);
          }
        });
      });
    }
    function charWidth() {
      const a = caretViewportXY(ta, 0).x;
      const b = caretViewportXY(ta, Math.min(1, ta.value.length)).x;
      return b > a ? b - a : 7;
    }
    let gutterLayer = null;
    function gutterMark(lineFrom, lineTo, severity, title, ownerId) {
      if (!gutter) return;
      if (!gutterLayer || !gutterLayer.isConnected) {
        if (win.getComputedStyle(gutter).position === "static") gutter.style.position = "relative";
        gutterLayer = doc.createElement("div");
        gutterLayer.className = "carmar-gutter-marks";
        gutterLayer.setAttribute("aria-hidden", "true");
        Object.assign(gutterLayer.style, {
          position: "absolute",
          left: "0",
          top: "0",
          bottom: "0",
          width: "6px",
          pointerEvents: "none"
        });
        gutter.appendChild(gutterLayer);
      }
      const cs = win.getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 20;
      const gpad = parseFloat(win.getComputedStyle(gutter).paddingTop) || 0;
      for (let line = lineFrom; line <= lineTo; line += 1) {
        const dot = doc.createElement("div");
        dot.className = "carmar-gutter-mark";
        dot.setAttribute("data-owner", ownerId);
        dot.setAttribute("data-severity", severity);
        dot.title = title;
        Object.assign(dot.style, {
          position: "absolute",
          left: "2px",
          width: "4px",
          height: "4px",
          borderRadius: "50%",
          pointerEvents: "auto",
          background: DIAG_INK[severity] || DIAG_INK.error,
          top: `${gpad + line * lh + lh / 2 - 2 - gutter.scrollTop}px`
        });
        gutterLayer.appendChild(dot);
      }
    }
    let numbering = null;
    function paintNumbering() {
      if (!numbering || !gutter) return;
      const n = Math.max(lineCount(), numbering.floor);
      const want = Array.from({ length: n }, (_, i) => String(numbering.first + i)).join("\n");
      if (gutter.textContent !== want) gutter.textContent = want;
    }
    const presentation = {
      setDecorations: (ownerId, decorations, docVersion) => {
        if (!Array.isArray(decorations)) {
          throw new RangeError("setDecorations: decorations must be an array");
        }
        const specs = decorations.map((d) => {
          if (!d || !DECO_KINDS.has(d.kind) || !Number.isFinite(Number(d.from)) || d.kind === "range" && !Number.isFinite(Number(d.to))) {
            throw new RangeError("setDecorations: malformed DecorationSpec");
          }
          return {
            kind: d.kind,
            from: Number(d.from),
            to: d.to == null ? null : Number(d.to),
            className: d.className || "",
            attributes: d.attributes || null
          };
        });
        if (docVersion !== version) return false;
        decoOwners.set(String(ownerId), specs);
        paintBands();
        return true;
      },
      clearDecorations: (ownerId) => {
        if (decoOwners.delete(String(ownerId))) paintBands();
      },
      setDiagnostics: (ownerId, diagnostics, docVersion) => {
        if (!Array.isArray(diagnostics)) {
          throw new RangeError("setDiagnostics: diagnostics must be an array");
        }
        const specs = diagnostics.map((d) => {
          if (!d || !DIAG_SEVERITIES.has(d.severity) || !Number.isFinite(Number(d.from)) || !Number.isFinite(Number(d.to)) || typeof d.message !== "string") {
            throw new RangeError("setDiagnostics: malformed DiagnosticSpec");
          }
          return {
            from: Number(d.from),
            to: Number(d.to),
            severity: d.severity,
            message: d.message,
            detail: d.detail || "",
            source: d.source || ""
          };
        });
        if (docVersion !== version) return false;
        diagOwners.set(String(ownerId), specs);
        paintBands();
        return true;
      },
      setLineNumbering: (spec) => {
        numbering = {
          first: Number.isFinite(spec && spec.first) ? Math.floor(spec.first) : 1,
          floor: Number.isFinite(spec && spec.floor) ? Math.floor(spec.floor) : minRows
        };
        paintNumbering();
      }
    };
    function destroy() {
      if (destroyed) return;
      fire("destroy", {});
      destroyed = true;
      listeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn));
      listeners.length = 0;
      Object.values(handlers).forEach((set) => set.clear());
      hooks.afterSync = null;
      hooks.notePending = null;
      hooks.undo = null;
      hooks.redo = null;
      if (decoLayer) {
        decoLayer.remove();
        decoLayer = null;
        decoCarrier = null;
      }
      if (gutterLayer) {
        gutterLayer.remove();
        gutterLayer = null;
      }
      body.remove();
    }
    ["click", "keyup", "select"].forEach((type) => listen(ta, type, reportSelection));
    listen(ta, "focus", () => {
      fire("focus", {});
      reportSelection();
    });
    listen(ta, "blur", () => {
      history.breakRun();
      fire("blur", {});
    });
    listen(ta, "scroll", () => {
      positionDecoLayer();
      if (diagOwners.size) paintBands();
      fire("viewport", { scrollTop: ta.scrollTop, scrollLeft: ta.scrollLeft });
    });
    listen(doc, "selectionchange", () => {
      if (doc.activeElement === ta) reportSelection();
    });
    const adapter = {
      document: documentApi,
      selection,
      commands: commandsApi,
      coordinates,
      presentation,
      on,
      focus: (o) => ta.focus(o),
      hasFocus: () => doc.activeElement === ta,
      destroy,
      dom: body,
      profile,
      /** Wiring hook (not a contract surface): the mount that owns the
       *  completion popup hands the adapter its controller — the full
       *  autocomplete api ({hide, visible, move, accept, trigger}) so the
       *  registry's completion commands can drive it, or (legacy form) a bare
       *  dismisser function. Either way commands.dismissCompletion closes THAT
       *  popup, state and all. */
      bindCompletion: (fn) => {
        if (fn && typeof fn === "object") {
          completionApi = fn;
          completionDismiss = () => fn.hide();
        } else {
          completionApi = null;
          completionDismiss = typeof fn === "function" ? fn : null;
        }
      },
      /** Wiring hook: declare the origin (and pre-mutation selection) of a
       *  change about to arrive from OUTSIDE the adapter's own methods — the
       *  completion accept uses it so the accept lands as one labelled step. */
      noteOrigin,
      /** Group every mutation inside fn into ONE undo step (nested calls
       *  flatten into the outer one). The Stage 4 / AI-acceptance seam. */
      transaction: (label, fn) => history.transaction(label, fn)
    };
    body.setAttribute("data-carmar-editor", "");
    body.setAttribute("data-carmar-profile", profile);
    body._carmarAdapter = adapter;
    return adapter;
  }

  // lib/edit-surface.js
  var INDENT2 = "  ";
  function mountEditSurface(mountEl, opts = {}) {
    const doc = mountEl.ownerDocument || document;
    const el = (tag, cls) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      return n;
    };
    const minRows = opts.minRows || 1;
    const hooks = {};
    const body = el("div", "carmar-editor-body");
    const gutter = el("div", "carmar-gutter");
    gutter.dataset.minRows = String(minRows);
    const codeWrap = el("div", "carmar-code-wrap");
    const activeLine = el("div", "carmar-activeline");
    activeLine.setAttribute("aria-hidden", "true");
    codeWrap.appendChild(activeLine);
    const hl = el("pre", "carmar-highlight");
    hl.setAttribute("aria-hidden", "true");
    const ta = el("textarea", "carmar-code");
    ta.spellcheck = false;
    ta.autocapitalize = "off";
    ta.autocomplete = "off";
    ta.setAttribute("autocorrect", "off");
    ta.value = opts.value || "";
    codeWrap.append(hl, ta);
    body.append(gutter, codeWrap);
    mountEl.appendChild(body);
    const inc = createLineHighlighter();
    let markedLines = [];
    let lastMarks = null;
    const sameMarks = (a, b) => a === b || !!a && !!b && a[0] === b[0] && a[1] === b[1];
    const patchLines = (from, oldEnd, newEnd) => {
      const kids = hl.children;
      const common = Math.min(oldEnd, newEnd);
      for (let i = from; i < common; i += 1) kids[i].innerHTML = inc.lineHTML(i) + "\n";
      if (newEnd > oldEnd) {
        const ref = kids[common] || null;
        const frag = doc.createDocumentFragment();
        for (let i = common; i < newEnd; i += 1) {
          const span = doc.createElement("span");
          span.innerHTML = inc.lineHTML(i) + "\n";
          frag.appendChild(span);
        }
        hl.insertBefore(frag, ref);
      } else {
        for (let i = oldEnd - 1; i >= newEnd; i -= 1) kids[i].remove();
      }
    };
    const paintMarks = (marks) => {
      markedLines.forEach((i) => {
        const n = hl.children[i];
        if (n) n.innerHTML = inc.lineHTML(i) + "\n";
      });
      markedLines = [];
      if (marks) {
        const byLine = /* @__PURE__ */ new Map();
        marks.forEach((k) => {
          const li = inc.lineOfOffset(k);
          if (li < 0) return;
          if (!byLine.has(li)) byLine.set(li, []);
          byLine.get(li).push(k - inc.lineStart(li));
        });
        byLine.forEach((rels, li) => {
          const n = hl.children[li];
          if (n) n.innerHTML = inc.lineHTMLWithMarks(li, rels) + "\n";
          markedLines.push(li);
        });
      }
      lastMarks = marks;
    };
    const paintHighlight = () => {
      const res = inc.update(ta.value);
      let markStale = false;
      if (res) {
        const delta = res.newEnd - res.oldEnd;
        const kept = [];
        markedLines.forEach((i) => {
          if (i < res.start) kept.push(i);
          else if (i >= res.oldEnd) kept.push(i + delta);
          else markStale = true;
        });
        markedLines = kept;
        patchLines(res.start, res.oldEnd, res.newEnd);
      }
      const marks = bracketPair();
      if (markStale || !sameMarks(marks, lastMarks)) paintMarks(marks);
    };
    function paintActiveLine() {
      const cs = getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 20;
      const pad = parseFloat(cs.paddingTop) || 0;
      const focused = doc.activeElement === ta;
      activeLine.style.display = focused ? "" : "none";
      if (!focused) return;
      const line = ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
      activeLine.style.height = `${lh}px`;
      activeLine.style.transform = `translateY(${pad + line * lh - ta.scrollTop}px)`;
    }
    function bracketPair() {
      if (doc.activeElement !== ta) return null;
      if (ta.selectionStart !== ta.selectionEnd) return null;
      const src = ta.value;
      const pos = ta.selectionStart;
      const isOpen = (c) => c === "(" || c === "[" || c === "{";
      const isClose = (c) => c === ")" || c === "]" || c === "}";
      let i = -1;
      if (pos > 0 && (isOpen(src[pos - 1]) || isClose(src[pos - 1]))) i = pos - 1;
      else if (pos < src.length && (isOpen(src[pos]) || isClose(src[pos]))) i = pos;
      if (i < 0) return null;
      const j = matchBracket(src, i);
      return j < 0 ? null : [Math.min(i, j), Math.max(i, j)];
    }
    let grownLines = -1;
    const autoGrow = () => {
      if (!opts.autoGrow) return;
      const lines = Math.max(ta.value.split("\n").length, minRows);
      if (lines === grownLines) return;
      ta.style.height = "auto";
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.style.height = `${Math.max(ta.scrollHeight, lines * lh) + 2}px`;
      if (ta.scrollHeight > 0) grownLines = lines;
    };
    const paintGutter = () => {
      const n = Math.max(ta.value.split("\n").length, minRows);
      const want = Array.from({ length: n }, (_, i) => i + 1).join("\n");
      if (gutter.textContent !== want) gutter.textContent = want;
    };
    const sync = () => {
      autoGrow();
      paintGutter();
      paintHighlight();
      paintActiveLine();
      if (opts.onLineCount) opts.onLineCount(ta.value.split("\n").length);
      if (hooks.afterSync) hooks.afterSync();
    };
    const caretMoved = () => {
      const marks = bracketPair();
      if (!sameMarks(marks, lastMarks)) paintMarks(marks);
      paintActiveLine();
    };
    ["click", "keyup", "select", "focus", "blur"].forEach((evt) => ta.addEventListener(evt, caretMoved));
    ta.addEventListener("scroll", () => {
      hl.scrollLeft = ta.scrollLeft;
      hl.scrollTop = ta.scrollTop;
      gutter.scrollTop = ta.scrollTop;
      paintActiveLine();
    });
    ta.addEventListener("input", () => {
      sync();
      if (opts.onChange) opts.onChange(ta.value);
    });
    function insertAtCursor(text) {
      if (hooks.notePending) hooks.notePending({ source: "api", label: "Insert" });
      const { selectionStart: s, selectionEnd: e } = ta;
      ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
      ta.selectionStart = ta.selectionEnd = s + text.length;
      sync();
      if (opts.onChange) opts.onChange(ta.value);
    }
    function wantsCompletion() {
      if (ta.selectionStart !== ta.selectionEnd) return false;
      const upto = ta.value.slice(0, ta.selectionStart);
      const line = upto.slice(upto.lastIndexOf("\n") + 1);
      if (!line.trim()) return false;
      if (/[A-Za-z0-9._]$/.test(line)) return true;
      if (/(\$|@|::|:::)$/.test(line)) return true;
      if (/\(\s*$|,\s*$|=\s*$/.test(line)) return true;
      return false;
    }
    function symbolAtCaret() {
      const src = ta.value;
      const isName = (c) => c && /[A-Za-z0-9._]/.test(c);
      let a = ta.selectionStart;
      let b = ta.selectionEnd;
      if (a !== b) return src.slice(a, b).trim() || null;
      while (a > 0 && isName(src[a - 1])) a -= 1;
      while (b < src.length && isName(src[b])) b += 1;
      if (a === b) return null;
      const sym = src.slice(a, b);
      const ns = /([A-Za-z.][A-Za-z0-9._]*):::?$/.exec(src.slice(0, a));
      return ns ? `${ns[1]}::${sym}` : sym;
    }
    function outdentCurrentLine() {
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
      if (ta.value.slice(lineStart, lineStart + INDENT2.length) !== INDENT2) return;
      ta.value = ta.value.slice(0, lineStart) + ta.value.slice(lineStart + INDENT2.length);
      ta.selectionStart = ta.selectionEnd = Math.max(lineStart, s - INDENT2.length);
      sync();
      if (opts.onChange) opts.onChange(ta.value);
    }
    ta.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey && opts.onRunAll) opts.onRunAll();
        else if (opts.onRun) opts.onRun();
        return;
      }
      if (e.altKey && (e.key === "-" || e.code === "Minus")) {
        e.preventDefault();
        insertAtCursor(" <- ");
        return;
      }
      if (mod && e.shiftKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        insertAtCursor(" |> ");
        return;
      }
      if (mod && !e.altKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          if (hooks.redo) hooks.redo();
        } else if (hooks.undo) hooks.undo();
        return;
      }
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        if (hooks.redo) hooks.redo();
        return;
      }
      if (opts.onKeyDown && opts.onKeyDown(e) === true) return;
      if (e.key === "F1") {
        e.preventDefault();
        const sym = symbolAtCaret();
        if (sym && opts.onHelp) opts.onHelp(sym);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          outdentCurrentLine();
          return;
        }
        if (opts.onTabComplete && wantsCompletion()) {
          if (opts.onTabComplete() === true) return;
        }
        insertAtCursor(INDENT2);
        return;
      }
      if (e.key === "Enter" && !mod) {
        const upto = ta.value.slice(0, ta.selectionStart);
        const line = upto.slice(upto.lastIndexOf("\n") + 1);
        const lead = (line.match(/^[ \t]*/) || [""])[0];
        if (lead) {
          e.preventDefault();
          insertAtCursor("\n" + lead);
        }
      }
    });
    sync();
    const api = {
      body,
      textarea: ta,
      gutter,
      sync,
      getValue: () => ta.value,
      setValue: (v) => {
        if (hooks.notePending) hooks.notePending({ source: "api", label: "setValue" });
        ta.value = v == null ? "" : String(v);
        sync();
      },
      focus: () => ta.focus(),
      insertAtCursor
    };
    api.adapter = createTextareaAdapter(api, {
      profile: opts.profile || (opts.autoGrow ? "chunk" : "script"),
      minRows,
      onRun: opts.onRun || null,
      onRunAll: opts.onRunAll || null,
      onHelp: opts.onHelp || null,
      // The registry's promoted keys reuse the surface's own judgment — one
      // wantsCompletion, one symbolAtCaret, never a second implementation.
      symbolAtCaret,
      wantsCompletion,
      hooks
    });
    return api;
  }
  function matchBracket(src, i) {
    const PAIRS = { "(": ")", "[": "]", "{": "}" };
    const REV = { ")": "(", "]": "[", "}": "{" };
    const ch = src[i];
    const forward = !!PAIRS[ch];
    const want = forward ? PAIRS[ch] : REV[ch];
    if (!want) return -1;
    const skip = inertRegions(src);
    const inert = (k) => {
      let lo = 0;
      let hi = skip.length - 1;
      while (lo <= hi) {
        const mid = lo + hi >> 1;
        if (k < skip[mid][0]) hi = mid - 1;
        else if (k >= skip[mid][1]) lo = mid + 1;
        else return true;
      }
      return false;
    };
    if (inert(i)) return -1;
    let depth = 0;
    for (let k = i; forward ? k < src.length : k >= 0; k += forward ? 1 : -1) {
      if (inert(k)) continue;
      const c = src[k];
      if (c === ch) depth += 1;
      else if (c === want) {
        depth -= 1;
        if (depth === 0) return k;
      }
    }
    return -1;
  }
  function inertRegions(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "#") {
        const end = src.indexOf("\n", i);
        out.push([i, end === -1 ? src.length : end]);
        i = end === -1 ? src.length : end;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        let k = i + 1;
        while (k < src.length) {
          if (src[k] === "\\") {
            k += 2;
            continue;
          }
          if (src[k] === c || src[k] === "\n") break;
          k += 1;
        }
        out.push([i, Math.min(k + 1, src.length)]);
        i = k + 1;
        continue;
      }
      i += 1;
    }
    return out;
  }

  // lib/completion-merge.js
  var R_KEYWORDS = Object.freeze([
    "if",
    "else",
    "for",
    "while",
    "repeat",
    "function",
    "return",
    "break",
    "next",
    "TRUE",
    "FALSE",
    "NULL",
    "NA",
    "NA_integer_",
    "NA_real_",
    "NA_character_",
    "Inf",
    "NaN",
    "in"
  ]);
  function enclosingCall(before) {
    const text = String(before == null ? "" : before);
    let depth = 0;
    let inStr = null;
    const closers = { ")": "(", "]": "[", "}": "{" };
    const inert = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (inStr) {
        inert[i] = 1;
        if (c === "\\") {
          if (i + 1 < text.length) inert[i + 1] = 1;
          i += 1;
        } else if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        inStr = c;
        inert[i] = 1;
        continue;
      }
      if (c === "#") {
        for (let k = i; k < text.length; k += 1) inert[k] = 1;
        break;
      }
    }
    for (let i = text.length - 1; i >= 0; i -= 1) {
      if (inert[i]) continue;
      const c = text[i];
      if (c === ")" || c === "]" || c === "}") {
        depth += 1;
        continue;
      }
      if (c === "(" || c === "[" || c === "{") {
        if (depth > 0) {
          depth -= 1;
          continue;
        }
        if (c !== "(") return null;
        const nameEnd = i;
        const name = (text.slice(0, nameEnd).match(/[\p{L}\p{N}._:]+$/u) || [""])[0];
        if (!name) return null;
        let argIndex = 0;
        let d = 0;
        for (let k = i + 1; k < text.length; k += 1) {
          if (inert[k]) continue;
          const ch = text[k];
          if ("([{".includes(ch)) d += 1;
          else if (")]}".includes(ch)) d -= 1;
          else if (ch === "," && d === 0) argIndex += 1;
        }
        return { name, open: i, argsFrom: i + 1, argIndex };
      }
    }
    return null;
  }

  // lib/signature-help.js
  var IDLE_MS = 120;
  function attachSignatureHelp(ta, opts = {}) {
    const doc = ta.ownerDocument || document;
    const win = doc.defaultView || window;
    if (!opts.provider) return { show: () => {
    }, hide: () => {
    }, dispose: () => {
    } };
    let timer = null;
    let seq = 0;
    let shownFor = null;
    const cache = /* @__PURE__ */ new Map();
    const popup = () => {
      let p = doc.__carmarSig;
      if (p && p.isConnected) return p;
      p = doc.createElement("div");
      p.className = "carmar-sig";
      p.hidden = true;
      (doc.querySelector(".cn-root") || doc.body).appendChild(p);
      doc.__carmarSig = p;
      return p;
    };
    function hide() {
      shownFor = null;
      const p = doc.__carmarSig;
      if (p) p.hidden = true;
    }
    function callAtCaret() {
      if (ta.selectionStart !== ta.selectionEnd) return null;
      const pos = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", pos - 1) + 1;
      return enclosingCall(ta.value.slice(lineStart, pos));
    }
    async function show(explicit = false) {
      if (!explicit && opts.suppressed && opts.suppressed()) {
        hide();
        return;
      }
      const call = callAtCaret();
      if (!call || !call.name) {
        hide();
        return;
      }
      const key = `${call.name}#${call.argIndex}`;
      if (key === shownFor) return;
      const id = ++seq;
      let info = cache.get(call.name);
      if (info === void 0) {
        try {
          info = await opts.provider(call.name);
        } catch (e) {
          info = null;
        }
        if (cache.size > 200) cache.clear();
        cache.set(call.name, info);
      }
      if (id !== seq) return;
      if (!info || !info.signature) {
        hide();
        return;
      }
      const now = callAtCaret();
      if (!now || now.name !== call.name) {
        hide();
        return;
      }
      paint(info, now.argIndex);
      shownFor = `${now.name}#${now.argIndex}`;
    }
    function paint(info, argIndex) {
      const p = popup();
      p.replaceChildren();
      const sig = String(info.signature);
      const open = sig.indexOf("(");
      const close = sig.lastIndexOf(")");
      const head = open < 0 ? sig : sig.slice(0, open + 1);
      const tail = close > open ? sig.slice(close) : "";
      const inner = open < 0 || close <= open ? "" : sig.slice(open + 1, close);
      const add = (text, cls) => {
        const n = doc.createElement("span");
        if (cls) n.className = cls;
        n.textContent = text;
        p.appendChild(n);
      };
      add(head, "carmar-sig-name");
      splitArgs(inner).forEach((arg, i) => {
        if (i) add(", ");
        add(arg, i === argIndex ? "carmar-sig-active" : "");
      });
      add(tail);
      if (info.detail) {
        const d = doc.createElement("span");
        d.className = "carmar-sig-detail";
        d.textContent = String(info.detail);
        p.appendChild(d);
      }
      p.hidden = false;
      place(p);
    }
    function place(p) {
      const xy = caretViewportXY(ta, ta.selectionStart);
      const cs = win.getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 20;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const left = Math.min(Math.max(xy.x - 8, 8), win.innerWidth - w - 8);
      let top = xy.y - h - 6;
      if (top < 8) top = xy.y + lh + 6;
      p.style.left = `${Math.round(left)}px`;
      p.style.top = `${Math.round(top)}px`;
    }
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => show(false), IDLE_MS);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        hide();
        return;
      }
      if (e.code === "Space" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        show(true);
      }
    };
    ta.addEventListener("input", schedule);
    ta.addEventListener("click", schedule);
    ta.addEventListener("keyup", (e) => {
      if (e.key !== "Escape") schedule();
    });
    ta.addEventListener("keydown", onKey);
    ta.addEventListener("blur", hide);
    ta.addEventListener("scroll", hide);
    return {
      show,
      hide,
      dispose: () => {
        clearTimeout(timer);
        hide();
        ta.removeEventListener("input", schedule);
        ta.removeEventListener("click", schedule);
        ta.removeEventListener("keydown", onKey);
        ta.removeEventListener("blur", hide);
        ta.removeEventListener("scroll", hide);
      }
    };
  }
  function splitArgs(inner) {
    const text = String(inner == null ? "" : inner);
    if (!text.trim()) return [];
    const out = [];
    let depth = 0;
    let start2 = 0;
    let inStr = null;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (inStr) {
        if (c === "\\") i += 1;
        else if (c === inStr) inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        inStr = c;
        continue;
      }
      if ("([{".includes(c)) depth += 1;
      else if (")]}".includes(c)) depth -= 1;
      else if (c === "," && depth === 0) {
        out.push(text.slice(start2, i).trim());
        start2 = i + 1;
      }
    }
    out.push(text.slice(start2).trim());
    return out;
  }

  // lib/hover-help.js
  var DWELL_MS = 450;
  var HIDE_MS = 160;
  var MAX_CACHE = 200;
  var ASKABLE = /rtok-(fn|id|kw|const)/;
  function attachHoverHelp(ta, opts = {}) {
    const doc = ta.ownerDocument || document;
    const win = doc.defaultView || window;
    if (!opts.provider) return { dispose: () => {
    } };
    const cache = /* @__PURE__ */ new Map();
    let timer = null;
    let hideTimer = null;
    let current = null;
    let seq = 0;
    const pop = () => hoverPopup(doc);
    function hide() {
      current = null;
      const p = doc.__carmarHover;
      if (p) p.hidden = true;
    }
    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, HIDE_MS);
    }
    function tokenAt(x, y) {
      const stack = doc.elementsFromPoint ? doc.elementsFromPoint(x, y) : [];
      for (const el of stack) {
        if (!el.classList) continue;
        if (el.classList.contains("carmar-editor") || el.tagName === "BODY") break;
        if (el.tagName === "SPAN" && ASKABLE.test(el.className)) {
          if (el.dataset.nohover) return null;
          return el;
        }
      }
      return null;
    }
    ta.addEventListener("mousemove", (e) => {
      if (e.buttons) {
        clearTimeout(timer);
        scheduleHide();
        return;
      }
      const span = tokenAt(e.clientX, e.clientY);
      if (!span) {
        clearTimeout(timer);
        scheduleHide();
        return;
      }
      if (span === current) {
        clearTimeout(hideTimer);
        return;
      }
      clearTimeout(timer);
      clearTimeout(hideTimer);
      const name = span.dataset.hover || span.textContent;
      timer = setTimeout(() => show(span, name), DWELL_MS);
    });
    ta.addEventListener("mouseleave", () => {
      clearTimeout(timer);
      scheduleHide();
    });
    ta.addEventListener("keydown", () => {
      clearTimeout(timer);
      hide();
    });
    ta.addEventListener("scroll", () => {
      clearTimeout(timer);
      hide();
    });
    async function show(span, name) {
      if (!span.isConnected) return;
      current = span;
      const id = ++seq;
      let info = cache.get(name);
      if (info === void 0) {
        try {
          info = await opts.provider(name);
        } catch (e) {
          info = null;
        }
        if (cache.size > MAX_CACHE) cache.clear();
        cache.set(name, info);
      }
      if (id !== seq || current !== span || !span.isConnected) return;
      if (!info || info.found === false || info.found === "FALSE") {
        hide();
        return;
      }
      paint(span, name, info);
    }
    function paint(span, name, info) {
      const p = pop();
      p.replaceChildren();
      const add = (cls, text) => {
        if (typeof text !== "string" || !text.trim()) return;
        const n = doc.createElement("div");
        n.className = cls;
        n.textContent = text;
        p.appendChild(n);
      };
      const head = doc.createElement("div");
      head.className = "carmar-hover-head";
      const nm = doc.createElement("code");
      nm.className = "carmar-hover-name";
      nm.textContent = String(info.signature || name);
      head.appendChild(nm);
      if (info.package) {
        const pkg = doc.createElement("span");
        pkg.className = "carmar-hover-pkg";
        pkg.textContent = String(info.package);
        head.appendChild(pkg);
      }
      p.appendChild(head);
      add("carmar-hover-detail", info.detail);
      add("carmar-hover-title", info.title);
      add("carmar-hover-desc", info.description);
      add("carmar-hover-more", "F1 for the full help page");
      if (p.childElementCount === 1 && !info.signature && !info.detail) {
        hide();
        return;
      }
      p.hidden = false;
      place(p, span);
    }
    function place(p, span) {
      const r = span.getBoundingClientRect();
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const left = Math.min(Math.max(r.left, 8), win.innerWidth - w - 8);
      let top = r.top - h - 8;
      if (top < 8) top = r.bottom + 8;
      p.style.left = `${Math.round(left)}px`;
      p.style.top = `${Math.round(top)}px`;
    }
    return {
      dispose: () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
        hide();
      }
    };
  }
  function hoverPopup(doc) {
    let p = doc.__carmarHover;
    if (p && p.isConnected) return p;
    p = doc.createElement("div");
    p.className = "carmar-hover";
    p.hidden = true;
    (doc.querySelector(".cn-root") || doc.body).appendChild(p);
    doc.__carmarHover = p;
    return p;
  }

  // lib/chunk-meta.js
  function setChunkMeta(formEl, meta) {
    if (!formEl) return;
    formEl._carmarChunk = meta || null;
    paintBadge(formEl, meta || null);
    const View = formEl.ownerDocument && formEl.ownerDocument.defaultView;
    if (View && typeof View.CustomEvent === "function") {
      formEl.dispatchEvent(new View.CustomEvent("carmar:chunk-meta", {
        detail: { meta: formEl._carmarChunk }
      }));
    }
  }
  function chunkMeta(formEl) {
    return formEl && formEl._carmarChunk || null;
  }
  function updateChunkOption(formEl, key, value) {
    const current = chunkMeta(formEl) || {
      engine: "r",
      label: null,
      options: {},
      rawOptions: null,
      hashPipeRaw: []
    };
    const next = {
      ...current,
      options: { ...current.options || {}, [key]: value },
      // An edited option becomes authoritative over imported raw metadata.
      rawOptions: null,
      hashPipeRaw: []
    };
    setChunkMeta(formEl, next);
    return next;
  }
  function skipReason(meta) {
    if (!meta) return "";
    if ((meta.engine || "r") !== "r") return `${meta.engine} chunk \u2014 shown, not run`;
    if (meta.options && meta.options.eval === false) return "eval: FALSE \u2014 shown, not run";
    return "";
  }
  function paintBadge(formEl, meta) {
    const attempt = () => {
      const cellEl = formEl.closest && formEl.closest(".cell");
      if (!cellEl) return false;
      const host = cellEl.querySelector(".carmar-editor-foot") || cellEl;
      let badge = cellEl.querySelector(".carmar-chunk-badge");
      const reason = skipReason(meta);
      if (!reason) {
        if (badge) badge.remove();
        cellEl.classList.remove("carmar-noexec");
        return true;
      }
      if (!badge) {
        badge = formEl.ownerDocument.createElement("span");
        badge.className = "carmar-chunk-badge";
        host.appendChild(badge);
      }
      badge.textContent = reason;
      cellEl.classList.add("carmar-noexec");
      return true;
    };
    if (attempt()) return;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        if (!attempt()) setTimeout(attempt, 250);
      });
    } else {
      setTimeout(attempt, 250);
    }
  }

  // lib/code-editor.js
  var round1 = (n) => Math.round(Number(n) * 10) / 10;
  var MIN_ROWS = 3;
  var AC_DEBOUNCE = 100;
  function mountCodeEditor(mountEl, opts = {}) {
    const doc = mountEl.ownerDocument || document;
    const el = (tag, cls) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      return n;
    };
    const root = el("div", "carmar-editor");
    const bar = el("div", "carmar-editor-bar");
    bar.hidden = true;
    const exec = el("span", "carmar-exec");
    exec.textContent = "[ ]";
    exec.title = "Execution count \u2014 the order cells actually ran in";
    const runBtns = [];
    const stopBtns = [];
    const makeRun = () => {
      const b = el("button", "carmar-run");
      b.type = "button";
      b.innerHTML = '<span class="carmar-run-glyph">\u25B6</span> Run';
      runBtns.push(b);
      return b;
    };
    const makeStop = () => {
      const b = el("button", "carmar-stop");
      b.type = "button";
      b.innerHTML = '<span class="carmar-stop-glyph">\u25FC</span> Stop';
      b.title = "Interrupt R \u2014 the session keeps its variables";
      b.hidden = true;
      b.addEventListener("click", () => {
        if (opts.onStop) opts.onStop();
      });
      stopBtns.push(b);
      return b;
    };
    const topStop = makeStop();
    const runningLabel = el("span", "carmar-running-label");
    runningLabel.textContent = "Running\u2026";
    const hintText = navigator.platform.startsWith("Mac") ? "\u2325\u21B5" : "Alt+\u21B5";
    const status = el("span", "carmar-editor-status");
    const gear = el("button", "carmar-gear");
    gear.type = "button";
    gear.textContent = "\u2699";
    gear.title = "Chunk options and figure size";
    const dimsRow = el("div", "carmar-dims");
    dimsRow.hidden = true;
    const formEl = mountEl.closest(".cell-form") || mountEl.parentElement;
    const chunkOptions = el("div", "carmar-chunk-options");
    const evalLabel = el("label", "carmar-chunk-option");
    const evalInput = el("input", "carmar-chunk-option-input");
    evalInput.type = "checkbox";
    const evalCopy = el("span", "carmar-chunk-option-copy");
    const evalTitle = el("span", "carmar-chunk-option-title");
    evalTitle.textContent = "Evaluate this chunk";
    const evalHint = el("span", "carmar-chunk-option-hint");
    evalHint.textContent = "Allow Run, Run Above, and Run All";
    evalCopy.append(evalTitle, evalHint);
    evalLabel.append(evalInput, evalCopy);
    chunkOptions.appendChild(evalLabel);
    dimsRow.appendChild(chunkOptions);
    const syncChunkOption = (meta = chunkMeta(formEl)) => {
      const engine = meta && meta.engine || "r";
      evalInput.disabled = engine !== "r";
      evalInput.checked = engine === "r" && (!meta || !meta.options || meta.options.eval !== false);
      evalHint.textContent = engine === "r" ? "Allow Run, Run Above, and Run All" : `${engine} chunks are displayed without R evaluation`;
    };
    if (formEl) {
      formEl.addEventListener("carmar:chunk-meta", (event) => {
        syncChunkOption(event.detail && event.detail.meta);
      });
    }
    const num = (label, value, min, max, title) => {
      const wrap = el("label", "carmar-dim");
      const span = el("span", null);
      span.textContent = label;
      const input = el("input", null);
      input.type = "number";
      input.value = String(value);
      input.min = String(min);
      input.max = String(max);
      input.step = label === "dpi" ? "6" : "10";
      input.title = title;
      wrap.append(span, input);
      dimsRow.appendChild(wrap);
      return input;
    };
    const dpr = typeof window !== "undefined" && window.devicePixelRatio || 1;
    const startDpi = opts.dims?.res || Math.round(96 * dpr);
    const startW = opts.dims?.width ? opts.dims.width / startDpi : 7;
    const startH = opts.dims?.height ? opts.dims.height / startDpi : 4.8;
    const wIn = num("w in", round1(startW), 1, 40, "Figure width in inches");
    const hIn = num("h in", round1(startH), 1, 40, "Figure height in inches");
    const rIn = num(
      "dpi",
      startDpi,
      48,
      600,
      "Dots per inch \u2014 raises the pixel count, so the figure gets sharper"
    );
    const inches = el("span", "carmar-dim-inches");
    dimsRow.appendChild(inches);
    const SIZE_PRESETS = [
      ["Small", 5, 3.5],
      ["Default", 7, 4.8],
      ["Large", 9, 6],
      ["Wide", 10, 4],
      ["Square", 6, 6]
    ];
    const DPI_PRESETS = [["Screen", 96], ["Retina", 192], ["Print", 300]];
    const chipsRow = el("div", "carmar-dim-chips");
    const chips = [];
    const chip = (label, title, apply, matches) => {
      const b = el("button", "carmar-chip");
      b.type = "button";
      b.textContent = label;
      b.title = title;
      b.addEventListener("click", () => {
        apply();
        afterDimsInput();
      });
      chips.push({ b, matches });
      chipsRow.appendChild(b);
      return b;
    };
    SIZE_PRESETS.forEach(([label, w, h]) => chip(
      label,
      `${w} \xD7 ${h} inches`,
      () => {
        wIn.value = String(w);
        hIn.value = String(h);
      },
      () => round1(wIn.value) === w && round1(hIn.value) === h
    ));
    chipsRow.appendChild(el("span", "carmar-chip-gap"));
    DPI_PRESETS.forEach(([label, dpi]) => chip(
      label,
      `${dpi} dpi`,
      () => {
        rIn.value = String(dpi);
      },
      () => Math.round(Number(rIn.value)) === dpi
    ));
    let vector = false;
    chipsRow.appendChild(el("span", "carmar-chip-gap"));
    const vectorChip = chip(
      "Vector",
      "SVG \u2014 sharp at any zoom, and the resolution stops mattering. Needs the svglite package in R.",
      () => {
        vector = !vector;
      },
      () => vector
    );
    dimsRow.insertBefore(chipsRow, dimsRow.firstChild);
    const paintChips = () => {
      chips.forEach((c) => c.b.classList.toggle("active", !!c.matches()));
      chipsRow.classList.toggle("is-vector", vector);
      rIn.disabled = vector;
      vectorChip.setAttribute("aria-pressed", String(vector));
    };
    const readDims = () => {
      const res = Math.round(Number(rIn.value)) || 96;
      return {
        // Pixels stay in the payload even for vector: the worker divides them
        // back by `res` to get the inches a vector device wants, and the client
        // still needs a box to reserve before the image decodes.
        width: Math.max(Math.round((Number(wIn.value) || 7) * res), 120),
        height: Math.max(Math.round((Number(hIn.value) || 4.8) * res), 120),
        res,
        ...vector ? { format: "svg" } : {}
      };
    };
    const showInches = () => {
      const d = readDims();
      inches.textContent = d.format === "svg" ? `= ${round1(d.width / d.res)} \xD7 ${round1(d.height / d.res)} in, vector` : `= ${d.width} \xD7 ${d.height} px`;
    };
    function afterDimsInput() {
      showInches();
      paintChips();
      if (opts.onDims) opts.onDims(readDims());
    }
    [wIn, hIn, rIn].forEach((input) => input.addEventListener("input", afterDimsInput));
    showInches();
    paintChips();
    gear.addEventListener("click", () => {
      dimsRow.hidden = !dimsRow.hidden;
    });
    bar.append(runningLabel, topStop);
    const surface = mountEditSurface(root, {
      value: opts.value || "",
      profile: "chunk",
      minRows: MIN_ROWS,
      autoGrow: true,
      onChange: (v) => {
        if (opts.onChange) opts.onChange(v);
        ac.schedule();
      },
      onLineCount: () => {
        const EventCtor = doc.defaultView?.CustomEvent || CustomEvent;
        doc.dispatchEvent(new EventCtor("carmar:code-lines"));
      },
      onRun: () => {
        ac.hide();
        runNow();
      },
      // Tab asks R for completions when there is something to complete — the
      // surface decides "is this a completable spot", the editor owns the popup.
      onTabComplete: () => {
        ac.trigger(true);
        return true;
      },
      onHelp: (topic) => {
        if (opts.onHelp) opts.onHelp(topic);
      },
      // The completion popup owns the arrows, Enter/Tab and Escape while it is
      // open — and only then. Returning true means "this key is spoken for".
      onKeyDown: (e) => {
        if (e.altKey && (e.metaKey || e.ctrlKey) && (e.key === "p" || e.key === "P" || e.code === "KeyP")) {
          e.preventDefault();
          runAbove.click();
          return true;
        }
        return handleAutocompleteKey(ac, e);
      }
    });
    const ta = surface.textarea;
    ta.dataset.field = "source";
    const sync = surface.sync;
    const foot = el("div", "carmar-editor-foot");
    const footHint = el("span", "carmar-hint");
    footHint.textContent = hintText;
    const runAbove = el("button", "carmar-runabove");
    runAbove.type = "button";
    runAbove.innerHTML = '<span class="carmar-run-glyph">\u21CA</span> Run above';
    runAbove.title = navigator.platform.startsWith("Mac") ? "Run every cell above this one, in order (\u2318\u2325P)" : "Run every cell above this one, in order (Ctrl+Alt+P)";
    runAbove.addEventListener("click", () => {
      const cellEl = mountEl.closest && mountEl.closest(".cell");
      if (cellEl) document.dispatchEvent(new CustomEvent(
        "carmar:run-above",
        { detail: { cellId: cellEl.id } }
      ));
    });
    const aboveState = (label, busy) => {
      runAbove.innerHTML = busy ? `<span class="carmar-spinner"></span> ${label}` : `<span class="carmar-run-glyph">\u21CA</span> ${label}`;
      runAbove.disabled = !!busy;
    };
    document.addEventListener("carmar:running-above", (e) => {
      const cellEl = mountEl.closest && mountEl.closest(".cell");
      if (!cellEl || !e.detail || e.detail.cellId !== cellEl.id) return;
      aboveState(`Running ${e.detail.done + 1} of ${e.detail.total}\u2026`, true);
    });
    document.addEventListener("carmar:ran-above", (e) => {
      const cellEl = mountEl.closest && mountEl.closest(".cell");
      if (!cellEl || !e.detail || e.detail.cellId !== cellEl.id) return;
      aboveState("Run above", false);
      if (!e.detail.count) status.textContent = "There are no cells above this one.";
      else status.textContent = `Ran ${e.detail.count} cell${e.detail.count > 1 ? "s" : ""} above.`;
    });
    foot.append(exec, makeRun(), runAbove, makeStop(), footHint, status, gear);
    root.insertBefore(bar, surface.body);
    root.appendChild(dimsRow);
    root.appendChild(foot);
    mountEl.appendChild(root);
    evalInput.addEventListener("change", () => {
      const next = updateChunkOption(formEl, "eval", evalInput.checked);
      syncChunkOption(next);
      const View = mountEl.ownerDocument.defaultView || window;
      surface.textarea.dispatchEvent(new View.Event("input", { bubbles: true }));
      const cell = formEl && formEl.closest(".carmar-cell");
      const chip2 = formEl && formEl._carmarChip || cell && cell._carmarChip;
      if (evalInput.checked && chip2 && chip2.state && chip2.state() === "skipped") chip2.clear();
    });
    syncChunkOption();
    ta.addEventListener("blur", () => ac.hide());
    let pendingSelection = null;
    const runNow = () => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = s !== e ? ta.value.slice(s, e) : "";
      pendingSelection = sel.trim() ? sel : null;
      if (opts.onRun) opts.onRun();
    };
    const paintRunLabel = () => {
      const hasSel = ta.selectionStart !== ta.selectionEnd;
      const want = hasSel ? '<span class="carmar-run-glyph">\u25B6</span> Run selection' : '<span class="carmar-run-glyph">\u25B6</span> Run';
      runBtns.forEach((b) => {
        if (b.disabled) return;
        if (b.innerHTML !== want) b.innerHTML = want;
        b.title = hasSel ? "Run only the highlighted lines" : "Run this chunk";
      });
    };
    ["select", "keyup", "mouseup", "focus"].forEach((evt) => ta.addEventListener(evt, paintRunLabel));
    runBtns.forEach((b) => b.addEventListener("click", runNow));
    const ac = createAutocomplete(ta, {
      provider: opts.complete || null,
      // Declared BEFORE the splice lands: the accept enters the adapter's undo
      // history as ONE labelled step (contract: one accepted completion = one ⌘Z).
      onWillAccept: () => {
        if (surface.adapter) surface.adapter.noteOrigin({ source: "api", label: "Accept completion" });
      },
      onAccepted: () => {
        sync();
        if (opts.onChange) opts.onChange(ta.value);
      }
    });
    if (surface.adapter) surface.adapter.bindCompletion(ac);
    if (opts.hover) attachHoverHelp(ta, { provider: opts.hover });
    const sig = opts.signature ? attachSignatureHelp(ta, {
      provider: opts.signature,
      suppressed: () => ac.visible()
    }) : null;
    sync();
    let lastExec = "[ ]";
    const api = {
      el: root,
      /** The EditorAdapter over this chunk's surface (stage-0-editor-adapter.md). */
      adapter: surface.adapter,
      getValue: () => ta.value,
      // Through the surface, not `ta.value =`: the assignment is then a DECLARED
      // programmatic transaction — one labelled undo step, origin "api".
      setValue: (v) => surface.setValue(v),
      focus: () => ta.focus(),
      /** Busy state lives on the run control, where the user's attention is.
       *  Run NEVER hides while busy: a hidden flex item gives up its space, so
       *  "Run above" used to slide into the exact spot the pointer was resting
       *  on — and the impatient second click every user makes silently re-ran
       *  the whole notebook above (then sat disabled through it: the reported
       *  "I click 3–7 times before it runs"). Run morphs in place instead —
       *  disabled, spinner, self-explaining — and Stop appears BESIDE it, so a
       *  deliberate interrupt is a new target, never the pixel just vacated. */
      setBusy: (busy) => {
        const canStop = typeof opts.onStop === "function";
        runBtns.forEach((b) => {
          b.disabled = !!busy;
          b.innerHTML = busy ? '<span class="carmar-spinner"></span> Running' : '<span class="carmar-run-glyph">\u25B6</span> Run';
          b.title = busy ? "R is running this chunk \u2014 Stop interrupts it" : "Run this chunk";
        });
        stopBtns.forEach((b) => {
          b.hidden = !busy || !canStop;
        });
        bar.hidden = !busy || !canStop;
        if (busy) exec.textContent = "[*]";
        if (!busy && exec.textContent === "[*]") exec.textContent = lastExec;
        if (!busy) paintRunLabel();
        root.classList.toggle("is-busy", !!busy);
      },
      /** `[3]` like a notebook, `[*]` while running. */
      setExec: (n) => {
        lastExec = n == null ? "[ ]" : `[${n}]`;
        exec.textContent = lastExec;
      },
      /** The selection captured by the LAST run gesture — consume-once, so a
       *  later Run All never replays a stale selection. */
      takeRunSelection: () => {
        const sel = pendingSelection;
        pendingSelection = null;
        return sel;
      },
      /** Why Run is unavailable — e.g. "Starting R…". */
      /** The cell's current device size, so the runner can send it. */
      getDims: readDims,
      setDims: (d) => {
        if (!d) return;
        const res = d.res || Number(rIn.value) || 96;
        if (d.res) rIn.value = String(res);
        if (d.width) wIn.value = String(round1(d.width / res));
        if (d.height) hIn.value = String(round1(d.height / res));
        showInches();
        dimsRow.hidden = false;
      },
      setStatus: (text) => {
        status.textContent = text || "";
        status.style.display = text ? "" : "none";
      }
    };
    root._carmarApi = api;
    return api;
  }
  function createAutocomplete(ta, cfg) {
    const doc = ta.ownerDocument || document;
    let seq = 0;
    let inFlight = false;
    let rerunAfterFlight = false;
    let timer = null;
    let ctx = null;
    let index = 0;
    let scrollHider = null;
    const pop = () => acPopup(doc);
    const visible = () => {
      const p = doc.__carmarAC;
      return !!p && !p.hidden && ctx != null;
    };
    function hide() {
      if (ctx == null) return;
      ctx = null;
      const p = doc.__carmarAC;
      if (p) p.hidden = true;
      if (scrollHider) {
        doc.defaultView.removeEventListener("scroll", scrollHider, true);
        scrollHider = null;
      }
    }
    function schedule() {
      if (!cfg.provider) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => trigger(false), AC_DEBOUNCE);
    }
    function lineAtCaret() {
      const pos = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", pos - 1) + 1;
      let lineEnd = ta.value.indexOf("\n", pos);
      if (lineEnd === -1) lineEnd = ta.value.length;
      return { pos, lineStart, line: ta.value.slice(lineStart, lineEnd), cursor: pos - lineStart };
    }
    function trigger(explicit) {
      if (!cfg.provider) return;
      if (inFlight && !explicit) {
        rerunAfterFlight = true;
        return;
      }
      if (inFlight && explicit) {
        seq += 1;
        inFlight = false;
      }
      if (explicit && timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (ta.selectionStart !== ta.selectionEnd) {
        hide();
        return;
      }
      const at = lineAtCaret();
      if (!explicit) {
        const tail = at.line.slice(0, at.cursor);
        const token = (tail.match(/[A-Za-z0-9._]+$/) || [""])[0];
        const afterAccessor = /(\$|@|::)$/.test(tail);
        if (!afterAccessor && token.length < 2) {
          hide();
          return;
        }
      }
      inFlight = true;
      rerunAfterFlight = false;
      const id = ++seq;
      Promise.resolve(cfg.provider(at.line, at.cursor)).then((reply) => {
        if (id !== seq) return;
        inFlight = false;
        const rerun = rerunAfterFlight;
        rerunAfterFlight = false;
        if (rerun) {
          trigger(false);
        }
        if (rerun) return;
        if (!reply || reply.error) {
          hide();
          return;
        }
        const now = lineAtCaret();
        if (now.lineStart !== at.lineStart || now.line !== at.line || now.cursor !== at.cursor) return;
        const items = Array.isArray(reply.items) ? reply.items : reply.items ? [reply.items] : [];
        if (!items.length) {
          hide();
          return;
        }
        show(reply, items, at);
      }).catch(() => {
        if (id !== seq) return;
        inFlight = false;
        const rerun = rerunAfterFlight;
        rerunAfterFlight = false;
        if (rerun) trigger(false);
      });
    }
    function show(reply, items, at) {
      ctx = { reply, items, lineStart: at.lineStart, line: at.line };
      index = 0;
      const p = pop();
      p.replaceChildren();
      items.forEach((item, i) => {
        const row = doc.createElement("div");
        row.className = "carmar-ac-row";
        row.appendChild(typeBadge(doc, String(item.kind || ""), "carmar-th-badge"));
        const val = doc.createElement("span");
        val.className = "carmar-ac-value";
        val.textContent = String(item.value);
        row.appendChild(val);
        const det = doc.createElement("span");
        det.className = "carmar-ac-detail";
        det.textContent = String(item.detail || "");
        det.title = String(item.detail || "");
        row.appendChild(det);
        row.addEventListener("mousedown", (e) => e.preventDefault());
        row.addEventListener("click", () => {
          index = i;
          accept();
        });
        p.appendChild(row);
      });
      if (reply.truncated) {
        const more = doc.createElement("div");
        more.className = "carmar-ac-more";
        more.textContent = "\u2026";
        more.title = "More matches than shown \u2014 keep typing to narrow";
        p.appendChild(more);
      }
      p.hidden = false;
      paint();
      place(p);
      scrollHider = (e) => {
        if (!p.contains(e.target)) hide();
      };
      doc.defaultView.addEventListener("scroll", scrollHider, true);
    }
    function place(p) {
      const win = doc.defaultView;
      const c = caretViewportXY(ta);
      const w = Math.min(p.offsetWidth || 300, 400);
      const left = Math.min(Math.max(c.x, 8), win.innerWidth - w - 8);
      let top = c.y + c.lineH + 4;
      const h = p.offsetHeight;
      if (top + h > win.innerHeight - 8) top = Math.max(c.y - h - 4, 8);
      p.style.left = `${Math.round(left)}px`;
      p.style.top = `${Math.round(top)}px`;
    }
    function paint() {
      const p = doc.__carmarAC;
      if (!p) return;
      [...p.querySelectorAll(".carmar-ac-row")].forEach((r, i) => {
        r.classList.toggle("active", i === index);
        if (i === index) r.scrollIntoView({ block: "nearest" });
      });
    }
    function move(delta) {
      if (!ctx) return;
      index = (index + delta + ctx.items.length) % ctx.items.length;
      paint();
    }
    function accept() {
      if (!ctx) return;
      const { reply, items, lineStart, line } = ctx;
      let lineEnd = ta.value.indexOf("\n", lineStart);
      if (lineEnd === -1) lineEnd = ta.value.length;
      if (ta.value.slice(lineStart, lineEnd) !== line) {
        hide();
        return;
      }
      const item = items[index];
      if (!item) {
        hide();
        return;
      }
      const from = lineStart + (Number(reply.start) || 0);
      const to = lineStart + (Number(reply.end) || 0);
      let text = String(item.value);
      let caret = text.length;
      if (item.kind === "function") {
        text += "()";
        caret = text.length - 1;
      } else if (item.kind === "argument") {
        text += " = ";
        caret = text.length;
      }
      if (cfg.onWillAccept) cfg.onWillAccept();
      ta.value = ta.value.slice(0, from) + text + ta.value.slice(to);
      ta.selectionStart = ta.selectionEnd = from + caret;
      hide();
      if (cfg.onAccepted) cfg.onAccepted();
      ta.focus();
    }
    return { schedule, trigger, hide, visible, move, accept };
  }
  function handleAutocompleteKey(ac, e) {
    if (!ac) return false;
    if (e.ctrlKey && (e.key === " " || e.code === "Space")) {
      e.preventDefault();
      ac.trigger(true);
      return true;
    }
    if (!ac.visible()) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      ac.move(1);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      ac.move(-1);
      return true;
    }
    if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
      e.preventDefault();
      ac.accept();
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      ac.hide();
      return true;
    }
    return false;
  }
  function acPopup(doc) {
    let p = doc.__carmarAC;
    if (p && p.isConnected) return p;
    p = doc.createElement("div");
    p.className = "carmar-ac";
    p.hidden = true;
    (doc.querySelector(".cn-root") || doc.body).appendChild(p);
    doc.__carmarAC = p;
    return p;
  }
  function caretViewportXY(ta, offset) {
    const doc = ta.ownerDocument || document;
    let mirror = ta._carmarMirror;
    if (!mirror || !mirror.isConnected) {
      mirror = doc.createElement("div");
      const cs = getComputedStyle(ta);
      [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "lineHeight",
        "letterSpacing",
        "tabSize",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "borderTopWidth",
        "borderLeftWidth",
        "boxSizing"
      ].forEach((prop) => {
        mirror.style[prop] = cs[prop];
      });
      mirror.style.position = "absolute";
      mirror.style.visibility = "hidden";
      mirror.style.whiteSpace = "pre";
      mirror.style.left = "-9999px";
      mirror.style.top = "0";
      (ta.parentNode || doc.body).appendChild(mirror);
      ta._carmarMirror = mirror;
    }
    mirror.textContent = ta.value.slice(0, offset == null ? ta.selectionStart : offset);
    const marker = doc.createElement("span");
    marker.textContent = "\u200B";
    mirror.appendChild(marker);
    const m = marker.getBoundingClientRect();
    const mir = mirror.getBoundingClientRect();
    const taRect = ta.getBoundingClientRect();
    return {
      x: taRect.left + (m.left - mir.left) - ta.scrollLeft,
      y: taRect.top + (m.top - mir.top) - ta.scrollTop,
      lineH: m.height || parseFloat(getComputedStyle(ta).lineHeight) || 20
    };
  }

  // lib/data-viewer.js
  var BADGE2 = { numeric: "N", integer: "N", logical: "L", categorical: "C", character: "C", factor: "F" };
  function renderDataView(view, mountEl, ctx) {
    const doc = mountEl.ownerDocument || document;
    const el = (tag, cls) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      return n;
    };
    const root = el("div", "carmar-view");
    if (view.error) {
      root.textContent = `${view.name}: ${view.error}`;
      root.classList.add("carmar-view-error");
      mountEl.appendChild(root);
      return;
    }
    const head = el("div", "carmar-view-head");
    const title = el("span", "carmar-view-name");
    title.textContent = view.name;
    const dims = el("span", "carmar-view-dims");
    dims.textContent = `${fmtInt(view.nrow)} \xD7 ${view.ncol}`;
    head.append(title, dims);
    root.appendChild(head);
    const cols = asRows(view.columns);
    const list = el("div", "carmar-view-vars");
    cols.forEach((c) => {
      const row = el("div", "carmar-var");
      const badge = el("span", "carmar-var-badge");
      badge.textContent = BADGE2[c.kind] || BADGE2[c.class] || "?";
      badge.dataset.kind = c.kind;
      badge.title = c.class;
      const name = el("span", "carmar-var-name");
      name.textContent = c.name;
      const spark = sparkline(doc, c);
      const stat = el("span", "carmar-var-stat");
      stat.textContent = c.stat || "";
      const miss = el("span", "carmar-var-missing");
      const missing = Number(c.missing) || 0;
      if (missing > 0) {
        miss.textContent = `${missing} NA`;
        miss.title = `${(missing / Math.max(Number(c.n) || 1, 1) * 100).toFixed(1)}% missing`;
        miss.classList.add("has-missing");
      }
      row.append(badge, name, spark, stat, miss);
      list.appendChild(row);
    });
    root.appendChild(list);
    const rows = asRows(view.rows);
    if (rows.length && ctx && typeof ctx.table === "function") {
      const grid = el("div", "carmar-view-grid");
      root.appendChild(grid);
      const headers = cols.map((c) => c.name);
      ctx.table(
        { headers, rows: rows.map((r) => headers.map((h) => r[h])) },
        grid,
        { caption: view.shown < view.nrow ? `first ${view.shown} of ${fmtInt(view.nrow)} rows` : `${fmtInt(view.nrow)} rows`, title: view.name }
      );
    }
    mountEl.appendChild(root);
  }
  function sparkline(doc, col) {
    const asL = (x) => x == null ? [] : Array.isArray(x) ? x : [x];
    const bins = asL(col.bins).map(Number).filter((n) => isFinite(n));
    const levels = asL(col.levels);
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "carmar-spark");
    svg.setAttribute("viewBox", "0 0 60 16");
    svg.setAttribute("preserveAspectRatio", "none");
    if (!bins.length) return svg;
    const max = Math.max(...bins, 1);
    const w = 60 / bins.length;
    bins.forEach((v, i) => {
      const h = Math.max(v / max * 14, v > 0 ? 1 : 0);
      const rect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(i * w + 0.4));
      rect.setAttribute("y", String(16 - h));
      rect.setAttribute("width", String(Math.max(w - 0.8, 0.6)));
      rect.setAttribute("height", String(h));
      if (levels[i] != null) {
        const t = doc.createElementNS("http://www.w3.org/2000/svg", "title");
        t.textContent = `${levels[i]}: ${v}`;
        rect.appendChild(t);
      }
      svg.appendChild(rect);
    });
    return svg;
  }
  function asRows(x) {
    if (!x) return [];
    if (Array.isArray(x)) return x;
    const keys = Object.keys(x);
    if (!keys.length) return [];
    const n = Array.isArray(x[keys[0]]) ? x[keys[0]].length : 1;
    return Array.from({ length: n }, (_, i) => {
      const row = {};
      keys.forEach((k) => {
        row[k] = Array.isArray(x[k]) ? x[k][i] : x[k];
      });
      return row;
    });
  }
  var fmtInt = (n) => Number(n).toLocaleString();

  // lib/menu-pop.js
  function popupMenu(anchor, menu, opts = {}) {
    const doc = anchor.ownerDocument || document;
    const win = doc.defaultView || window;
    const gap = opts.gap == null ? 5 : opts.gap;
    let open = false;
    menu.hidden = true;
    menu.classList.add("carmar-pop");
    function host() {
      return doc.querySelector(".cn-root") || doc.body;
    }
    function position() {
      const r = anchor.getBoundingClientRect();
      const w = menu.offsetWidth;
      const h = menu.offsetHeight;
      const below = win.innerHeight - r.bottom;
      const up = below < h + gap && r.top > below;
      const top = up ? Math.max(8, r.top - h - gap) : Math.min(r.bottom + gap, win.innerHeight - h - 8);
      const left = Math.max(8, Math.min(r.left, win.innerWidth - w - 8));
      menu.style.top = `${Math.round(top)}px`;
      menu.style.left = `${Math.round(left)}px`;
      menu.classList.toggle("is-up", up);
    }
    const onDocDown = (e) => {
      if (menu.contains(e.target) || anchor.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const onScroll = () => close();
    function show() {
      if (open) return;
      if (menu.parentElement !== host()) host().appendChild(menu);
      menu.hidden = false;
      open = true;
      position();
      doc.addEventListener("mousedown", onDocDown, true);
      doc.addEventListener("keydown", onKey, true);
      win.addEventListener("scroll", onScroll, true);
      win.addEventListener("resize", onScroll);
    }
    function close() {
      if (!open) return;
      open = false;
      menu.hidden = true;
      doc.removeEventListener("mousedown", onDocDown, true);
      doc.removeEventListener("keydown", onKey, true);
      win.removeEventListener("scroll", onScroll, true);
      win.removeEventListener("resize", onScroll);
    }
    return {
      open: show,
      close,
      isOpen: () => open,
      toggle: () => open ? close() : show(),
      dispose: () => {
        close();
        menu.remove();
      }
    };
  }

  // lib/dialogs.js
  function toast(doc, text, opts = {}) {
    const root = doc.querySelector(".cn-root") || doc.body;
    const box = doc.createElement("div");
    box.className = `carmar-toast${opts.kind === "warn" ? " is-warn" : ""}`;
    box.setAttribute("role", "status");
    const msg = doc.createElement("span");
    msg.className = "carmar-toast-msg";
    msg.textContent = String(text || "");
    const close = doc.createElement("button");
    close.type = "button";
    close.className = "carmar-toast-x";
    close.textContent = "\u2715";
    close.title = "Dismiss";
    const gone = () => {
      clearTimeout(timer);
      box.remove();
    };
    close.addEventListener("click", gone);
    box.append(msg, close);
    root.appendChild(box);
    const timer = setTimeout(gone, opts.ms || 7e3);
    return { close: gone, el: box };
  }
  var R_CHOOSE_FOLDER = [
    "local({",
    '  if (!identical(unname(Sys.info()["sysname"]), "Darwin")) {',
    '    cat("CARMAR_WD_NATIVE:unsupported\\n")',
    "  } else {",
    '    p <- suppressWarnings(tryCatch(system2("osascript",',
    '      c("-e", "activate", "-e", "POSIX path of (choose folder with prompt \\"Set working directory\\")"),',
    "      stdout = TRUE, stderr = TRUE), error = function(e) character(0)))",
    '    st <- if (is.null(attr(p, "status"))) 0 else attr(p, "status")',
    '    txt <- paste(p, collapse = " ")',
    "    if (st == 0 && length(p) >= 1 && nzchar(p[1]) && dir.exists(p[1]))",
    '      cat("CARMAR_WD_NATIVE:", p[1], "\\n", sep = "")',
    '    else if (grepl("-128", txt, fixed = TRUE)) cat("CARMAR_WD_NATIVE:cancelled\\n")',
    '    else cat("CARMAR_WD_NATIVE:unsupported\\n")',
    "  }",
    "})"
  ].join("\n");

  // lib/save-file.js
  var MIME_BY_EXT = {
    png: "image/png",
    svg: "image/svg+xml",
    jpg: "image/jpeg",
    pdf: "application/pdf",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain"
  };
  async function nativeSaveSheet(doc, makeBlob, fileName, opts = {}) {
    const win = doc.defaultView || window;
    const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
    const mime = MIME_BY_EXT[ext] || "application/octet-stream";
    if (typeof win.showSaveFilePicker !== "function") return "unavailable";
    let handle = null;
    try {
      handle = await win.showSaveFilePicker({
        suggestedName: fileName,
        id: opts.id || "carmar-export",
        types: [{ description: `${ext.toUpperCase()} file`, accept: { [mime]: [`.${ext}`] } }]
      });
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
      return "unavailable";
    }
    try {
      const blob = await makeBlob();
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (e) {
      toast(doc, `Could not save ${fileName}: ${e && e.message || e}`, { kind: "warn", ms: 12e3 });
      return "cancelled";
    }
  }
  async function saveBlobFile(doc, makeBlob, fileName, opts = {}) {
    const win = doc.defaultView || window;
    const outcome = await nativeSaveSheet(doc, makeBlob, fileName, opts);
    if (outcome !== "unavailable") return outcome;
    const blob = await makeBlob();
    const url = win.URL.createObjectURL(blob);
    const a = doc.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 1e4);
    toast(doc, `Downloaded ${fileName}.`);
    return "downloaded";
  }

  // lib/md-table.js
  function serializeTable(t) {
    const cols = Math.max(t.header.length, ...t.body.map((r) => r.length), t.aligns.length);
    const cell = (row2, i) => String(row2[i] == null ? "" : row2[i]);
    const width = (i) => Math.max(
      3,
      cell(t.header, i).length,
      ...t.body.map((r) => cell(r, i).length)
    );
    const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));
    const row = (r) => `| ${Array.from({ length: cols }, (_, i) => pad(cell(r, i), width(i))).join(" | ")} |`;
    const sep = () => `|${Array.from({ length: cols }, (_, i) => {
      const a = t.aligns[i] || null;
      const w = width(i) + 2;
      if (a === "center") return `:${"-".repeat(w - 2)}:`;
      if (a === "right") return `${"-".repeat(w - 1)}:`;
      if (a === "left") return `:${"-".repeat(w - 1)}`;
      return "-".repeat(w);
    }).join("|")}|`;
    const out = [row(t.header), sep(), ...t.body.map(row)];
    if (t.caption) out.push("", `: ${t.caption}`);
    return out.join("\n");
  }

  // lib/table-render.js
  var LATEX_CH = {
    "\\": "\\textbackslash{}",
    "&": "\\&",
    "%": "\\%",
    "$": "\\$",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}"
  };
  function latexEscape(s) {
    return String(s == null ? "" : s).replace(/[\\&%$#_{}~^]/g, (ch) => LATEX_CH[ch]);
  }
  function toLatex(m) {
    const cols = (m.aligns && m.aligns.length ? m.aligns : m.header.map(() => null)).map((a) => a === "right" ? "r" : a === "center" ? "c" : "l").join("");
    const row = (cells) => cells.map(latexEscape).join(" & ") + " \\\\";
    const out = ["% needs \\usepackage{booktabs}", "\\begin{table}[t]", "\\centering"];
    if (m.caption) out.push(`\\caption{${latexEscape(m.caption)}}`);
    if (m.label) out.push(`\\label{${m.label.replace(/[^\w:-]/g, "")}}`);
    out.push(
      `\\begin{tabular}{${cols}}`,
      "\\toprule",
      row(m.header),
      "\\midrule",
      ...m.body.map(row),
      "\\bottomrule",
      "\\end{tabular}",
      "\\end{table}"
    );
    return out.join("\n");
  }
  function toMarkdown(m) {
    return serializeTable({
      header: m.header.slice(),
      aligns: m.header.map((_, i) => m.aligns && m.aligns[i] || null),
      body: m.body.map((r) => r.slice()),
      caption: m.caption ? `${m.caption}${m.label ? ` {#${m.label}}` : ""}` : null
    });
  }
  function toRPrint(m) {
    const names = m.body.map((_, i) => String(i + 1));
    const numeric = m.header.map((_, c) => m.body.every((r) => {
      const v = r[c];
      return v == null || v === "" || v === "NA" || Number.isFinite(Number(v));
    }));
    const width = (c) => Math.max(
      String(m.header[c]).length,
      ...m.body.map((r) => String(r[c] == null ? "" : r[c]).length)
    );
    const gutter = Math.max(...names.map((n) => n.length), 1);
    const pad = (s, w, right) => right ? s.padStart(w) : s.padEnd(w);
    const line = (name, cells, headRow) => `${name.padStart(gutter)} ${m.header.map((_, c) => pad(String(cells[c] == null ? "" : cells[c]), width(c), headRow || numeric[c])).join(" ")}`.trimEnd();
    return [
      line("", m.header, true),
      ...m.body.map((r, i) => line(names[i], r, false))
    ].join("\n");
  }
  function pubTable(doc, m, opts = {}) {
    const wrap = doc.createElement("div");
    wrap.className = `carmar-pubwrap${opts.compact ? " is-compact" : ""}`;
    const table = doc.createElement("table");
    table.className = "carmar-pub";
    const alignCls = (i) => {
      const a = m.aligns && m.aligns[i] || null;
      return a === "right" ? "r" : a === "center" ? "c" : "";
    };
    const tr = (cells, tag) => {
      const row = doc.createElement("tr");
      cells.forEach((cell, i) => {
        const td = doc.createElement(tag);
        td.textContent = String(cell == null ? "" : cell);
        const cls = alignCls(i);
        if (cls) td.className = cls;
        row.appendChild(td);
      });
      return row;
    };
    const thead = doc.createElement("thead");
    thead.appendChild(tr(m.header, "th"));
    const tbody = doc.createElement("tbody");
    m.body.forEach((r) => tbody.appendChild(tr(r, "td")));
    table.append(thead, tbody);
    if (m.caption) {
      const cap = doc.createElement("div");
      cap.className = "carmar-pub-caption";
      cap.textContent = m.caption;
      wrap.appendChild(cap);
    }
    wrap.appendChild(table);
    return wrap;
  }
  var TABLE_STYLES = [
    { id: "grid", label: "Grid", hint: "Sortable, filterable \u2014 the working view" },
    { id: "apa", label: "Publication", hint: "APA rules \u2014 top rule, header line, no verticals" },
    { id: "compact", label: "Compact", hint: "Dense statistical results table with publication rules" },
    { id: "print", label: "R console", hint: "What print() would have shown" }
  ];
  var STYLE_KEY = "carmar-table-style-v2";
  function defaultTableStyle() {
    try {
      const v = localStorage.getItem(STYLE_KEY);
      return TABLE_STYLES.some((s) => s.id === v) ? v : "compact";
    } catch (e) {
      return "compact";
    }
  }
  function setDefaultTableStyle(id) {
    try {
      localStorage.setItem(STYLE_KEY, id);
    } catch (e) {
    }
  }

  // lib/output-pane.js
  var ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
  var svgIcon = (paths) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  var ICONS2 = {
    zoomOut: svgIcon('<line x1="5" y1="12" x2="19" y2="12"/>'),
    zoomIn: svgIcon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
    fullscreen: svgIcon('<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>'),
    copy: svgIcon('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    cells: svgIcon('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 3v18"/><rect x="10" y="10" width="11" height="11" fill="currentColor" opacity=".16"/>'),
    table: svgIcon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M15 4v16"/>'),
    columns: svgIcon('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>'),
    code: svgIcon('<polyline points="8 9 4 12 8 15"/><polyline points="16 9 20 12 16 15"/><line x1="14" y1="5" x2="10" y2="19"/>'),
    text: svgIcon('<path d="M5 5h14M8 9h8M6 13h12M9 17h6"/>'),
    download: svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
    more: svgIcon('<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>')
  };
  function renderOutput(result, mountEl, ctx) {
    const doc = mountEl.ownerDocument || document;
    const el = (tag, cls) => {
      const n = doc.createElement(tag);
      if (cls) n.className = cls;
      return n;
    };
    const extensions = [...mountEl.querySelectorAll("[data-carmar-result-extension]")];
    mountEl.replaceChildren(...extensions);
    const consoleEls = [];
    groupConsecutive(result.messages).forEach((g) => consoleEls.push(messageBlock(doc, el, g)));
    if (result.stdout && result.stdout.trim()) {
      const pre = el("pre", "carmar-console");
      pre.textContent = result.stdout;
      consoleEls.push(pre);
    }
    if (result.stderr && result.stderr.trim()) {
      const pre = el("pre", "carmar-console carmar-stderr");
      pre.textContent = result.stderr;
      consoleEls.push(pre);
    }
    const figures = result.plots.map((p, i) => figure(doc, el, p, i, result.plots.length));
    const plotEls = figures.length > 1 ? [plotPager(doc, el, figures)] : figures;
    const tables = result.tables.map((t, i) => pagedTable(doc, el, ctx, t, i, result.tables.length));
    const tableEls = tables.length > 1 ? [tableTabs(doc, el, tables, result.tables)] : tables;
    const viewEls = (result.views || []).map((v) => {
      const mount = el("div", "carmar-view-mount");
      renderDataView(v, mount, ctx);
      return mount;
    });
    const widgetEls = (result.widgets || []).map((w) => {
      const frame = el("iframe", "carmar-widget");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("title", `${w.class || "htmlwidget"}`);
      frame.srcdoc = w.html;
      return frame;
    });
    const lines = (result.stdout || "").trim() ? result.stdout.trim().split("\n").length : 0;
    const groups = [
      { key: "console", label: "Console", count: 0, els: consoleEls },
      { key: "viewer", label: "Viewer", count: widgetEls.length, els: widgetEls },
      { key: "plots", label: "Plots", count: figures.length, els: plotEls },
      { key: "tables", label: "Tables", count: tables.length, els: tableEls },
      { key: "data", label: "Data", count: viewEls.length, els: viewEls }
    ].filter((g) => g.els.length);
    const pane = el("div", "carmar-output");
    if (result.status === "error") {
      pane.appendChild(banner(el, "error", result.message || "Error"));
      const tb = tracebackBlock(doc, el, result.traceback, ctx);
      if (tb) pane.appendChild(tb);
    }
    if (result.status === "interrupted") pane.appendChild(banner(el, "interrupted", "Interrupted \u2014 the session kept its variables."));
    if (!groups.length) {
      if (result.status !== "ok") {
        mountEl.appendChild(outputBar(doc, el, result, pane, mountEl, null));
        mountEl.appendChild(pane);
      }
      return;
    }
    if (groups.length === 1) {
      const bar = outputBar(doc, el, result, pane, mountEl, null);
      if (groups[0].key === "tables" && tables.length === 1) {
        const tableBar = tables[0].querySelector(".carmar-tablebar");
        const summary = bar.querySelector(".carmar-output-summary");
        const clear = bar.querySelector(".carmar-clear");
        if (summary) summary.remove();
        if (tableBar && clear) {
          [...tableBar.children].forEach((control) => bar.insertBefore(control, clear));
          tableBar.remove();
          bar.classList.add("carmar-tablebar", "is-table-result");
        }
      }
      mountEl.appendChild(bar);
      groups[0].els.forEach((n) => pane.appendChild(n));
      mountEl.appendChild(pane);
      return;
    }
    const wraps = /* @__PURE__ */ new Map();
    groups.forEach((g) => {
      const wrap = el("div", "carmar-out-group");
      wrap.dataset.group = g.key;
      g.els.forEach((n) => wrap.appendChild(n));
      wrap.hidden = true;
      pane.appendChild(wrap);
      wraps.set(g.key, wrap);
    });
    const has = (k) => groups.some((g) => g.key === k);
    const initial = result.status !== "ok" && has("console") ? "console" : has("viewer") ? "viewer" : has("plots") ? "plots" : has("tables") ? "tables" : has("data") ? "data" : "console";
    const tabs = groups.map((g) => {
      const b = el("button", "carmar-out-tab");
      b.type = "button";
      b.dataset.group = g.key;
      b.textContent = g.count > 1 ? `${g.label} (${g.count})` : g.label;
      b.title = g.key === "console" && lines ? `Show console \u2014 ${lines} line${lines === 1 ? "" : "s"}` : `Show ${g.label.toLowerCase()}`;
      return b;
    });
    const activate = (key) => {
      wraps.forEach((wrap, k) => {
        wrap.hidden = k !== key;
      });
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.group === key));
    };
    tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.group)));
    activate(initial);
    mountEl.appendChild(outputBar(doc, el, result, pane, mountEl, tabs));
    mountEl.appendChild(pane);
  }
  function outputBar(doc, el, result, pane, mountEl, tabs) {
    const bar = el("div", "carmar-output-bar");
    const fold = el("button", "carmar-fold");
    fold.type = "button";
    fold.setAttribute("aria-expanded", "true");
    fold.innerHTML = '<span class="carmar-caret">\u25BC</span>';
    fold.title = "Fold this result";
    const clear = el("button", "carmar-clear");
    clear.type = "button";
    clear.textContent = "Clear";
    clear.title = "Remove this result \u2014 the session keeps its variables";
    const toggleFold = () => {
      const folded = pane.classList.toggle("folded");
      bar.classList.toggle("is-folded", folded);
      fold.setAttribute("aria-expanded", String(!folded));
      fold.querySelector(".carmar-caret").textContent = folded ? "\u25B6" : "\u25BC";
      fold.title = folded ? "Unfold this result" : "Fold this result";
      const summary = bar.querySelector(".carmar-output-summary");
      if (summary) {
        summary.textContent = folded ? `${describeResult(result)} hidden \u2014 click to show` : describeResult(result);
        summary.title = folded ? "Show this result" : "Fold this result";
      }
    };
    fold.addEventListener("click", toggleFold);
    clear.addEventListener("click", () => {
      const extensions = [...mountEl.querySelectorAll("[data-carmar-result-extension]")];
      mountEl.replaceChildren(...extensions);
    });
    bar.appendChild(fold);
    if (tabs && tabs.length) {
      const strip = el("span", "carmar-out-tabs");
      tabs.forEach((t) => strip.appendChild(t));
      bar.appendChild(strip);
      const sp = el("span", "carmar-output-sp");
      sp.addEventListener("click", toggleFold);
      sp.title = "Fold this result";
      bar.appendChild(sp);
    } else {
      const summary = el("span", "carmar-output-summary");
      summary.textContent = describeResult(result);
      summary.addEventListener("click", toggleFold);
      summary.title = "Fold this result";
      bar.appendChild(summary);
    }
    bar.appendChild(clear);
    return bar;
  }
  function describeResult(result) {
    const bits = [];
    const lines = (result.stdout || "").trim() ? result.stdout.trim().split("\n").length : 0;
    if (lines) bits.push(`${lines} line${lines === 1 ? "" : "s"}`);
    const widgets = (result.widgets || []).length;
    if (widgets) bits.push(`${widgets} widget${widgets === 1 ? "" : "s"}`);
    if (result.plots.length) bits.push(`${result.plots.length} plot${result.plots.length === 1 ? "" : "s"}`);
    if (result.tables.length) bits.push(`${result.tables.length} table${result.tables.length === 1 ? "" : "s"}`);
    if (result.messages.length) bits.push(`${result.messages.length} message${result.messages.length === 1 ? "" : "s"}`);
    const views = (result.views || []).length;
    if (views) bits.push(`${views} view${views === 1 ? "" : "s"}`);
    if (result.status !== "ok") bits.unshift(result.status);
    return bits.length ? bits.join(" \xB7 ") : "no output";
  }
  function tracebackBlock(doc, el, trace, ctx) {
    if (!trace || !trace.frames?.length && trace.line == null) return null;
    const box = el("div", "carmar-traceback");
    const head = el("div", "carmar-traceback-head");
    head.textContent = trace.line != null ? `Failed at line ${trace.line} of this chunk` : "Where it failed";
    if (trace.line != null && ctx && typeof ctx.gotoLine === "function") {
      head.classList.add("is-clickable");
      head.setAttribute("role", "button");
      head.tabIndex = 0;
      const go = () => ctx.gotoLine(trace.line);
      head.addEventListener("click", go);
      head.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    }
    box.appendChild(head);
    (trace.frames || []).forEach((f, i) => {
      const row = el("div", "carmar-traceback-frame");
      const depth = el("span", "carmar-traceback-depth");
      depth.textContent = String(i + 1);
      const call = el("code", "carmar-traceback-call");
      call.textContent = String(f.call || "");
      row.append(depth, call);
      const inChunk = f.file === "<text>" && f.line != null;
      if (inChunk && ctx && typeof ctx.gotoLine === "function") {
        row.classList.add("is-clickable");
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        row.title = `Go to line ${f.line}`;
        const go = () => ctx.gotoLine(f.line);
        row.addEventListener("click", go);
        row.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        });
        row.appendChild(el("span", "carmar-traceback-where")).textContent = `line ${f.line}`;
      } else if (f.file) {
        row.appendChild(el("span", "carmar-traceback-where")).textContent = `${String(f.file).split("/").pop()}${f.line != null ? `:${f.line}` : ""}`;
      }
      box.appendChild(row);
      if (Array.isArray(f.vars) && f.vars.length) {
        const fold = doc.createElement("details");
        fold.className = "carmar-traceback-vars";
        const sum = doc.createElement("summary");
        sum.textContent = `${f.vars.length} local${f.vars.length === 1 ? "" : "s"}`;
        fold.appendChild(sum);
        f.vars.forEach((v) => {
          const vr = el("div", "carmar-traceback-var");
          const nm = el("code", "carmar-traceback-varname");
          nm.textContent = String(v.name);
          const cl = el("span", "carmar-traceback-varclass");
          cl.textContent = String(v.class || "");
          const val = el("code", "carmar-traceback-varvalue");
          val.textContent = String(v.value == null ? "" : v.value);
          vr.append(nm, cl, val);
          fold.appendChild(vr);
        });
        box.appendChild(fold);
      }
    });
    return box;
  }
  function banner(el, kind, text) {
    const b = el("div", `carmar-banner carmar-banner-${kind}`);
    b.textContent = text;
    return b;
  }
  function groupConsecutive(messages) {
    const groups = [];
    (messages || []).forEach((m) => {
      const last = groups[groups.length - 1];
      if (last && last.kind === m.kind) last.texts.push(m.text);
      else groups.push({ kind: m.kind, texts: [m.text] });
    });
    return groups;
  }
  function messageBlock(doc, el, group) {
    const wrap = el("div", `carmar-msgs carmar-msgs-${group.kind}`);
    const pre = el("pre", "carmar-console carmar-msgs-pre");
    pre.textContent = group.texts.map((t) => String(t).replace(/\n$/, "")).join("\n").replace(/^\n+/, "");
    const lines = pre.textContent ? pre.textContent.split("\n").length : 0;
    if (group.kind === "message" && lines >= 3) {
      const count = group.texts.length;
      const label = `${count} message${count === 1 ? "" : "s"}`;
      const toggle = el("button", "carmar-msgs-toggle");
      toggle.type = "button";
      toggle.textContent = `\u25B8 ${label}`;
      toggle.title = "Show these messages";
      pre.hidden = true;
      toggle.addEventListener("click", () => {
        pre.hidden = !pre.hidden;
        toggle.textContent = `${pre.hidden ? "\u25B8" : "\u25BE"} ${label}`;
        toggle.title = pre.hidden ? "Show these messages" : "Hide these messages";
      });
      wrap.append(toggle, pre);
    } else {
      wrap.appendChild(pre);
    }
    return wrap;
  }
  function badgeTableHeaders(doc, mount, columns) {
    const ths = mount.querySelectorAll("thead th");
    if (!ths.length || ths.length !== columns.length) return;
    columns.forEach((c, i) => {
      const kind = headerKind(c.rType || c.type);
      if (kind) ths[i].insertBefore(typeBadge(doc, kind, "carmar-th-badge"), ths[i].firstChild);
    });
  }
  function headerKind(t) {
    if (t === "numeric" || t === "integer" || t === "number") return "numeric";
    if (t === "logical" || t === "boolean") return "logical";
    if (t === "factor") return "factor";
    if (t === "character" || t === "string") return "character";
    return t ? "categorical" : null;
  }
  function plotPager(doc, el, figures) {
    const wrap = el("div", "carmar-plotpager");
    const nav = el("div", "carmar-plotnav");
    let at = 0;
    const arrow = (glyph, title, delta) => {
      const b = el("button", "carmar-plotnav-btn");
      b.type = "button";
      b.textContent = glyph;
      b.title = title;
      b.addEventListener("click", () => {
        at = at + delta;
        paint();
      });
      return b;
    };
    const prev = arrow("\u25C0", "Previous plot", -1);
    const counter = el("span", "carmar-plotnav-count");
    const next = arrow("\u25B6", "Next plot", 1);
    nav.append(prev, counter, next);
    const paint = () => {
      at = Math.max(0, Math.min(figures.length - 1, at));
      figures.forEach((f, i) => {
        f.hidden = i !== at;
      });
      counter.textContent = `${at + 1} / ${figures.length}`;
      prev.disabled = at === 0;
      next.disabled = at === figures.length - 1;
    };
    wrap.appendChild(nav);
    figures.forEach((f) => wrap.appendChild(f));
    paint();
    return wrap;
  }
  function tableTabs(doc, el, mounts, metas) {
    const wrap = el("div", "carmar-tabletabs");
    const nav = el("div", "carmar-tabletabs-nav");
    let at = 0;
    const tabs = mounts.map((_, i) => {
      const b = el("button", "carmar-tabletab");
      b.type = "button";
      b.textContent = String(i + 1);
      const m = metas && metas[i];
      b.title = m ? `Table ${i + 1} \u2014 ${m.nrow} \xD7 ${m.ncol}` : `Table ${i + 1}`;
      b.addEventListener("click", () => {
        at = i;
        paint();
      });
      nav.appendChild(b);
      return b;
    });
    const label = el("span", "carmar-tabletabs-label");
    nav.appendChild(label);
    const paint = () => {
      mounts.forEach((m2, i) => {
        m2.hidden = i !== at;
      });
      tabs.forEach((t, i) => t.classList.toggle("active", i === at));
      const m = metas && metas[at];
      label.textContent = m ? `table ${at + 1} of ${mounts.length} \xB7 ${m.nrow} \xD7 ${m.ncol}` : "";
    };
    wrap.appendChild(nav);
    mounts.forEach((m) => wrap.appendChild(m));
    paint();
    return wrap;
  }
  function pagedTable(doc, el, ctx, t, index, count) {
    const COLS_PER_PAGE = 12;
    const ROWS_PER_PAGE = 25;
    const ROW_CAP = 500;
    const mount = el("div", "carmar-table");
    const pages = Math.max(1, Math.ceil(t.columns.length / COLS_PER_PAGE));
    const allRows = (t.rows || []).slice(0, ROW_CAP);
    const rowsCut = allRows.length < t.nrow;
    let page = 0;
    let rowPage = 0;
    let query = "";
    let sortBy = null;
    let sortDir = 1;
    let selection = null;
    const text = (v) => v == null ? "" : String(v);
    const view = () => {
      let rows = allRows;
      if (query) {
        const q = query.toLowerCase();
        rows = rows.filter((r) => t.columns.some((c) => text(r[c.name]).toLowerCase().includes(q)));
      }
      if (sortBy != null) {
        const numeric = rows.every((r) => {
          const v = r[sortBy];
          return v == null || v === "" || Number.isFinite(Number(v));
        });
        rows = rows.slice().sort((a, b) => {
          const av = a[sortBy];
          const bv = b[sortBy];
          if ((av == null || av === "") && (bv == null || bv === "")) return 0;
          if (av == null || av === "") return 1;
          if (bv == null || bv === "") return -1;
          const d = numeric ? Number(av) - Number(bv) : text(av).localeCompare(text(bv));
          return d * sortDir;
        });
      }
      return rows;
    };
    const quoted = (s) => /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    const delimited = (rows, sep, mapCell, eol) => [
      t.columns.map((c) => mapCell(c.name)).join(sep),
      ...rows.map((r) => t.columns.map((c) => mapCell(text(r[c.name]))).join(sep))
    ].join(eol);
    const asTSV = (rows) => delimited(rows, "	", (s) => s.replace(/[\t\n\r]+/g, " "), "\n");
    const asCSV = (rows, eol) => delimited(rows, ",", quoted, eol);
    const download = (content, mimeType, fileName) => saveBlobFile(doc, () => new Blob([content], { type: mimeType }), fileName, { id: "carmar-tables" });
    const fname = (ext = "csv") => tableFileName(mount.closest(".cell"), index, count, ext);
    const flash = (b, glyph2) => {
      const was = b.innerHTML;
      b.textContent = glyph2;
      b.disabled = true;
      setTimeout(() => {
        b.innerHTML = was;
        b.disabled = false;
      }, 1200);
    };
    const tbtn = (icon2, labelText, title, fn) => {
      const b = el("button", "carmar-figure-btn carmar-tbl-btn");
      b.type = "button";
      b.innerHTML = `${icon2}<span>${labelText}</span>`;
      b.title = title;
      b.setAttribute("aria-label", title);
      b.addEventListener("click", fn);
      return b;
    };
    const bar = el("div", "carmar-tablebar");
    const search = el("input", "carmar-tablesearch");
    search.type = "search";
    search.placeholder = "Filter rows\u2026";
    let debounce = 0;
    search.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        query = search.value.trim();
        rowPage = 0;
        selection = null;
        paint();
      }, 120);
    });
    const note = el("span", "carmar-tablenote");
    const capNote = rowsCut ? ` \u2014 carries ${allRows.length} of ${t.nrow} rows (payload cap)` : "";
    const model = () => {
      const numericish = (ty) => /^(numeric|integer|double|int|dbl)$/i.test(String(ty || ""));
      return {
        header: t.columns.map((c) => c.name),
        aligns: t.columns.map((c) => numericish(c.type) ? "right" : null),
        body: view().map((r) => t.columns.map((c) => text(r[c.name]))),
        caption: null,
        label: null
      };
    };
    const copyText = (b, make) => {
      const win = doc.defaultView;
      if (!win || !win.navigator.clipboard) {
        flash(b, "\u2715");
        return;
      }
      win.navigator.clipboard.writeText(make()).then(() => flash(b, "\u2713"), () => flash(b, "\u2715"));
    };
    const htmlEsc = (value) => text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const subsetTSV = (rows, cols, headers) => [
      ...headers ? [cols.map((c) => text(c.name)).join("	")] : [],
      ...rows.map((r) => cols.map((c) => text(r[c.name]).replace(/[\t\n\r]+/g, " ")).join("	"))
    ].join("\n");
    const subsetHTML = (rows, cols, headers) => `<table>${headers ? `<thead><tr>${cols.map((c) => `<th>${htmlEsc(c.name)}</th>`).join("")}</tr></thead>` : ""}<tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${htmlEsc(r[c.name])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const selectedPayload = () => {
      if (!selection) return { rows: view(), cols: t.columns, headers: true };
      const r0 = Math.min(selection.anchorRow, selection.focusRow);
      const r1 = Math.max(selection.anchorRow, selection.focusRow);
      const c0 = Math.min(selection.anchorCol, selection.focusCol);
      const c1 = Math.max(selection.anchorCol, selection.focusCol);
      return { rows: view().slice(r0, r1 + 1), cols: t.columns.slice(c0, c1 + 1), headers: false };
    };
    const copyRich = (b, payload) => {
      const win = doc.defaultView;
      if (!win || !win.navigator.clipboard) {
        flash(b, "\u2715");
        return;
      }
      const plain = subsetTSV(payload.rows, payload.cols, payload.headers);
      const html = subsetHTML(payload.rows, payload.cols, payload.headers);
      const done = win.navigator.clipboard.write && win.ClipboardItem ? win.navigator.clipboard.write([new win.ClipboardItem({
        "text/plain": new Blob([plain], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" })
      })]) : win.navigator.clipboard.writeText(plain);
      done.then(() => flash(b, "\u2713"), () => flash(b, "\u2715"));
    };
    let style = defaultTableStyle();
    const styleSel = el("select", "carmar-tablestyle");
    styleSel.title = "How this table renders \u2014 the choice becomes the default";
    TABLE_STYLES.forEach((s) => {
      const o = doc.createElement("option");
      o.value = s.id;
      o.textContent = s.label;
      o.title = s.hint;
      styleSel.appendChild(o);
    });
    styleSel.value = style;
    styleSel.addEventListener("change", () => {
      style = styleSel.value;
      setDefaultTableStyle(style);
      paint();
    });
    const navButton = (glyph2, title, fn) => {
      const b = el("button", "carmar-table-navbtn");
      b.type = "button";
      b.textContent = glyph2;
      b.title = title;
      b.addEventListener("click", fn);
      return b;
    };
    const rowNav = el("span", "carmar-table-inline-nav");
    const rowRange = el("span", "carmar-table-navrange");
    const rowPrev = navButton("\u2039", "Previous rows", () => {
      rowPage -= 1;
      selection = null;
      paint();
    });
    const rowNext = navButton("\u203A", "Next rows", () => {
      rowPage += 1;
      selection = null;
      paint();
    });
    rowNav.append(rowPrev, rowRange, rowNext);
    const colNav = el("span", "carmar-table-inline-nav");
    const colRange = el("span", "carmar-table-navrange");
    const colPrev = navButton("\u2039", "Previous columns", () => {
      page -= 1;
      selection = null;
      paint();
    });
    const colNext = navButton("\u203A", "Next columns", () => {
      page += 1;
      selection = null;
      paint();
    });
    colNav.append(colPrev, colRange, colNext);
    const glyph = (value) => `<span class="carmar-tbl-glyph" aria-hidden="true">${value}</span>`;
    const tableDocument = (title) => `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEsc(title)}</title><style>body{font-family:Georgia,'Times New Roman',serif;padding:24px;color:#1a1f1c}table{width:100%;border-collapse:collapse;font-size:11px;border-top:2px solid #222}th{text-align:left;padding:4px 8px;border-bottom:1px solid #555}td{padding:3px 8px;border-bottom:1px solid #ddd}tr:last-child td{border-bottom:2px solid #222}</style></head><body>` + subsetHTML(view(), t.columns, true) + "</body></html>";
    const openPrint = (title) => {
      const win = doc.defaultView && doc.defaultView.open("", "_blank", "width=900,height=700");
      if (!win) return;
      win.document.write(tableDocument(title));
      win.document.close();
      win.focus();
      win.print();
    };
    const csvBtn = tbtn(glyph("\u2913"), "CSV", `Download the shown preview as CSV${capNote}`, () => download(asCSV(view(), "\n"), "text/csv;charset=utf-8", fname("csv")));
    const copyBtn = tbtn(ICONS2.copy, "Copy", "Copy selected grid cells, or the shown preview, as a formatted table", () => copyRich(copyBtn, selectedPayload()));
    const codeBtn = tbtn(
      ICONS2.code,
      "Code \u25BE",
      `Copy the shown preview as LaTeX, Markdown, or R console text${capNote}`,
      () => codePop.toggle()
    );
    const codeMenu = el("div", "carmar-md-hmenu");
    [
      ["Copy as LaTeX (booktabs)", () => toLatex(model())],
      ["Copy as Markdown", () => toMarkdown(model())],
      ["Copy as R console text", () => toRPrint(model())]
    ].forEach(([labelText, make]) => {
      const item = el("button", "carmar-pop-item");
      item.type = "button";
      item.textContent = labelText;
      item.addEventListener("click", () => {
        codePop.close();
        copyText(codeBtn, make);
      });
      codeMenu.appendChild(item);
    });
    const codePop = popupMenu(codeBtn, codeMenu);
    const docBtn = tbtn(glyph("\u{1F5B9}"), "Doc", "Download the shown preview as a Word-compatible document", () => download("\uFEFF" + tableDocument("CarmaR table"), "application/msword", fname("doc")));
    const pdfBtn = tbtn(glyph("\u{1F5BA}"), "PDF", "Open the print dialog to save the shown preview as PDF", () => openPrint("Save table as PDF"));
    const printBtn = tbtn(glyph("\u2399"), "Print", "Print the shown preview", () => openPrint("Print table"));
    bar.append(
      search,
      note,
      rowNav,
      colNav,
      csvBtn,
      copyBtn,
      codeBtn,
      docBtn,
      pdfBtn,
      printBtn,
      styleSel
    );
    mount.appendChild(bar);
    const body = el("div");
    mount.appendChild(body);
    const paint = () => {
      body.replaceChildren();
      const allViewRows = view();
      note.textContent = query ? `${allViewRows.length} match \xB7 preview ${allRows.length} of ${t.nrow} \xD7 ${t.ncol}` : rowsCut ? `Preview ${allRows.length} of ${t.nrow} \xD7 ${t.ncol}` : `${t.nrow} \xD7 ${t.ncol}`;
      rowNav.hidden = true;
      colNav.hidden = true;
      if (style === "apa" || style === "compact") {
        body.appendChild(pubTable(doc, { ...model(), caption: null }, { compact: style === "compact" }));
        return;
      }
      if (style === "print") {
        const pre = el("pre", "carmar-console carmar-table-print");
        pre.textContent = toRPrint(model());
        body.appendChild(pre);
        return;
      }
      const rows = allViewRows;
      const rowPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
      rowPage = Math.max(0, Math.min(rowPage, rowPages - 1));
      const rowFrom = rowPage * ROWS_PER_PAGE;
      const shownRows = rows.slice(rowFrom, rowFrom + ROWS_PER_PAGE);
      const from = page * COLS_PER_PAGE;
      const shownCols = t.columns.slice(from, from + COLS_PER_PAGE);
      rowNav.hidden = rowPages <= 1;
      rowRange.textContent = `${rowFrom + 1}\u2013${rowFrom + shownRows.length} / ${rows.length}`;
      rowPrev.disabled = rowPage === 0;
      rowNext.disabled = rowPage === rowPages - 1;
      colNav.hidden = pages <= 1;
      colRange.textContent = `${from + 1}\u2013${from + shownCols.length} / ${t.ncol}`;
      colPrev.disabled = page === 0;
      colNext.disabled = page === pages - 1;
      const grid = el("div", "carmar-result-grid-wrap");
      const table = el("table", "carmar-result-grid");
      table.tabIndex = 0;
      const thead = el("thead");
      const headerRow = el("tr");
      shownCols.forEach((c) => {
        const th = el("th");
        th.textContent = text(c.name);
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      const tbody = el("tbody");
      shownRows.forEach((r, ri) => {
        const tr = el("tr");
        shownCols.forEach((c, ci) => {
          const td = el("td");
          td.textContent = text(r[c.name]);
          td.dataset.row = String(rowFrom + ri);
          td.dataset.col = String(from + ci);
          if (/^(numeric|integer|double|int|dbl)$/i.test(String(c.type || ""))) td.classList.add("is-num");
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.append(thead, tbody);
      grid.appendChild(table);
      badgeTableHeaders(doc, grid, shownCols);
      Array.from(grid.querySelectorAll("thead th")).forEach((th, i) => {
        const col = shownCols[i];
        if (!col) return;
        th.classList.add("carmar-th-sort");
        if (sortBy === col.name) th.dataset.sort = sortDir === 1 ? "asc" : "desc";
        th.addEventListener("click", () => {
          if (sortBy === col.name) {
            if (sortDir === 1) sortDir = -1;
            else {
              sortBy = null;
              sortDir = 1;
            }
          } else {
            sortBy = col.name;
            sortDir = 1;
          }
          rowPage = 0;
          selection = null;
          paint();
        });
      });
      const paintSelection = () => {
        grid.querySelectorAll("td[data-row]").forEach((td) => {
          if (!selection) {
            td.classList.remove("is-selected");
            return;
          }
          const r = Number(td.dataset.row);
          const c = Number(td.dataset.col);
          const r0 = Math.min(selection.anchorRow, selection.focusRow);
          const r1 = Math.max(selection.anchorRow, selection.focusRow);
          const c0 = Math.min(selection.anchorCol, selection.focusCol);
          const c1 = Math.max(selection.anchorCol, selection.focusCol);
          td.classList.toggle("is-selected", r >= r0 && r <= r1 && c >= c0 && c <= c1);
        });
      };
      grid.addEventListener("click", (event) => {
        const td = event.target.closest("td[data-row]");
        if (!td) return;
        const row = Number(td.dataset.row);
        const col = Number(td.dataset.col);
        if (event.shiftKey && selection) {
          selection.focusRow = row;
          selection.focusCol = col;
        } else {
          selection = { anchorRow: row, anchorCol: col, focusRow: row, focusCol: col };
        }
        table.focus({ preventScroll: true });
        paintSelection();
      });
      table.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selection) {
          event.preventDefault();
          copyRich(copyBtn, selectedPayload());
        }
      });
      paintSelection();
      body.appendChild(grid);
    };
    paint();
    return mount;
  }
  function cellSlug(cellEl) {
    const src = cellEl && cellEl._carmarRanSource || "";
    const line = src.split("\n").map((s) => s.trim()).find((s) => s && !s.startsWith("#")) || "";
    return line.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  }
  function plotFileName(cellEl, index, count, ext) {
    const stem = cellSlug(cellEl) || "plot";
    return `${count > 1 ? `${stem}-${index + 1}` : stem}.${ext}`;
  }
  function tableFileName(cellEl, index, count, ext) {
    const stem = cellSlug(cellEl) || "table";
    return `${count > 1 ? `${stem}-${index + 1}` : stem}.${ext}`;
  }
  function pdfWithJpeg(jpegBytes, wPx, hPx, res) {
    const wPt = (wPx * 72 / (res || 96)).toFixed(2);
    const hPt = (hPx * 72 / (res || 96)).toFixed(2);
    const enc = new TextEncoder();
    const parts = [];
    let len = 0;
    const push = (chunk) => {
      const b = typeof chunk === "string" ? enc.encode(chunk) : chunk;
      parts.push(b);
      len += b.length;
    };
    const offsets = [];
    const obj = (n, body) => {
      offsets[n] = len;
      push(`${n} 0 obj
${body}
endobj
`);
    };
    push("%PDF-1.4\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offsets[4] = len;
    push(`4 0 obj
<< /Type /XObject /Subtype /Image /Width ${wPx} /Height ${hPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>
stream
`);
    push(jpegBytes);
    push("\nendstream\nendobj\n");
    const content = `q
${wPt} 0 0 ${hPt} 0 0 cm
/Im0 Do
Q
`;
    obj(5, `<< /Length ${content.length} >>
stream
${content}endstream`);
    const xref = len;
    push("xref\n0 6\n" + "0000000000 65535 f".padEnd(19, " ") + "\n" + [1, 2, 3, 4, 5].map((n) => `${String(offsets[n]).padStart(10, "0")} 00000 n`.padEnd(19, " ") + "\n").join(""));
    push(`trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xref}
%%EOF`);
    const out = new Uint8Array(len);
    let at = 0;
    parts.forEach((p) => {
      out.set(p, at);
      at += p.length;
    });
    return new Blob([out], { type: "application/pdf" });
  }
  function figure(doc, el, plot, index, count) {
    const fig = el("figure", "carmar-figure");
    const tools = el("div", "carmar-figure-tools");
    const img = el("img", "carmar-plot");
    img.src = `data:${plot.mime};base64,${plot.data}`;
    img.alt = `R plot ${index + 1}`;
    if (Number(plot.width) > 0 && Number(plot.height) > 0) {
      img.width = Number(plot.width);
      img.height = Number(plot.height);
      img.style.aspectRatio = `${Number(plot.width)} / ${Number(plot.height)}`;
    }
    const cssScale = 96 / (Number(plot.res) || 96);
    const naturalCssWidth = (Number(plot.width) || img.naturalWidth || 0) * cssScale;
    let zoom = 2;
    const applyZoom = () => {
      const target = naturalCssWidth * ZOOM_STEPS[zoom];
      img.style.width = target ? `${Math.round(target)}px` : `${ZOOM_STEPS[zoom] * 100}%`;
      img.style.maxWidth = ZOOM_STEPS[zoom] <= 1 ? "100%" : "none";
      label.textContent = `${Math.round(ZOOM_STEPS[zoom] * 100)}%`;
    };
    const btn = (icon2, title, fn) => {
      const b = el("button", "carmar-figure-btn");
      b.type = "button";
      b.innerHTML = icon2;
      b.title = title;
      b.setAttribute("aria-label", title);
      b.addEventListener("click", fn);
      return b;
    };
    const flash = (b, glyph) => {
      const was = b.innerHTML;
      b.textContent = glyph;
      b.disabled = true;
      setTimeout(() => {
        b.innerHTML = was;
        b.disabled = false;
      }, 1200);
    };
    const rasterBlob = (scale = 1, type = "image/png", bg = null) => new Promise((resolve, reject) => {
      const w = Math.round((Number(plot.width) || img.naturalWidth) * scale);
      const h = Math.round((Number(plot.height) || img.naturalHeight) * scale);
      if (!(w > 0 && h > 0)) {
        reject(new Error("No pixel size for this plot"));
        return;
      }
      const canvas = doc.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const draw = () => {
        const g = canvas.getContext("2d");
        if (bg) {
          g.fillStyle = bg;
          g.fillRect(0, 0, w, h);
        }
        g.drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Could not encode image")), type, 0.95);
      };
      if (img.complete && img.naturalWidth) draw();
      else img.addEventListener("load", draw, { once: true });
    });
    const originalBlob = () => new Blob(
      [Uint8Array.from(atob(plot.data), (c) => c.charCodeAt(0))],
      { type: plot.mime }
    );
    const pngBlob = () => plot.mime === "image/png" ? Promise.resolve(originalBlob()) : rasterBlob(1);
    const saveBlob = (makeBlob, name2) => saveBlobFile(doc, () => Promise.resolve(typeof makeBlob === "function" ? makeBlob() : makeBlob), name2, { id: "carmar-plots" });
    const isSvg = plot.mime === "image/svg+xml";
    const ext = isSvg ? "svg" : plot.mime === "image/jpeg" ? "jpg" : "png";
    const w0 = Number(plot.width) || 0;
    const h0 = Number(plot.height) || 0;
    const name = (e, suffix = "") => plotFileName(fig.closest(".cell"), index, count, e).replace(new RegExp(`\\.${e}$`), `${suffix}.${e}`);
    const label = el("span", "carmar-zoom-label");
    const copy = btn(ICONS2.copy, "Copy image", () => {
      const view = doc.defaultView;
      if (!view || !view.navigator.clipboard || !view.ClipboardItem) {
        flash(copy, "\u2715");
        return;
      }
      view.navigator.clipboard.write([new view.ClipboardItem({ "image/png": pngBlob() })]).then(() => flash(copy, "\u2713"), () => flash(copy, "\u2715"));
    });
    const menu = el("div", "carmar-savemenu");
    const item = (labelText, fn) => {
      const b = el("button", "carmar-pop-item");
      b.type = "button";
      b.textContent = labelText;
      b.addEventListener("click", () => {
        pop.close();
        fn();
      });
      menu.appendChild(b);
    };
    if (isSvg) item("Save SVG \u2014 vector", () => saveBlob(originalBlob, name("svg")));
    else item("Save SVG \u2014 the plot in a scalable wrapper", () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w0}" height="${h0}" viewBox="0 0 ${w0} ${h0}"><image width="${w0}" height="${h0}" href="data:${plot.mime};base64,${plot.data}" xlink:href="data:${plot.mime};base64,${plot.data}"/></svg>`;
      saveBlob(new Blob([svg], { type: "image/svg+xml" }), name("svg"));
    });
    item(`Save PNG \u2014 ${w0 || "?"} \xD7 ${h0 || "?"}`, () => isSvg ? saveBlob(() => rasterBlob(1), name("png")) : saveBlob(originalBlob, name("png")));
    if (isSvg) {
      item(`Save PNG @2\xD7 \u2014 ${w0 * 2} \xD7 ${h0 * 2}`, () => saveBlob(() => rasterBlob(2), name("png", "@2x")));
      item(`Save PNG @4\xD7 \u2014 ${w0 * 4} \xD7 ${h0 * 4}`, () => saveBlob(() => rasterBlob(4), name("png", "@4x")));
    }
    item("Save JPEG \u2014 white background", () => saveBlob(() => rasterBlob(1, "image/jpeg", "#fff"), name("jpg")));
    item(`Save PDF \u2014 ${(w0 / (Number(plot.res) || 96)).toFixed(1)} \xD7 ${(h0 / (Number(plot.res) || 96)).toFixed(1)} in`, () => {
      const scale = isSvg ? 2 : 1;
      saveBlob(
        () => rasterBlob(scale, "image/jpeg", "#fff").then((b) => b.arrayBuffer()).then((buf) => pdfWithJpeg(new Uint8Array(buf), w0 * scale, h0 * scale, (Number(plot.res) || 96) * scale)),
        name("pdf")
      );
    });
    item("Open in new tab", () => {
      const view = doc.defaultView;
      const url = view.URL.createObjectURL(originalBlob());
      view.open(url, "_blank");
      view.setTimeout(() => view.URL.revokeObjectURL(url), 3e4);
    });
    const more = btn(ICONS2.more, "Export options", () => pop.toggle());
    const pop = popupMenu(more, menu);
    const zoomGroup = el("span", "carmar-zoomgroup");
    zoomGroup.append(
      btn(ICONS2.zoomOut, "Zoom out", () => {
        zoom = Math.max(0, zoom - 1);
        applyZoom();
      }),
      label,
      btn(ICONS2.zoomIn, "Zoom in", () => {
        zoom = Math.min(ZOOM_STEPS.length - 1, zoom + 1);
        applyZoom();
      })
    );
    const spacer = el("span", "carmar-tools-sp");
    tools.append(
      zoomGroup,
      btn(ICONS2.fullscreen, "Fullscreen", () => {
        if (doc.fullscreenElement) doc.exitFullscreen();
        else if (fig.requestFullscreen) fig.requestFullscreen();
      }),
      spacer,
      copy,
      // One-click save is the kernel's own bytes — a PNG at native resolution,
      // an SVG kept vector — through the system save dialog.
      btn(ICONS2.download, isSvg ? "Save SVG" : "Save PNG", () => saveBlob(originalBlob, plotFileName(fig.closest(".cell"), index, count, ext))),
      more
    );
    fig.append(img, tools);
    applyZoom();
    return fig;
  }

  // lib/run-status.js
  function fmtDuration(ms) {
    if (!(ms >= 0)) return "";
    if (ms < 1e4) return `${Math.round(ms / 100) / 10}s`;
    if (ms < 9e4) return `${Math.round(ms / 1e3)}s`;
    const m = Math.floor(ms / 6e4);
    return `${m}m ${Math.round((ms - m * 6e4) / 1e3)}s`;
  }
  var clock = (ts) => new Date(ts).toTimeString().slice(0, 5);
  function chipFor(cellEl) {
    if (!cellEl) return null;
    if (cellEl._carmarChip) return cellEl._carmarChip;
    const foot = cellEl.querySelector(".carmar-editor-foot");
    if (!foot) return null;
    const doc = cellEl.ownerDocument;
    const el = doc.createElement("span");
    el.className = "carmar-runchip";
    el.dataset.state = "idle";
    const strip = foot.querySelector(".carmar-add-inline");
    foot.insertBefore(el, strip || null);
    let timer = null;
    let startedAt = 0;
    const stopTimer = () => {
      clearInterval(timer);
      timer = null;
    };
    const set = (state, text, title) => {
      el.dataset.state = state;
      el.textContent = text;
      el.title = title || "";
    };
    const api = {
      state: () => el.dataset.state,
      queued: () => {
        stopTimer();
        set("queued", "queued", "Waiting for the cells before it");
      },
      running: () => {
        startedAt = Date.now();
        stopTimer();
        set("running", "0s");
        timer = setInterval(() => {
          set("running", fmtDuration(Date.now() - startedAt));
        }, 200);
      },
      /**
       * The run landed. `status` is the verb's own vocabulary: ok /
       * interrupted / anything-else-is-an-error.
       */
      done: (status, exec) => {
        stopTimer();
        const ms = startedAt ? Date.now() - startedAt : NaN;
        const took = fmtDuration(ms);
        const at = clock(Date.now());
        startedAt = 0;
        if (status === "ok") {
          set(
            "ok",
            `\u2713 ${took ? `${took} \xB7 ` : ""}${at}`,
            exec != null ? `Ran as [${exec}] \u2014 ${took || "?"} at ${at}` : ""
          );
        } else if (status === "interrupted") {
          set("int", "\u23F8 interrupted", `Stopped at ${at}`);
        } else {
          set("err", `\u2715 ${took ? `${took} \xB7 ` : ""}${at}`, `Failed at ${at}`);
        }
      },
      skipped: (reason) => {
        stopTimer();
        startedAt = 0;
        set("skipped", "skipped", reason || "");
      },
      clear: () => {
        stopTimer();
        startedAt = 0;
        set("idle", "");
      }
    };
    cellEl._carmarChip = api;
    return api;
  }

  // lib/design.css.js
  var CARMAR_CSS = `
/* \u2500\u2500 the editor's own palette \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Every colour the code area uses is a variable with the Day value as its
   default, so lib/editor-themes.js can repaint the editor by setting a handful
   of custom properties on .cn-root \u2014 no stylesheet swap, and a theme that
   omits a variable degrades to Day instead of rendering black on black. */
.cn-root{
  --ed-bg:var(--cn-control-bg);
  --ed-fg:var(--cn-text);
  --ed-gutter:rgba(32,33,36,.28);
  --ed-line:rgba(39,109,195,.055);
  --ed-sel:rgba(39,109,195,.22);
  --ed-caret:var(--cn-text);
  --ed-border:var(--cn-border);
  --ed-bar:var(--cn-surface);
  --ed-brmatch:rgba(39,109,195,.22);
  --rtok-com:#9aa0a6;
  --rtok-doc:#6b7f8c;
  --rtok-str:#137333;
  --rtok-num:#1a5cb8;
  --rtok-kw:var(--cn-accent-deep,#3a6a9f);
  --rtok-const:#b45309;
  --rtok-fn:#1c5391;
  --rtok-arg:var(--cn-accent,#4e79a7);
  --rtok-op:#c5221f;
}

/* \u2500\u2500 the code cell owns its body; core's form Run button is redundant \u2500\u2500 */
.cn-root .carmar-code-cell .btn-run{display:none;}
.cn-root .carmar-code-cell .cell-form{padding:0;}

/* \u2500\u2500 code-chunk shape \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Core supplies the Raised default. These opt-in variants change only the
   OUTER code-cell shell: the editor palette, results, plots, AI review state,
   and the editor's run/error edge keep their own visual contracts. */
.cn-root[data-chunk-style="flat"] .cell.carmar-code-cell,
.cn-root[data-chunk-style="flat"] .cell.carmar-code-cell:hover{
  border-color:var(--cn-border);border-radius:var(--cn-radius-sm);
  box-shadow:none;
}
.cn-root[data-chunk-style="flat"] .cell.carmar-code-cell:hover{
  border-color:var(--cn-border-strong);
}
.cn-root[data-chunk-style="flat"] .cell.carmar-code-cell > .cell-header{
  border-radius:var(--cn-radius-sm) var(--cn-radius-sm) 0 0;
}
.cn-root[data-chunk-style="plain"] .cell.carmar-code-cell,
.cn-root[data-chunk-style="plain"] .cell.carmar-code-cell:hover{
  background:transparent;border-color:transparent;border-radius:0;
  box-shadow:none;overflow:visible;
}
.cn-root[data-chunk-style="plain"] .cell.carmar-code-cell > .cell-header{
  padding-left:2px;padding-right:2px;background:transparent;
  border-bottom-color:transparent;border-radius:0;
}
.cn-root[data-chunk-style="plain"] .cell.carmar-code-cell > .cell-result{
  padding-left:0;padding-right:0;
}

.cn-root .carmar-editor{position:relative;
  /* NO container-type here \u2014 EVER. The 0.32 tiers used
     container:carmar-chunk/inline-size, and CSS containment changes how the
     browser layers and hit-tests the subtree: on one real machine (branded
     Chrome, scaled display) it produced position-dependent DEAD SLIVERS on
     the Run button \u2014 clicks passing through part of a visible control. A week
     of "the chunk hangs" reports traced to it. Narrow chunks are handled by
     plain flex wrapping below, which needs no containment. */
  border:1px solid var(--ed-border);border-radius:var(--cn-radius-sm);
  background:var(--ed-bg);overflow:hidden;width:100%;
  /* The run-state edge (see "run-state cues"): the cell sets the colour, the
     code box wears it \u2014 so the cue ends where the code ends. */
  box-shadow:inset 3px 0 0 var(--carmar-state,transparent);
  transition:box-shadow var(--cn-dur-2);
}
.cn-root .carmar-editor.is-busy{border-color:var(--cn-accent);}

/* The running strip \u2014 hidden at rest, so it costs no height at all. The
   hidden attribute alone loses to display:flex, hence the [hidden] rule.
   (No backticks in this file: the whole stylesheet is one template literal.) */
/* OVERLAY, not flow. This strip appears on every run and disappears when the
   run ends, and in the flow it moved the code, the result and every cell below
   it by ~25px \u2014 twice per run, so a Run All was two dozen jumps down the page.
   Absolutely positioned over the editor's top-right corner it says exactly the
   same thing and moves nothing. */
.cn-root .carmar-editor-bar{
  position:absolute;top:5px;right:8px;z-index:3;
  display:flex;align-items:center;gap:8px;padding:2px 8px;
  border:1px solid var(--cn-border);border-radius:999px;
  background:var(--cn-surface);box-shadow:var(--cn-shadow-sm);
}
.cn-root .carmar-editor-bar[hidden]{display:none;}
.cn-root .carmar-running-label{
  font-size:var(--cn-fs-xs);color:var(--cn-accent);font-weight:600;
}
.cn-root .carmar-exec{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:var(--cn-fs-xs);opacity:.5;min-width:3ch;
}
.cn-root .carmar-run{
  display:inline-flex;align-items:center;gap:6px;
  font:inherit;font-size:var(--cn-fs-xs);font-weight:600;
  padding:4px 12px;border-radius:999px;border:1px solid transparent;
  background:var(--cn-accent);color:#fff;cursor:pointer;
  transition:background var(--cn-dur-1),opacity var(--cn-dur-1);
}
.cn-root .carmar-run:hover:not(:disabled){filter:brightness(1.06);}
.cn-root .carmar-run:disabled{opacity:.55;cursor:default;}
.cn-root .carmar-run-glyph{font-size:.85em;line-height:1;}
/* Glyphs are decoration, never independent hit targets. The Run word itself
   is a plain text node owned by the button, as it was before the 0.32
   responsive-label rewrite. Every visible pixel therefore resolves to the
   button rather than to a nested label layer. */
.cn-root .carmar-run > *{pointer-events:none;}
.cn-root .carmar-hint{
  font-size:var(--cn-fs-xs);opacity:.45;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
.cn-root .carmar-editor-status{font-size:var(--cn-fs-xs);opacity:.7;margin-left:auto;}
.cn-root .carmar-spinner{
  width:10px;height:10px;border-radius:50%;display:inline-block;
  border:2px solid rgba(255,255,255,.4);border-top-color:#fff;
  animation:carmar-spin .7s linear infinite;
}
@keyframes carmar-spin{to{transform:rotate(360deg);}}

/* \u2500\u2500 an engaged lock is unmistakable \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Core hides a locked cell's entire form (its editor and Run), so the header
   padlock is the ONE remaining sign of why the code vanished. A closed 16px
   shackle in default grey was too quiet \u2014 engaged, it gets a warm tinted
   pill. */
.cn-root .cell.locked .cell-btn.lock-btn{
  color:#7a3c00;background:#ffe9c7;border-radius:6px;opacity:1;
}

/* \u2500\u2500 editor body: gutter + full-bleed code \u2500\u2500 */
.cn-root .carmar-editor-body{display:flex;align-items:stretch;width:100%;}
/* \u2500\u2500 find and replace \u2500\u2500
   ONE boxed thing per row: the input. Everything else is bare.
     a widget that MODIFIES the query lives inside the field it modifies, so
       Aa/ab/.* ride the input's trailing edge rather than sitting a thousand
       pixels away at the far end of a stretched row;
     the count and the steppers are BARE \u2014 the first cut wrapped them in a
       bordered pill, and with an empty query that pill is an empty bordered
       box sitting beside the input, which reads as a second field to type in;
     the field stops growing. A three-letter query does not need 1,100 px of
       input, and a form whose parts are that far apart cannot be read as one.
   The count still holds its width when empty so the arrows do not jump on the
   first keystroke \u2014 reserved space, not a drawn box.
   Left rail: the disclosure triangle that folds Replace out (before, the row
   existed but only \u2325\u2318F reached it). Right rail: dismiss. */
/* The form CLUSTERS at the left rather than spanning the band. Stretched to
   full width the dismiss button ends up ~350 px from the nearest control it
   relates to, which reads as two unrelated widgets instead of one form. */
.cn-root .carmar-editor-search{
  display:flex;align-items:flex-start;gap:2px;padding:5px 8px;
  border-bottom:1px solid var(--ed-border);background:var(--ed-bar);
}
.cn-root .carmar-editor-search[hidden]{display:none;}
.cn-root .carmar-editor-search-rows{display:flex;flex-direction:column;gap:4px;min-width:0;flex:0 1 auto;}
.cn-root .carmar-editor-search-row{display:flex;align-items:center;gap:6px;min-width:0;}
/* An explicit width, not a flex basis: the bar is content-sized, so a basis
   with shrink enabled collapses toward min-content and the field ends up
   narrower than the query typed into it. */
.cn-root .carmar-editor-search-field{
  display:flex;align-items:center;gap:8px;min-width:0;
  flex:0 1 auto;width:clamp(250px,32vw,400px);
}
.cn-root .carmar-editor-search-label{
  flex:0 0 46px;text-align:right;color:var(--cn-text-muted);
  font:600 var(--cn-fs-xs) var(--cn-font);
}
.cn-root .carmar-editor-search-box{position:relative;display:flex;align-items:center;flex:1 1 auto;min-width:0;}
.cn-root .carmar-editor-search-input{
  width:100%;height:26px;min-width:0;padding:3px 8px;border:1px solid var(--cn-border);
  border-radius:6px;outline:0;background:var(--cn-control-bg);color:var(--cn-text);
  font:12px var(--cn-mono);
}
/* Room for the three in-field toggles: 3 x 21px + 2px gaps + the 3px inset. */
.cn-root .carmar-editor-search-box.has-flags .carmar-editor-search-input{padding-right:76px;}
.cn-root .carmar-editor-search-input:focus{border-color:var(--cn-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--cn-accent) 14%,transparent);}
.cn-root .carmar-editor-search-flags{
  position:absolute;right:3px;top:50%;transform:translateY(-50%);
  display:flex;align-items:center;gap:2px;
}
/* The count doubles as the error line for a half-typed pattern: it answers the
   same question ("how many did that find?"), and a find box that silently
   shows nothing looks like a find box that is broken. */
.cn-root .carmar-editor-search-count{
  min-width:52px;max-width:240px;text-align:right;color:var(--cn-text-muted);
  font:500 var(--cn-fs-xs) var(--cn-font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-editor-search-count.is-error{color:#c5303e;font-style:italic;}
/* Bare, not a pill: an empty bordered box beside the input reads as a second
   field to type in, which is exactly how an idle find bar looks. */
.cn-root .carmar-editor-search-walk{
  display:inline-flex;align-items:center;gap:1px;flex:0 0 auto;
}
.cn-root .carmar-editor-search-actions{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;}
.cn-root .carmar-editor-search-btn{
  min-width:26px;height:26px;padding:0 9px;border:1px solid var(--cn-border);border-radius:6px;
  background:var(--cn-control-bg);color:var(--cn-text);font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;
}
.cn-root .carmar-editor-search-btn:hover,.cn-root .carmar-editor-search-btn:focus{outline:0;border-color:var(--cn-accent);color:var(--cn-accent-deep);}
.cn-root .carmar-editor-search-btn.is-active{border-color:var(--cn-accent);background:color-mix(in srgb,var(--cn-accent) 12%,var(--cn-surface));color:var(--cn-accent-deep);}
.cn-root .carmar-editor-search-btn:disabled{opacity:.4;cursor:default;}
/* The flags and the steppers carry no chrome of their own: the flags sit
   inside the input's box, and the steppers sit on the bar. Only the two
   Replace verbs are real buttons, because they DO something irreversible. */
.cn-root .carmar-editor-search-btn.is-flag{
  min-width:21px;height:20px;padding:0 4px;border:0;border-radius:4px;background:transparent;
  color:var(--cn-text-muted);font:600 10.5px var(--cn-mono);
}
.cn-root .carmar-editor-search-btn.is-step{
  min-width:22px;height:22px;padding:0;border:0;border-radius:5px;background:transparent;
  color:var(--cn-text-muted);font:600 12px var(--cn-font);
}
/* :focus-visible, not :focus \u2014 a mouse click must not leave a filled box
   sitting on the bar afterwards, while a keyboard tab still has to show. */
.cn-root .carmar-editor-search-btn.is-flag:hover,.cn-root .carmar-editor-search-btn.is-flag:focus-visible,
.cn-root .carmar-editor-search-btn.is-step:hover,.cn-root .carmar-editor-search-btn.is-step:focus-visible{
  border:0;background:color-mix(in srgb,var(--cn-accent) 12%,transparent);color:var(--cn-accent-deep);
}
.cn-root .carmar-editor-search-btn.is-flag.is-active{
  border:0;background:color-mix(in srgb,var(--cn-accent) 18%,var(--cn-surface));color:var(--cn-accent-deep);
}
.cn-root .carmar-editor-search-disclose,.cn-root .carmar-editor-search-btn.is-close{
  display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;
  width:22px;min-width:22px;height:26px;padding:0;border:0;border-radius:5px;
  background:transparent;color:var(--cn-text-dim);cursor:pointer;
}
/* A gap before dismiss, so the button that closes the form is not adjacent to
   the button that steps through matches. */
.cn-root .carmar-editor-search-btn.is-close{font:500 16px/1 var(--cn-font);margin-left:6px;}
.cn-root .carmar-editor-search-disclose:hover,.cn-root .carmar-editor-search-disclose:focus-visible,
.cn-root .carmar-editor-search-btn.is-close:hover,.cn-root .carmar-editor-search-btn.is-close:focus-visible{
  outline:0;border:0;background:color-mix(in srgb,var(--cn-accent) 12%,transparent);color:var(--cn-accent-deep);
}
.cn-root .carmar-editor-search-disclose svg{display:block;transition:transform 130ms var(--cn-ease,ease-out);}
.cn-root .carmar-editor-search-disclose.is-open svg{transform:rotate(90deg);}
@media (prefers-reduced-motion:reduce){
  .cn-root .carmar-editor-search-disclose svg{transition:none;}
}
@media (max-width:520px){
  .cn-root .carmar-editor-search{padding:5px;}
  .cn-root .carmar-editor-search-label{display:none;}
  .cn-root .carmar-editor-search-field{flex:1 1 auto;width:auto;}
  .cn-root .carmar-editor-search-count{min-width:44px;}
}
.cn-root .carmar-gutter{
  flex:0 0 auto;padding:10px 8px 10px 12px;text-align:right;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:13px;line-height:1.6;white-space:pre;user-select:none;
  color:var(--ed-gutter);border-right:1px solid var(--ed-border);
  overflow:hidden;background:var(--ed-bg);
}
.cn-root .carmar-code-wrap{position:relative;flex:1 1 auto;min-width:0;}
.cn-root textarea.carmar-code{
  display:block;position:relative;z-index:1;width:100%;min-width:0;box-sizing:border-box;
  padding:10px 12px;margin:0;border:0;outline:none;resize:none;overflow:hidden;
  background:transparent;
  /* The overlay trick: this textarea's glyphs are invisible \u2014 the colored
     copy in .carmar-highlight shows through. The caret stays. */
  color:transparent;caret-color:var(--ed-caret);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:13px;line-height:1.6;tab-size:2;white-space:pre;
}
.cn-root textarea.carmar-code::selection{background:var(--ed-sel);}
.cn-root .carmar-highlight{
  position:absolute;inset:0;z-index:0;margin:0;overflow:hidden;
  pointer-events:none;user-select:none;box-sizing:border-box;
  padding:10px 12px;color:var(--ed-fg);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:13px;line-height:1.6;tab-size:2;white-space:pre;
}
/* \u2500\u2500 the line the cursor is on \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Behind the text, never over it: a band in the code-wrap under both the
   overlay and the textarea, moved by transform so scrolling costs nothing. */
.cn-root .carmar-activeline{
  position:absolute;left:0;right:0;top:0;height:1.6em;
  background:var(--ed-line);pointer-events:none;z-index:0;
  transform:translateY(0);
}
.cn-root .carmar-editor-bar,.cn-root .carmar-editor-foot{background:var(--ed-bar);}
/* Quiet, GitHub-ish palette \u2014 signal, not a rainbow. Each colour earns its
   place by answering a question you actually ask while reading R:
   what is a call, what is a literal, what is being assigned, what is only a
   comment \u2014 and, since 2026-08, which words are argument NAMES rather than
   values, and which comment is documentation. */
.cn-root .rtok-com{color:var(--rtok-com);font-style:italic;}
.cn-root .rtok-doc{color:var(--rtok-doc);font-style:italic;}   /* #' roxygen */
.cn-root .rtok-str{color:var(--rtok-str);}
.cn-root .rtok-num{color:var(--rtok-num);}
.cn-root .rtok-kw{color:var(--rtok-kw);font-weight:600;}
.cn-root .rtok-const{color:var(--rtok-const);}
.cn-root .rtok-fn{color:var(--rtok-fn);}
.cn-root .rtok-arg{color:var(--rtok-arg);}                     /* name = at a call */
.cn-root .rtok-op{color:var(--rtok-op);}
/* The bracket the cursor is beside, and its partner. RStudio draws a box; a
   tinted background reads the same and survives every theme. */
.cn-root .rtok-brmatch{background:var(--ed-brmatch);border-radius:2px;}
/* Identifiers are wrapped but NOT coloured: the span exists so hover help has
   something to hit-test against (a textarea has no per-word elements). */
.cn-root .rtok-id{color:inherit;}
/* elementsFromPoint SKIPS anything with pointer-events:none \u2014 which the whole
   overlay is \u2014 so the token spans re-enable it for themselves. This changes
   hit-TESTING only: the textarea is above them in the stack, so it still
   receives every real click, drag and selection. Without this the hover never
   found a token and simply never appeared. */
.cn-root .carmar-highlight span{pointer-events:auto;}
/* One block per source line (each span carries its own newline, so the text
   content is unchanged). Block children make an edit relayout ONE line \u2014
   as a single inline run, touching any line re-laid-out all 2,000. */
.cn-root .carmar-highlight > span{display:block;}

/* \u2500\u2500 the AI beside the code \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Teal, and only teal, so "this came from a model" is never confused with
   "this came from R". The panel is a column: header, a thread that scrolls,
   and a composer pinned to the bottom that keeps its full height \u2014 the input
   used to be a single pill at the top of an empty card. \u2500\u2500 */
/* \u2500\u2500 header-row discipline: same contract as the editor foot \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Core's .cell-header is one flex row carrying its own controls PLUS every
   group chunkAI injects. Flex's default shrink crushed the name chip to
   "#\u2026", wrapped "Rewrite \u25BE" onto two lines, and clipped the destination
   switch mid-word. A wrapping row never shrinks an item that can move to
   the next line instead \u2014 so: wrap the ROW, forbid shrink on the groups,
   and no control ever deforms. (ai-cell.js is frozen; this is styling.) */
.cn-root .cell-header{flex-wrap:wrap;row-gap:3px;min-width:0;}
.cn-root .cell-header > *:not(.cell-spacer){flex:0 0 auto;}
.cn-root .carmar-ai-group{
  display:inline-flex;align-items:center;gap:2px;margin-left:6px;
  border:1px solid #cbd8e6;border-radius:999px;padding:1px 4px 1px 2px;
}
.cn-root .carmar-ai-group.is-immediate-tasks{
  background:var(--cn-surface,#fff);
}
.cn-root .carmar-ai-header-capabilities{
  display:inline-flex;align-items:center;gap:1px;margin-left:4px;
  border:1px solid #cbd8e6;border-radius:999px;background:var(--cn-surface,#fff);
  padding:1px 2px;
}
.cn-root .carmar-ai-context-group{
  display:inline-flex;align-items:center;margin-left:4px;
  border:1px solid #dbe2ea;border-radius:999px;background:var(--cn-surface,#fff);
  padding:1px 2px;
}
.cn-root .carmar-ai-context-group .carmar-ai-btn[data-intent="pin"]{
  border:0;border-radius:999px;
}
.cn-root .carmar-ai-destination{
  display:inline-flex;align-items:center;margin-left:4px;overflow:hidden;
  border:1px solid #cbd8e6;border-radius:999px;background:var(--cn-surface,#fff);
}
.cn-root .carmar-ai-destination-button{
  border:0;background:transparent;color:var(--cn-accent-deep,#3a6a9f);
  font:650 var(--cn-fs-xs) var(--cn-font);padding:3px 8px;cursor:pointer;
  white-space:nowrap;
}
.cn-root .carmar-ai-destination-button:hover:not(.is-active){background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-ai-destination-button.is-active{background:#dfeaf4;font-weight:800;}
.cn-root .carmar-ai-destination-button.is-active::before{content:"\u2713 ";}
.cn-root .carmar-chunk-name{display:inline-flex;align-items:center;margin-left:7px;min-width:0;}
.cn-root .carmar-chunk-name-button{
  max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  border:1px solid var(--cn-border-soft);border-radius:999px;background:var(--cn-surface,#fff);
  color:var(--cn-text-muted);font:600 10px var(--cn-mono);padding:2px 8px;cursor:text;
}
.cn-root .carmar-chunk-name-button::before{content:"# ";color:var(--cn-accent,#4e79a7);}
.cn-root .carmar-chunk-name-button:hover{border-color:#7fdede;color:var(--cn-text);}
.cn-root .carmar-chunk-name-input{width:140px;border:1px solid var(--cn-accent,#4e79a7);border-radius:999px;
  background:#fff;color:var(--cn-text);font:600 10px var(--cn-mono);padding:2px 8px;outline:0;}
.cn-root .carmar-ai-spark{color:var(--cn-accent,#4e79a7);font-size:11px;line-height:1;}
/* The permanent door back into a dismissed AI pane. It lives beside AI \u25BE,
   with enough teal to read as an action rather than another settings menu. */
.cn-root .carmar-ai-launch{
  display:inline-flex;align-items:center;gap:5px;padding-inline:10px;
  border-color:rgba(207,184,255,.62);background:rgba(78,121,167,.12);
  color:#ccfbfb;font-weight:700;
}
.cn-root .carmar-ai-launch:hover,
.cn-root .carmar-ai-launch.is-open{
  background:rgba(78,121,167,.28);border-color:rgba(226,211,255,.9);color:#fff;
}
.cn-root .carmar-ai-launch-spark{font-size:12px;color:#99f6f6;line-height:1;}
.cn-root .carmar-agent-launch{
  display:inline-flex;align-items:center;gap:5px;padding-inline:12px;
  border:1px solid rgba(255,255,255,.1);background:#088F8F;color:#fff;font-weight:700;
  box-shadow:none;
}
.cn-root .carmar-agent-launch:hover{background:#0a9d9d;}
.cn-root .carmar-agent-launch-spark{font-size:12px;color:#fff;line-height:1;}
@media print{.cn-root .carmar-ai-launch,.cn-root .carmar-agent-launch{display:none;}}
.cn-root .carmar-ai-btn{
  font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;white-space:nowrap;
  padding:2px 8px;border:0;border-radius:999px;background:none;color:var(--cn-accent-deep,#3a6a9f);
}
.cn-root .carmar-ai-btn:hover:not(:disabled){background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-ai-btn[data-intent="pin"]{border-left:1px solid #cbd8e6;border-radius:0 999px 999px 0;}
.cn-root .carmar-ai-btn[data-intent="pin"].is-pinned{background:#e0f5f5;color:#065c5c;font-weight:800;}
.cn-root .cell.carmar-ai-context-pinned{box-shadow:inset 3px 0 0 var(--cn-accent,#4e79a7);}
.cn-root .carmar-ai-btn:disabled{opacity:.38;cursor:default;}
.cn-root .carmar-ai-foot{
  display:flex;align-items:center;gap:4px;margin-top:8px;
  padding-top:7px;border-top:1px dashed var(--cn-border-soft);
}
.cn-root .carmar-ai-foot[hidden]{display:none!important;}
/* Inside the editor's run row the strip is a row-mate, not a floor: no
   border, no vertical spend. The status span's margin-left:auto already
   right-aligns everything after it. */
.cn-root .carmar-editor-foot .carmar-ai-foot{
  margin:0;padding:0;border:0;flex:0 0 auto;
}
/* Result-aware AI lives in the result header. Its parked copy in the editor
   footer is deliberately invisible when no rendered result exists. */
.cn-root .carmar-ai-result-tasks{display:none;}
.cn-root .carmar-output-bar .carmar-ai-result-tasks{
  display:inline-flex;align-items:center;gap:1px;flex:0 0 auto;
  padding:1px 3px;border:1px solid #dbe2ea;border-radius:999px;
  background:var(--cn-surface,#fff);opacity:1;
}
.cn-root .carmar-ai-result-tasks .carmar-ai-btn{padding:3px 9px;}
.cn-root .carmar-ai-capability{
  border:1px solid transparent;padding:3px 9px;
}
.cn-root .carmar-ai-capability[data-intent="ask"]{
  color:var(--cn-accent-deep,#3a6a9f);background:transparent;
}
.cn-root .carmar-ai-capability[data-intent="suggest"]{
  color:var(--cn-accent-deep,#3a6a9f);background:var(--cn-accent-soft,#eef3f8);
}
.cn-root .carmar-ai-capability[data-intent="code"]{
  color:#fff;background:var(--cn-accent,#4e79a7);font-weight:750;
}
.cn-root .carmar-ai-capability[data-intent="code"]:hover:not(:disabled){
  color:#fff;background:var(--cn-accent-deep,#3a6a9f);
}
@media(max-width:760px){
  /* The header row and editor foot no longer adapt by VIEWPORT width \u2014 both
     wrap at any width (plain flexbox; no container queries anywhere). */
  .cn-root .carmar-output-bar{flex-wrap:wrap;}
  .cn-root .carmar-output-bar .carmar-ai-result-tasks{margin-left:auto;}
}

/* Interpret's dial: the button still answers in one click, the caret says in
   which register. The menu is absolute inside the split so it opens over the
   result rather than pushing it down. */
.cn-root .carmar-ai-split,
.cn-root .carmar-ai-menu{position:relative;display:inline-flex;align-items:center;}
.cn-root .carmar-ai-caret{
  font:600 10px var(--cn-font);cursor:pointer;color:var(--cn-accent-deep,#3a6a9f);
  padding:2px 5px;margin-left:-4px;border:0;border-radius:999px;background:none;
}
.cn-root .carmar-ai-caret:hover:not(:disabled){background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-ai-caret:disabled{opacity:.38;cursor:default;}
.cn-root .carmar-ai-split[hidden],.cn-root .carmar-ai-tonote[hidden]{display:none!important;}
/* FIXED, and mounted on .cn-root \u2014 never inside .cell, which is
   position:relative + overflow:hidden in core's stylesheet and therefore
   clips any positioned descendant that leaves its box. The Interpret menu
   opens from the cell's last child, so every pixel of it was being cut off:
   present in the DOM, un-hidden, painted nowhere. lib/menu-pop.js places it. */
.cn-root .carmar-ai-modemenu{
  position:fixed;z-index:900;min-width:290px;
  padding:5px;border:1px solid #cbd8e6;border-radius:var(--cn-radius-md);
  /* --cn-bg is NOT one of core's tokens: it resolved to nothing, which makes
     background fully transparent, and the cell's code read straight through
     the menu. An opaque surface, with a literal fallback so a missing token
     can never make a popup see-through again. */
  background:var(--cn-surface,#ffffff);box-shadow:var(--cn-shadow-lg);
}
.cn-root .carmar-ai-modeitem{
  display:block;width:100%;text-align:left;cursor:pointer;
  padding:6px 9px;border:0;border-radius:var(--cn-radius-sm);background:none;
}
.cn-root .carmar-ai-modeitem:hover{background:#f0fdfd;}
.cn-root .carmar-ai-modeitem.is-current{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-ai-modesec{
  margin-top:5px;padding:6px 9px 2px;border-top:1px solid var(--cn-border-soft);
  font:700 9.5px var(--cn-font);letter-spacing:.06em;text-transform:uppercase;
  color:var(--cn-text-muted);
}
.cn-root .carmar-ai-modeitem.is-place .carmar-ai-modename{font-weight:500;}
.cn-root .carmar-ai-modeitem.is-place.is-current .carmar-ai-modename{font-weight:700;}
.cn-root .carmar-ai-modeitem.is-edit{
  margin-top:4px;padding-top:8px;border-top:1px solid var(--cn-border-soft);
  border-radius:0 0 var(--cn-radius-sm) var(--cn-radius-sm);
}
.cn-root .carmar-ai-modename{
  display:block;font:600 var(--cn-fs-sm) var(--cn-font);color:var(--cn-text);
}
.cn-root .carmar-ai-modeitem.is-current .carmar-ai-modename::after{
  content:" \u2713";color:var(--cn-accent-deep,#3a6a9f);
}
.cn-root .carmar-ai-modehint{
  display:block;margin-top:1px;font:400 var(--cn-fs-xs) var(--cn-font);color:var(--cn-muted);
}

/* the panel */
.cn-root .carmar-ai-panel{
  display:flex;flex-direction:column;min-height:0;
  margin-top:10px;border:1px solid #cbd8e6;border-radius:var(--cn-radius-md);
  background:#f7fafd;overflow:hidden;
}
.cn-root .carmar-ai-panel.is-float{
  position:fixed;z-index:820;margin:0;box-shadow:var(--cn-shadow-lg);
}
.cn-root .carmar-ai-panel:not(.is-float):not(.is-side){max-height:70vh;}
/* the notebook is not showing \u2014 a fixed panel must not hover over the tab
   that is (and, worse, eat its clicks) */
.cn-root .carmar-ai-panel.is-offscreen{display:none;}

.cn-root .carmar-runabove{
  display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;cursor:pointer;
  font:600 var(--cn-fs-xs) var(--cn-font);padding:3px 10px;
  border:1px solid var(--cn-border);border-radius:999px;
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-runabove:hover:not(:disabled){background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;}
.cn-root .carmar-runabove:disabled{opacity:.65;cursor:default;}
@media print{.cn-root .carmar-runabove{display:none;}}

/* Where the answers go, on the strip rather than in a menu \u2014 the setting was
   unfindable, so the feature it controls was unfindable too. */
.cn-root .carmar-ai-tonote{
  display:inline-flex;align-items:center;gap:4px;cursor:pointer;
  font:600 var(--cn-fs-xs) var(--cn-font);color:var(--cn-accent-deep,#3a6a9f);
  padding:1px 7px 1px 5px;border-radius:999px;
}
.cn-root .carmar-ai-tonote:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-ai-tonote input{margin:0;accent-color:var(--cn-accent-deep,#3a6a9f);cursor:pointer;}
@media print{.cn-root .carmar-ai-tonote{display:none;}}

/* the rewrite strip \u2014 what just happened to this cell, and the way back.
   Between the header and the editor, because the change it reports is IN the
   editor directly below it. */
.cn-root .carmar-ai-rwbar{
  display:flex;align-items:center;gap:8px;margin:0 0 6px;padding:6px 10px;
  font-size:11.5px;line-height:1.45;border-radius:var(--cn-radius-sm);
  border:1px solid #cbd8e6;background:var(--cn-accent-soft,#eef3f8);color:#0f766e;
}
.cn-root .carmar-ai-rwbar.is-warn{border-color:#f0d7a8;background:#fdf6e8;color:#8a5a00;}
.cn-root .carmar-ai-rwbar.is-done{border-color:#bfe3c6;background:#f0f9f2;color:#1c6b32;}
.cn-root .carmar-ai-rwtext{flex:1 1 auto;min-width:0;}
.cn-root .carmar-ai-rwbtn{
  flex:0 0 auto;font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;padding:3px 10px;
  border:1px solid currentColor;border-radius:999px;background:transparent;color:inherit;
}
.cn-root .carmar-ai-rwbtn:hover{background:rgba(0,0,0,.06);}
.cn-root .carmar-ai-rwx{
  flex:0 0 auto;font:600 13px var(--cn-font);line-height:1;cursor:pointer;
  padding:2px 4px;border:0;background:none;color:inherit;opacity:.6;
}
.cn-root .carmar-ai-rwx:hover{opacity:1;}
@media print{.cn-root .carmar-ai-rwbar{display:none;}}

/* \u2500\u2500 the side pane \u2014 the chat as a column, the notebook narrowed to fit \u2500\u2500
   Gemini's shape in a Google Doc: full height, pinned to an edge, and the
   document MAKES ROOM rather than being covered. A floating panel is fine for
   a glance and wrong for a conversation \u2014 it sits on the thing being read. */
.cn-root .carmar-ai-panel.is-side{
  position:fixed;top:0;bottom:0;z-index:820;margin:0;border-radius:0;
  width:var(--carmar-ai-side-w,400px);max-height:none;height:auto;
  box-shadow:var(--cn-shadow-lg);
}
.cn-root .carmar-ai-panel.is-side.on-left{left:0;border-width:0 1px 0 0;}
.cn-root .carmar-ai-panel.is-side.on-right{right:0;border-width:0 0 0 1px;}
/* The page gives up exactly the pane's width, on the pane's side. Padding on
   .cn-root rather than a margin on the body: the notebook's own centring and
   its page-width control both live inside this element. */
.cn-root.has-ai-left{padding-left:var(--carmar-ai-side-w,400px);}
.cn-root.has-ai-right{padding-right:var(--carmar-ai-side-w,400px);}
/* The whole inner edge is the handle \u2014 the drag anyone would try first. */
/* The hit area is 14px; the VISUAL is the 1px rule and the grab pill drawn
   below, so the target got easier to catch without the panel looking thicker.
   A 9px strip is a coin toss with a trackpad. */
.cn-root .carmar-ai-sedge{
  position:absolute;top:0;bottom:0;width:14px;cursor:col-resize;z-index:60;
  touch-action:none;outline:0;
}
/* A FLOATING panel opens parked against the right edge of the window, so its
   corner grip could only grow it into a wall. This edge grows it leftwards,
   full height, with the same grab pill so it reads as the same gesture. */
.cn-root .carmar-ai-wedge{
  position:absolute;top:0;bottom:0;left:0;width:14px;cursor:col-resize;z-index:60;
  touch-action:none;outline:0;
}
.cn-root .carmar-ai-wedge::after{
  content:"";position:absolute;top:50%;left:4px;width:5px;height:42px;
  transform:translateY(-50%);border-radius:999px;background:#9fb1c4;
  box-shadow:0 0 0 3px rgba(255,255,255,.78);
}
.cn-root .carmar-ai-wedge:hover::after,
.cn-root .carmar-ai-wedge:focus-visible::after{background:var(--cn-accent,#4e79a7);}
.cn-root .carmar-ai-panel.is-side.on-left .carmar-ai-sedge{right:0;}
.cn-root .carmar-ai-panel.is-side.on-right .carmar-ai-sedge{left:0;}
.cn-root .carmar-ai-sedge::before{
  content:"";position:absolute;top:0;bottom:0;left:4px;width:1px;background:#cbd8e6;
}
.cn-root .carmar-ai-sedge::after{
  content:"";position:absolute;top:50%;left:2px;width:5px;height:42px;
  transform:translateY(-50%);border-radius:999px;background:#9fb1c4;
  box-shadow:0 0 0 3px rgba(255,255,255,.78);
}
.cn-root .carmar-ai-sedge:hover::after,
.cn-root .carmar-ai-sedge:focus-visible::after{background:var(--cn-accent,#4e79a7);}
/* Printing a notebook must not print a chat column, or leave a hole where one
   was: the pane is screen furniture. */
@media print{
  .cn-root .carmar-ai-panel.is-side{display:none;}
  .cn-root.has-ai-left,.cn-root.has-ai-right{padding-left:0;padding-right:0;}
}

.cn-root .carmar-ai-head{
  display:flex;align-items:center;gap:8px;padding:8px 10px;flex:0 0 auto;
  border-bottom:1px solid #dde7f1;background:var(--cn-accent-soft,#eef3f8);
  /* WRAPS. A 400px side pane cannot hold ten controls on one line, and what
     fell off the end was the \xD7 \u2014 the pane had no visible way to close. Two
     short rows beat one row with the exit missing. */
  flex-wrap:wrap;
}
/* In the pane, Close says Close and owns the upper-left corner. Keeping it
   first means wrapping can move secondary actions, never the exit. */
.cn-root .carmar-ai-panel.is-side .carmar-ai-x{
  order:-10;margin:0 2px 0 0;display:inline-flex;align-items:center;gap:5px;
  padding:2px 9px;border:1px solid #b8ecec;border-radius:999px;
  font:600 var(--cn-fs-xs) var(--cn-font);
}
.cn-root .carmar-ai-panel.is-side .carmar-ai-x::after{content:"Close";}
.cn-root .carmar-ai-panel.is-side .carmar-ai-x:hover{background:#e0f5f5;}
.cn-root .carmar-ai-panel.is-float .carmar-ai-head{cursor:grab;}
.cn-root .carmar-ai-panel.is-float .carmar-ai-head:active{cursor:grabbing;}
.cn-root .carmar-ai-title{font:700 var(--cn-fs-xs) var(--cn-font);color:var(--cn-accent-deep,#3a6a9f);letter-spacing:.04em;}
/* The model is worth knowing but not worth a header slot: it sits quietly
   beside the Ask button, where the decision it affects is being made. */
.cn-root .carmar-ai-model{
  margin-right:auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;font:500 10px var(--cn-mono);cursor:pointer;
  padding:1px 0;border:0;background:none;color:var(--cn-text-muted);
  max-width:240px;text-align:left;
}
.cn-root .carmar-ai-model:hover{color:var(--cn-accent-deep,#3a6a9f);text-decoration:underline;}
.cn-root .carmar-ai-model.is-unset{color:#b3261e;border-color:#f5c6c2;}
.cn-root .carmar-ai-keep,.cn-root .carmar-ai-dock{
  flex:0 0 auto;font:600 10.5px var(--cn-font);cursor:pointer;
  padding:3px 10px;border:1px solid #cbd8e6;border-radius:999px;
  background:#fff;color:var(--cn-accent-deep,#3a6a9f);
}
.cn-root .carmar-ai-keep:hover,.cn-root .carmar-ai-dock:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-ai-x{
  flex:0 0 auto;border:0;background:none;cursor:pointer;font-size:17px;line-height:1;
  color:var(--cn-text-muted);padding:0 2px;
}
.cn-root .carmar-ai-x:hover{color:var(--cn-text);}

/* the thread */
/* The conversation hugs the composer. Content grows UPWARD from the box you
   type in \u2014 the empty room ends up above the first question, where nobody
   looks, instead of as a hole between the last answer and the input. */
.cn-root .carmar-ai-thread{
  flex:1 1 auto;min-height:64px;overflow-y:auto;padding:12px 14px;
  display:flex;flex-direction:column;justify-content:flex-end;gap:12px;background:#fff;
}
.cn-root .carmar-ai-thread > *{flex:0 0 auto;}
.cn-root .carmar-ai-empty{
  margin:auto;text-align:center;max-width:34ch;color:var(--cn-text-muted);
}
.cn-root .carmar-ai-headsp{flex:1 1 auto;}
/* the code-scope pair, inside the SEND row */
.cn-root .carmar-ai-scope{display:inline-flex;gap:3px;margin-left:-4px;}
.cn-root .carmar-ai-scopebtn{
  font:600 10px var(--cn-font);cursor:pointer;padding:1px 8px;
  border:1px solid #b8ecec;border-radius:999px;background:#fff;color:#0f766e;
}
.cn-root .carmar-ai-scopebtn.active{background:#e0f5f5;border-color:#b6c9dc;}
.cn-root .carmar-ai-scopebtn:disabled{opacity:.35;cursor:default;}
.cn-root .carmar-ai-emptytitle{font:600 var(--cn-fs) var(--cn-font);color:var(--cn-accent-deep,#3a6a9f);margin-bottom:4px;}
.cn-root .carmar-ai-emptyhint{font-size:var(--cn-fs-sm);line-height:1.5;}
.cn-root .carmar-ai-turn{display:flex;flex-direction:column;gap:3px;}
.cn-root .carmar-ai-who{
  display:flex;align-items:baseline;gap:8px;
  font:700 9.5px var(--cn-font);letter-spacing:.08em;text-transform:uppercase;
  color:#9aa0a6;
}
.cn-root .carmar-ai-turn.is-you .carmar-ai-who{color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-ai-meta{font-weight:400;letter-spacing:0;text-transform:none;font-size:10px;}
.cn-root .carmar-ai-turnbody{font-size:var(--cn-fs-sm);line-height:1.55;}
.cn-root .carmar-ai-turn.is-you .carmar-ai-turnbody{
  background:var(--cn-accent-soft,#eef3f8);border-radius:var(--cn-radius-sm);padding:7px 10px;white-space:pre-wrap;
}
.cn-root .carmar-ai-turnbody p{margin:.45em 0;}
.cn-root .carmar-ai-turnbody.is-pending{
  display:flex;align-items:center;gap:8px;color:var(--cn-text-muted);font-size:var(--cn-fs-sm);
}
.cn-root .carmar-ai-turnbody.is-pending .carmar-spinner{
  border-color:rgba(78,121,167,.3);border-top-color:var(--cn-accent,#4e79a7);
}
.cn-root .carmar-ai-turnbody pre{
  background:var(--ed-bg);border:1px solid var(--ed-border);
  border-radius:var(--cn-radius-sm);padding:8px 10px;overflow-x:auto;
  font-family:var(--cn-mono);font-size:12.5px;margin:.5em 0 0;
}
.cn-root .carmar-ai-cut{
  font-size:var(--cn-fs-sm);line-height:1.45;color:#92400e;
  background:#fffbeb;border:1px solid #fcd34d;border-radius:var(--cn-radius-sm);
  padding:6px 10px;margin-bottom:6px;
}
.cn-root .carmar-ai-reasoning{margin-top:8px;}
.cn-root .carmar-ai-reasoning > summary{
  cursor:pointer;font:600 10.5px var(--cn-font);color:var(--cn-text-muted);
  letter-spacing:.04em;text-transform:uppercase;
}
.cn-root .carmar-ai-reasoning > pre{
  margin:6px 0 0;padding:8px 10px;max-height:220px;overflow:auto;
  background:var(--cn-canvas);border:1px dashed var(--cn-border);
  border-radius:var(--cn-radius-sm);white-space:pre-wrap;word-break:break-word;
  font-family:var(--cn-mono);font-size:11.5px;color:var(--cn-text-muted);
}
.cn-root .carmar-ai-panel.is-float:not(.has-turns) .carmar-ai-thread{min-height:0;}
.cn-root .carmar-ai-codebar{display:flex;gap:6px;margin:5px 0 .5em;}
/* The whole-answer escape, not a code block's action row: set off from the
   prose above it, and last, so the per-block buttons keep their place. */
.cn-root .carmar-ai-codebar.is-answer{
  margin:9px 0 0;padding-top:7px;border-top:1px solid var(--cn-border-soft);
}
.cn-root .carmar-ai-codebtn{
  font:600 10.5px var(--cn-font);cursor:pointer;padding:2px 9px;
  border:1px solid #cbd8e6;border-radius:999px;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
}
.cn-root .carmar-ai-codebtn:hover{background:var(--cn-accent-soft,#eef3f8);}

/* the composer */
.cn-root .carmar-ai-composer{
  flex:0 0 auto;display:flex;flex-direction:column;gap:8px;
  padding:10px 12px 12px;border-top:1px solid #dde7f1;background:#f7fafd;
}
.cn-root .carmar-ai-chips{display:flex;gap:5px;flex-wrap:wrap;}

/* \u2500\u2500 tagged cells in the conversation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Chips above the question box; while picking, every cell advertises its
   clickability and the pane dims \u2014 the pointer is briefly a cell-picker. */
.cn-root .carmar-ai-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.cn-root .carmar-ai-tagbtn{
  font:600 11.5px var(--cn-font);color:var(--cn-accent);cursor:pointer;
  background:none;border:1px dashed color-mix(in srgb, var(--cn-accent) 45%, transparent);
  border-radius:999px;padding:2px 10px;
}
.cn-root .carmar-ai-tagbtn:hover{border-style:solid;background:color-mix(in srgb, var(--cn-accent) 8%, transparent);}
.cn-root .carmar-ai-tagchip{
  display:inline-flex;align-items:center;gap:5px;
  font:600 11.5px var(--cn-font);color:var(--cn-accent-deep);
  background:color-mix(in srgb, var(--cn-accent) 10%, transparent);
  border:1px solid color-mix(in srgb, var(--cn-accent) 30%, transparent);
  border-radius:999px;padding:2px 4px 2px 10px;
}
.cn-root .carmar-ai-tagx{
  font:600 10px var(--cn-font);color:inherit;cursor:pointer;line-height:1;
  background:none;border:0;padding:2px 5px;border-radius:999px;opacity:.6;
}
.cn-root .carmar-ai-tagx:hover{opacity:1;background:color-mix(in srgb, currentColor 12%, transparent);}
.cn-root.carmar-tagging .cell-stack .cell{
  cursor:copy;outline:2px dashed color-mix(in srgb, var(--cn-accent) 40%, transparent);
  outline-offset:2px;
}
.cn-root.carmar-tagging .cell-stack .cell:hover{
  outline:2px solid var(--cn-accent);
}
.cn-root .carmar-ai-codebtn.is-apply{color:var(--cn-accent);font-weight:700;}

/* The prose typeahead rides the code-completion popup's clothes; its rows
   are label-first (author-year / action name) with the detail receding. */
.cn-root .carmar-prosepop{max-width:440px;}
.cn-root .carmar-prosepop .carmar-ac-value{font-weight:600;flex:0 0 auto;}
.cn-root .carmar-prosepop .carmar-ac-detail{
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;
}
.cn-root .cell.carmar-applied{
  outline:2px solid var(--cn-accent);outline-offset:2px;
  transition:outline-color .9s ease .4s;
}
.cn-root .carmar-ai-chip{
  font:500 10.5px var(--cn-font);cursor:pointer;padding:3px 10px;
  border:1px solid #b8ecec;border-radius:999px;background:#fff;color:#0f766e;
}
.cn-root .carmar-ai-chip:hover{background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;}
.cn-root .carmar-ai-input{
  width:100%;box-sizing:border-box;resize:none;min-height:64px;
  font:inherit;font-size:var(--cn-fs-sm);line-height:1.5;
  padding:9px 11px;border:1px solid #cbd8e6;border-radius:var(--cn-radius-sm);
  background:#fff;color:var(--cn-text);
}
.cn-root .carmar-ai-input:focus{
  outline:none;border-color:var(--cn-accent,#4e79a7);box-shadow:0 0 0 3px rgba(78,121,167,.14);
}
.cn-root .carmar-ai-context,.cn-root .carmar-ai-style{
  display:flex;align-items:center;gap:10px;flex-wrap:wrap;
}
.cn-root .carmar-ai-ctxlabel{
  font:700 9.5px var(--cn-font);letter-spacing:.08em;text-transform:uppercase;
  color:#9aa0a6;flex:0 0 auto;
}
.cn-root .carmar-ai-toggle{
  display:inline-flex;align-items:center;gap:5px;cursor:pointer;
  font-size:11.5px;color:var(--cn-text);
}
.cn-root .carmar-ai-toggle input{margin:0;accent-color:var(--cn-accent,#4e79a7);}
.cn-root .carmar-ai-toggle.is-empty{opacity:.42;cursor:default;}
.cn-root .carmar-ai-tsize{font:10px var(--cn-mono);color:var(--cn-text-muted);}
.cn-root .carmar-ai-seg{
  font:600 11px var(--cn-font);cursor:pointer;padding:3px 10px;
  border:1px solid #b8ecec;border-radius:999px;background:#fff;color:#0f766e;
}
.cn-root .carmar-ai-seg.active{background:var(--cn-accent,#4e79a7);border-color:var(--cn-accent,#4e79a7);color:#fff;}
.cn-root .carmar-ai-codeonly{margin-left:auto;}
.cn-root .carmar-ai-send{display:flex;align-items:center;gap:10px;}
.cn-root .carmar-ai-hint{font:10.5px var(--cn-mono);color:var(--cn-text-muted);}
.cn-root .carmar-ai-sendbtn{
  font:600 var(--cn-fs-sm) var(--cn-font);cursor:pointer;padding:6px 20px;
  border-radius:999px;border:1px solid transparent;background:var(--cn-accent,#4e79a7);color:#fff;
}
.cn-root .carmar-ai-sendbtn:hover{filter:brightness(1.06);}
.cn-root .carmar-ai-sendbtn:disabled{opacity:.6;cursor:default;}
.cn-root .carmar-ai-sendbtn.is-stop{background:#c5221f;}
.cn-root .carmar-ai-grip{
  position:absolute;right:2px;bottom:2px;width:16px;height:16px;
  cursor:nwse-resize;touch-action:none;
  background:linear-gradient(135deg,transparent 50%,#b6c9dc 50%,#b6c9dc 60%,transparent 60%,transparent 72%,#b6c9dc 72%,#b6c9dc 82%,transparent 82%);
}
/* AI settings dialog extras */
.cn-root .carmar-ai-local{
  font-size:var(--cn-fs-xs);color:var(--cn-text-muted);
  border-top:1px solid var(--cn-border-soft);padding-top:8px;
}
.cn-root .carmar-ai-localrow{display:flex;align-items:center;gap:8px;margin-top:4px;}
.cn-root .carmar-ai-localname{flex:1 1 auto;}
.cn-root .carmar-ai-adopt{
  font:600 10.5px var(--cn-font);cursor:pointer;padding:2px 10px;
  border:1px solid var(--cn-border);border-radius:999px;background:var(--cn-control-bg);
}

/* \u2500\u2500 AI runtime: honest GPU loading + one transport-owned tally \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root .carmar-modal-panel.is-ai-runtime{width:min(620px,94vw);}
.cn-root .carmar-modal-panel.is-ai-models{width:min(760px,95vw);}
.cn-root .carmar-runtime-state,.cn-root .carmar-model-live{
  display:flex;align-items:flex-start;gap:10px;padding:11px 12px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);
  background:var(--cn-surface-soft,#fbfbfd);
}
.cn-root .carmar-runtime-state.is-live,.cn-root .carmar-model-live.is-live{
  border-color:#9fc0df;background:#f3f8fd;
}
.cn-root .carmar-runtime-state.is-error{border-color:#e6aaa5;background:#fff7f6;}
.cn-root .carmar-runtime-dot{
  flex:0 0 auto;width:9px;height:9px;margin-top:4px;border-radius:50%;
  background:#188038;box-shadow:0 0 0 3px rgba(24,128,56,.12);
}
.cn-root .is-live > .carmar-runtime-dot{
  background:var(--cn-accent,#4e79a7);box-shadow:0 0 0 3px rgba(78,121,167,.14);
  animation:carmar-runtime-pulse 1.4s ease-in-out infinite;
}
.cn-root .is-error > .carmar-runtime-dot{background:#c5221f;box-shadow:0 0 0 3px rgba(197,34,31,.12);}
@keyframes carmar-runtime-pulse{50%{opacity:.45;transform:scale(.82)}}
.cn-root .carmar-runtime-statecopy,.cn-root .carmar-model-livecopy{
  display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto;
}
.cn-root .carmar-runtime-statecopy strong,.cn-root .carmar-model-livecopy strong{
  font:650 var(--cn-fs-sm) var(--cn-font);color:var(--cn-text);
}
.cn-root .carmar-runtime-statecopy span,.cn-root .carmar-model-livecopy > span{
  font-size:11px;line-height:1.4;color:var(--cn-text-muted);overflow-wrap:anywhere;
}
.cn-root .carmar-model-stop{
  flex:0 0 auto;padding:5px 10px;border:1px solid #d59a96;border-radius:999px;
  background:#fff;color:#9f251f;font:650 10.5px var(--cn-font);cursor:pointer;
}
.cn-root .carmar-model-stop:hover{background:#fff4f3;border-color:#c86e68;}
.cn-root .carmar-model-stop:disabled{cursor:wait;opacity:.62;}
.cn-root .carmar-model-stop[hidden]{display:none;}
.cn-root .carmar-runtime-cards{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:10px 0;
}
.cn-root .carmar-runtime-card{
  display:flex;flex-direction:column;gap:1px;padding:9px 10px;
  border:1px solid var(--cn-border-soft);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);min-width:0;
}
.cn-root .carmar-runtime-card strong{
  font:650 17px/1.2 var(--cn-mono);color:var(--cn-accent-deep,#3a6a9f);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-runtime-card span{font-size:10px;color:var(--cn-text-muted);}
.cn-root .carmar-runtime-rows{display:grid;gap:0;margin:0;}
.cn-root .carmar-runtime-row{
  display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;
  padding:6px 2px;border-bottom:1px solid var(--cn-border-soft);font-size:11.5px;
}
.cn-root .carmar-runtime-row dt{color:var(--cn-text-muted);font-weight:600;}
.cn-root .carmar-runtime-row dd{
  margin:0;text-align:right;color:var(--cn-text);font-variant-numeric:tabular-nums;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-model-storage{
  margin:0 0 9px;font-size:11px;line-height:1.5;color:var(--cn-text-muted);
}
.cn-root .carmar-model-track{
  height:4px;margin-top:6px;border-radius:999px;overflow:hidden;background:var(--cn-border-soft);
}
.cn-root .carmar-model-bar{
  display:block;height:100%;width:0;border-radius:inherit;background:var(--cn-accent,#4e79a7);
  transition:width .2s ease;
}
.cn-root .carmar-model-list{display:flex;flex-direction:column;gap:7px;margin-top:10px;}
.cn-root .carmar-model-item{
  padding:10px 11px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);
  background:var(--cn-control-bg);
}
.cn-root .carmar-model-item.is-selected{border-color:#9fc0df;background:#f7faff;}
.cn-root .carmar-model-head,.cn-root .carmar-model-foot{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
}
.cn-root .carmar-model-head strong{font:650 var(--cn-fs-sm) var(--cn-font);color:var(--cn-text);}
.cn-root .carmar-model-badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;}
.cn-root .carmar-model-badges span{
  padding:1px 6px;border-radius:999px;font:700 9px var(--cn-font);letter-spacing:.04em;
  color:#4c5967;background:#eef1f4;
}
.cn-root .carmar-model-badges .is-ready{color:#137333;background:#e6f4ea;}
.cn-root .carmar-model-badges .is-selected{color:#315d8d;background:#e8f1fb;}
.cn-root .carmar-model-badges .is-cached{color:#6b4c00;background:#fff4d6;}
.cn-root .carmar-model-badges .is-partial{color:#8a5a00;background:#fff0cc;}
.cn-root .carmar-model-blurb{
  margin:4px 0 7px;font-size:11px;line-height:1.45;color:var(--cn-text-muted);
}
.cn-root .carmar-model-facts{font:10.5px var(--cn-mono);color:var(--cn-text-muted);}
.cn-root .carmar-model-actions{display:flex;gap:5px;flex:0 0 auto;}
.cn-root .carmar-model-action{
  cursor:pointer;padding:3px 9px;border:1px solid #b6c9dc;border-radius:999px;
  background:#fff;color:var(--cn-accent-deep,#3a6a9f);font:650 10.5px var(--cn-font);
}
.cn-root .carmar-model-action:hover:not(:disabled){background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-model-action:disabled{opacity:.45;cursor:default;}
.cn-root .carmar-model-action.is-delete{color:#b3261e;border-color:#e7bfbc;}
@media(max-width:650px){
  .cn-root .carmar-runtime-cards{grid-template-columns:repeat(2,minmax(0,1fr));}
  .cn-root .carmar-model-foot{align-items:flex-start;flex-direction:column;}
  .cn-root .carmar-model-actions{align-self:flex-end;}
}
.cn-root .carmar-modal-btn.is-danger{background:#c5221f;}
.cn-root .carmar-confirm-detail{
  margin:0;font-size:var(--cn-fs-sm);color:var(--cn-text-muted);line-height:1.45;
}

/* the panel head's small controls \u2014 New \xB7 History \xB7 Delete */
.cn-root .carmar-ai-mini{
  font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;padding:2px 8px;
  border:1px solid #cbd8e6;border-radius:999px;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
}
.cn-root .carmar-ai-mini:hover:not(:disabled){background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-ai-mini:disabled{opacity:.4;cursor:default;}
.cn-root .carmar-ai-mini.is-danger{color:#b3261e;border-color:#f0cfcc;}
.cn-root .carmar-ai-mini.is-danger:hover:not(:disabled){background:#fdeceb;}
.cn-root .carmar-ai-chatmeta{
  font:500 10.5px var(--cn-font);cursor:pointer;border:0;background:none;
  color:var(--cn-text-muted);padding:0 2px;
}
.cn-root .carmar-ai-chatmeta:hover{color:var(--cn-accent-deep,#3a6a9f);text-decoration:underline;}

/* \u2500\u2500 AI Settings \u2014 sections, not six boxes in a 460px column \u2500\u2500 */
.cn-root .carmar-modal-panel.is-settings{width:min(680px,94vw);}
.cn-root .carmar-set-sec{display:flex;flex-direction:column;gap:8px;}
.cn-root .carmar-set-sec + .carmar-set-sec{
  padding-top:12px;border-top:1px solid var(--cn-border-soft);
}
.cn-root .carmar-set-h{
  margin:0;font:600 var(--cn-fs-sm) var(--cn-font);color:var(--cn-text);
}
.cn-root .carmar-set-hint{
  margin:0;font-size:11px;line-height:1.45;color:var(--cn-text-muted);
}
.cn-root .carmar-set-row{display:flex;gap:6px;align-items:stretch;}
.cn-root .carmar-set-grow{flex:1 1 auto;min-width:0;}
.cn-root .carmar-model-row .carmar-gpu-choice{
  min-width:260px;max-width:100%;font:12px var(--cn-font);color:var(--cn-text);
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);padding:6px 8px;
}
.cn-root .carmar-set-btn.is-manage{border-color:#b6c9dc;color:var(--cn-accent-deep,#3a6a9f);}
@media(max-width:620px){
  .cn-root .carmar-model-row{flex-wrap:wrap;}
  .cn-root .carmar-model-row .carmar-gpu-choice{flex-basis:100%;}
}
/* beats the font:inherit shorthand on .carmar-fld input, which resets the
   family: a key is checked character by character, so it is monospaced */
.cn-root .carmar-modal-panel.is-settings input.carmar-set-key{
  font-family:var(--cn-mono);font-size:12px;letter-spacing:.02em;
}
.cn-root .carmar-set-btn{
  flex:0 0 auto;font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;padding:0 12px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-set-btn:hover:not(:disabled){background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;}
.cn-root .carmar-set-btn:disabled{opacity:.5;cursor:default;}
.cn-root .carmar-set-btn.is-test{border-color:#b6c9dc;color:var(--cn-accent-deep,#3a6a9f);background:#f0fdfd;}
.cn-root .carmar-set-picker{
  font:12px var(--cn-mono);padding:4px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);
}
/* What the chosen model costs, under the field where it is chosen. The band is
   the signal; the figures are a dated courtesy. */
.cn-root .carmar-set-cost{
  font-size:11px;line-height:1.5;color:var(--cn-text-muted);
  padding:2px 0 0 2px;
}
.cn-root .carmar-set-cost[data-band=free]{color:#137333;}
.cn-root .carmar-set-cost[data-band=very-low],
.cn-root .carmar-set-cost[data-band=low]{color:#1c6b32;}
.cn-root .carmar-set-cost[data-band=moderate]{color:#8a5a00;}
.cn-root .carmar-set-cost[data-band=high],
.cn-root .carmar-set-cost[data-band=very-high]{color:#b3261e;font-weight:600;}

/* \u2500\u2500 the price matrix \u2500\u2500 */
.cn-root .carmar-modal-panel.is-prices{width:min(820px,95vw);}
.cn-root .carmar-price{
  width:100%;border-collapse:collapse;margin:6px 0 14px;
  font-size:var(--cn-fs-xs);
}
.cn-root .carmar-price th{
  text-align:right;padding:5px 8px;font-weight:700;color:var(--cn-text-muted);
  border-bottom:1px solid var(--cn-border);white-space:nowrap;
}
.cn-root .carmar-price th:first-child,
.cn-root .carmar-price th:nth-child(2){text-align:left;}
.cn-root .carmar-price td{
  text-align:right;padding:5px 8px;border-bottom:1px solid var(--cn-border-soft);
  font-variant-numeric:tabular-nums;
}
.cn-root .carmar-price td.carmar-price-id{
  text-align:left;font-family:var(--cn-mono);font-size:11px;
}
.cn-root .carmar-price td.carmar-price-band{text-align:left;}
.cn-root .carmar-price td.is-out{font-weight:700;}
.cn-root .carmar-price tr.is-current{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-price tr.is-current td.carmar-price-id::after{
  content:" \u2190 in use";font-family:var(--cn-font);font-weight:700;color:var(--cn-accent-deep,#3a6a9f);
}

.cn-root .carmar-set-keynote{font-size:11px;color:var(--cn-text-muted);min-height:14px;}
.cn-root .carmar-set-keynote.is-ok{color:#137333;}
.cn-root .carmar-set-keynote.is-warn{color:#b06000;}
.cn-root .carmar-set-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.cn-root .carmar-prompt-input{
  width:100%;box-sizing:border-box;font:inherit;font-size:var(--cn-fs-sm);
  padding:7px 9px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-prompt-input:focus{outline:none;border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}

/* \u2500\u2500 the prompt editor \u2014 the words, and the right to change them \u2500\u2500 */
.cn-root .carmar-modal-panel.is-prompts{width:min(860px,95vw);}
.cn-root .carmar-pr-presets{
  display:flex;align-items:center;gap:6px;margin-bottom:10px;
  padding-bottom:10px;border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-pr-plabel{font:600 var(--cn-fs-xs) var(--cn-font);color:var(--cn-text-muted);}
.cn-root .carmar-pr-select{
  flex:1 1 auto;min-width:0;font:inherit;font-size:var(--cn-fs-sm);padding:5px 7px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-pr-presets .carmar-set-btn{padding:5px 10px;}
.cn-root .carmar-pr-wrap{
  display:grid;grid-template-columns:250px minmax(0,1fr);gap:0;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);overflow:hidden;
}
.cn-root .carmar-pr-side{
  display:flex;flex-direction:column;gap:2px;padding:8px;
  border-right:1px solid var(--cn-border-soft);background:var(--cn-surface-soft,#fbfbfd);
}
.cn-root .carmar-pr-item{
  display:flex;align-items:baseline;gap:6px;text-align:left;cursor:pointer;
  padding:7px 9px;border:1px solid transparent;border-radius:var(--cn-radius-sm);
  background:none;font:inherit;color:var(--cn-text);
}
.cn-root .carmar-pr-item:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-pr-item.is-active{background:#e0f5f5;border-color:#b6c9dc;}
.cn-root .carmar-pr-itemlabel{flex:1 1 auto;font-size:var(--cn-fs-sm);font-weight:600;line-height:1.35;}
.cn-root .carmar-pr-edited{
  flex:0 0 auto;font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;
  color:var(--cn-accent-deep,#3a6a9f);background:var(--cn-accent-soft,#eef3f8);border-radius:999px;padding:1px 6px;
}
.cn-root .carmar-pr-view{display:flex;flex-direction:column;gap:8px;padding:12px;min-width:0;}
.cn-root .carmar-pr-hint{font-size:11px;line-height:1.5;color:var(--cn-text-muted);}
.cn-root .carmar-pr-text{
  width:100%;box-sizing:border-box;resize:vertical;min-height:220px;
  font:13px/1.6 var(--cn-mono);padding:10px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-pr-text:focus{outline:none;border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}
.cn-root .carmar-pr-statusrow{display:flex;align-items:center;gap:8px;}
.cn-root .carmar-pr-status{flex:1 1 auto;font-size:11px;color:var(--cn-text-muted);}
.cn-root .carmar-pr-status.is-edited{color:var(--cn-accent-deep,#3a6a9f);font-weight:600;}
/* The entry's NAME, editable above its text \u2014 menus repeat what is typed here. */
.cn-root .carmar-pr-title{
  width:100%;box-sizing:border-box;font:600 var(--cn-fs,13px)/1.4 var(--cn-font);
  padding:7px 10px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm,6px);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-pr-title:focus{outline:none;border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}

/* \u2500\u2500 custom instructions \u2014 the short modal and the manager list \u2500\u2500 */
.cn-root .carmar-ci-row{display:flex;flex-direction:column;gap:4px;margin:0 0 10px;}
.cn-root .carmar-ci-label{font:600 10px/1.3 var(--cn-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--cn-text-dim);}
.cn-root .carmar-ci-input{
  width:100%;box-sizing:border-box;font:600 var(--cn-fs,13px)/1.4 var(--cn-font);
  padding:7px 10px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm,6px);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-ci-text{
  width:100%;box-sizing:border-box;resize:vertical;min-height:84px;
  font:13px/1.6 var(--cn-mono);padding:9px 10px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm,6px);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-ci-input:focus,.cn-root .carmar-ci-text:focus{outline:none;border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}
/* The instruction's Send row IS the chunk composer's context row (same
   classes); inside the modal it only needs its own breathing room. */
.cn-root .carmar-ci-send{margin:2px 0 4px;flex-wrap:nowrap;white-space:nowrap;}
/* Abridged CarmAI \u2014 Quick write's "Custom instruction\u2026": the composer alone.
   Everything the owner boxed in red is hidden; \u2715, title, model, + Chunk,
   Send row, composer, Answer row and the send button stay. */
.cn-root .carmar-aiw.is-abridged .carmar-aiw-r,
.cn-root .carmar-aiw.is-abridged .carmar-aiw-convbtn,
.cn-root .carmar-aiw.is-abridged .carmar-aiw-places,
.cn-root .carmar-aiw.is-abridged .carmar-aiw-history,
.cn-root .carmar-aiw.is-abridged .carmar-aiw-starters,
.cn-root .carmar-aiw.is-abridged .carmar-aiw-destination,
.cn-root .carmar-aiw.is-abridged .carmar-aiw-modes,
.cn-root .carmar-aiw.is-abridged .carmar-aiw-interpret{display:none !important;}
/* Wide enough for the whole Send row on one line \u2014 it IS the composer's row. */
.cn-root .carmar-modal-panel.is-custom-instruction{width:min(560px,94vw);}
.cn-root .carmar-ci-list{display:flex;flex-direction:column;gap:2px;min-height:120px;}
.cn-root .carmar-ci-item{
  display:flex;align-items:center;gap:10px;width:100%;text-align:left;cursor:pointer;
  border:0;border-radius:var(--cn-radius-sm,6px);background:transparent;padding:8px 10px;
}
.cn-root .carmar-ci-item:hover{background:color-mix(in srgb,var(--cn-accent) 8%,var(--cn-surface));}
.cn-root .carmar-ci-itemlabel{flex:1 1 auto;font:600 var(--cn-fs,13px)/1.4 var(--cn-font);color:var(--cn-text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-ci-itemhint{font:var(--cn-fs-sm,11px)/1.3 var(--cn-mono);color:var(--cn-text-dim);}
.cn-root .carmar-ci-empty{padding:26px 10px;text-align:center;font:var(--cn-fs-sm,11px)/1.5 var(--cn-font);color:var(--cn-text-muted);}

/* \u2500\u2500 the Settings page \u2014 every setting's door, one list \u2500\u2500 */
.cn-root .carmar-modal-panel.is-settings-page{width:min(560px,95vw);}
.cn-root .carmar-sp-list{display:flex;flex-direction:column;gap:2px;}
.cn-root .carmar-sp-sec{
  padding:12px 10px 4px;font:600 10px/1.3 var(--cn-mono);letter-spacing:.06em;
  text-transform:uppercase;color:var(--cn-text-dim);
}
.cn-root .carmar-sp-row{
  display:flex;align-items:center;gap:11px;width:100%;text-align:left;
  border:0;border-radius:var(--cn-radius-sm,6px);background:transparent;padding:9px 10px;cursor:pointer;
}
.cn-root .carmar-sp-row.is-inline{cursor:default;}
.cn-root .carmar-sp-row:not(.is-inline):hover{background:color-mix(in srgb,var(--cn-accent) 8%,var(--cn-surface));}
.cn-root .carmar-sp-ico{display:inline-flex;align-items:center;justify-content:center;width:16px;color:var(--cn-text-muted);}
.cn-root .carmar-sp-ico svg{display:block;}
.cn-root .carmar-sp-text{flex:1 1 auto;display:flex;flex-direction:column;gap:1px;min-width:0;}
.cn-root .carmar-sp-row.is-inline .carmar-sp-name{flex:1 1 auto;}
.cn-root .carmar-sp-name{font:600 var(--cn-fs,13px)/1.4 var(--cn-font);color:var(--cn-text);}
.cn-root .carmar-sp-hint{font:var(--cn-fs-sm,11px)/1.4 var(--cn-font);color:var(--cn-text-muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-sp-go{color:var(--cn-text-dim);font-size:15px;line-height:1;}
.cn-root .carmar-sp-select{
  font:inherit;font-size:var(--cn-fs-sm,11px);padding:5px 8px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm,6px);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-sp-seg{display:inline-flex;gap:1px;padding:2px 3px;border-radius:9px;background:rgba(0,0,0,.045);}
.cn-root .carmar-sp-segbtn{
  border:0;background:transparent;cursor:pointer;border-radius:6px;padding:4px 11px;
  font:500 var(--cn-fs-sm,11px)/1.3 var(--cn-font);color:var(--cn-text-muted);
}
.cn-root .carmar-sp-segbtn.is-on{background:var(--cn-surface);color:var(--cn-text);box-shadow:0 1px 2px rgba(0,0,0,.10);}
.cn-root .carmar-sp-style-seg,.cn-root .carmar-sp-line-seg{flex:0 0 auto;}
.cn-root .carmar-sp-stylebtn,.cn-root .carmar-sp-linebtn{
  border:0;background:transparent;cursor:pointer;border-radius:6px;padding:4px 10px;
  font:500 var(--cn-fs-sm,11px)/1.3 var(--cn-font);color:var(--cn-text-muted);
}
.cn-root .carmar-sp-stylebtn:hover,.cn-root .carmar-sp-linebtn:hover{color:var(--cn-text);}
.cn-root .carmar-sp-stylebtn.is-on,.cn-root .carmar-sp-linebtn.is-on{
  background:var(--cn-surface);color:var(--cn-text);box-shadow:0 1px 2px rgba(0,0,0,.10);
}

/* \u2500\u2500 the AI Chats tab \u2014 every conversation, kept \u2500\u2500 */
.cn-root .carmar-hist{
  display:grid;grid-template-columns:288px minmax(0,1fr);gap:0;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);
  background:var(--cn-surface);min-height:420px;overflow:hidden;
}
.cn-root .carmar-hist-side{
  display:flex;flex-direction:column;gap:8px;padding:10px;
  border-right:1px solid var(--cn-border-soft);background:var(--cn-surface-soft,#fbfbfd);
}
.cn-root .carmar-hist-search{
  font:inherit;font-size:var(--cn-fs-sm);padding:6px 9px;box-sizing:border-box;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-hist-search:focus{outline:none;border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}
.cn-root .carmar-hist-list{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:3px;}
.cn-root .carmar-hist-row{
  display:flex;flex-direction:column;gap:2px;text-align:left;cursor:pointer;
  padding:7px 9px;border:1px solid transparent;border-radius:var(--cn-radius-sm);
  background:none;font:inherit;color:var(--cn-text);
}
.cn-root .carmar-hist-row:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-hist-row.active{background:#e0f5f5;border-color:#b6c9dc;}
.cn-root .carmar-hist-rtitle{font-size:var(--cn-fs-sm);font-weight:600;line-height:1.35;}
.cn-root .carmar-hist-rmeta{font-size:10.5px;color:var(--cn-text-muted);}
.cn-root .carmar-hist-rcell{
  font:10.5px var(--cn-mono);color:var(--cn-text-muted);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-hist-none{font-size:var(--cn-fs-sm);color:var(--cn-text-muted);padding:10px 4px;line-height:1.5;}
.cn-root .carmar-hist-clear{
  flex:0 0 auto;font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;padding:5px 10px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:#b3261e;
}
.cn-root .carmar-hist-clear:hover{background:#fdeceb;}
.cn-root .carmar-hist-view{display:flex;flex-direction:column;min-width:0;}
.cn-root .carmar-hist-head{
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:12px 14px;
  border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-hist-titles{flex:1 1 220px;min-width:0;}
.cn-root .carmar-hist-title{font:600 var(--cn-fs) var(--cn-font);line-height:1.35;}
.cn-root .carmar-hist-sub{font-size:11px;color:var(--cn-text-muted);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cn-root .carmar-hist-act{
  flex:0 0 auto;font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;padding:4px 10px;
  border:1px solid var(--cn-border);border-radius:999px;
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-hist-act:hover:not(:disabled){background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;}
.cn-root .carmar-hist-act:disabled{opacity:.4;cursor:default;}
.cn-root .carmar-hist-act.is-danger{color:#b3261e;}
.cn-root .carmar-hist-body{flex:1 1 auto;min-height:0;overflow:auto;padding:14px;display:flex;
  flex-direction:column;gap:14px;}
.cn-root .carmar-hist-turn{display:flex;flex-direction:column;gap:3px;}
.cn-root .carmar-hist-who{
  font:700 10px var(--cn-font);letter-spacing:.06em;text-transform:uppercase;
  color:var(--cn-text-muted);
}
.cn-root .carmar-hist-turn.is-you .carmar-hist-who{color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-hist-said{font-size:var(--cn-fs-sm);line-height:1.6;}
.cn-root .carmar-hist-turn.is-you .carmar-hist-said{
  background:#f0fdfd;border-left:2px solid #a6e6e6;padding:6px 10px;
  border-radius:0 var(--cn-radius-sm) var(--cn-radius-sm) 0;white-space:pre-wrap;
}
.cn-root .carmar-hist-said pre{
  background:var(--cn-code-bg,#f6f8fa);padding:9px 11px;border-radius:var(--cn-radius-sm);
  overflow:auto;font-size:12px;
}
.cn-root .carmar-hist-empty{padding:34px 26px;max-width:520px;}
.cn-root .carmar-hist-etitle{font:600 var(--cn-fs-lg) var(--cn-font);color:var(--cn-accent-deep,#3a6a9f);margin-bottom:6px;}
.cn-root .carmar-hist-ehint{font-size:var(--cn-fs-sm);line-height:1.6;color:var(--cn-text-muted);}

@media print{.cn-root .carmar-ai-group,.cn-root .carmar-ai-foot,.cn-root .carmar-ai-panel{display:none;}}

/* \u2500\u2500 hover help \u2014 rest on a name, see what it is \u2500\u2500 */
/* \u2500\u2500 signature help \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   One line, monospace, sitting just off the caret. Quieter than the hover
   card on purpose: it appears WHILE you type, so anything with a border and a
   shadow the size of the hover popup would feel like an interruption every
   time you open a bracket. The active argument is the only emphasis. */
.cn-root .carmar-sig{
  position:fixed;z-index:790;max-width:min(560px,80vw);
  padding:5px 9px;border-radius:var(--cn-radius-sm,6px);
  background:var(--cn-surface);border:1px solid var(--cn-border);
  box-shadow:var(--cn-shadow-md,0 2px 8px rgba(0,0,0,.12));pointer-events:none;
  font-family:var(--cn-mono);font-size:12px;line-height:1.5;color:#3c4043;
  white-space:pre-wrap;word-break:break-word;
}
.cn-root .carmar-sig-name{color:#1c5391;}
.cn-root .carmar-sig-active{font-weight:700;color:#202124;background:rgba(78,121,167,.16);border-radius:3px;}
.cn-root .carmar-sig-detail{
  display:block;margin-top:2px;font-family:var(--cn-font,system-ui);font-size:10.5px;
  color:var(--cn-text-dim,#9aa0a6);
}
.cn-root .carmar-hover{
  position:fixed;z-index:800;max-width:min(460px,70vw);
  padding:9px 12px;border-radius:var(--cn-radius-md);
  background:var(--cn-surface);border:1px solid var(--cn-border);
  box-shadow:var(--cn-shadow-lg);pointer-events:none;
}
.cn-root .carmar-hover-head{
  display:flex;align-items:baseline;gap:8px;margin-bottom:2px;
}
.cn-root .carmar-hover-name{
  font-family:var(--cn-mono);font-size:12.5px;color:#1c5391;
  white-space:pre-wrap;word-break:break-word;flex:1 1 auto;
}
.cn-root .carmar-hover-pkg{
  font-size:10px;letter-spacing:.03em;text-transform:uppercase;
  color:var(--cn-text-muted);flex:0 0 auto;
}
.cn-root .carmar-hover-detail{
  font-family:var(--cn-mono);font-size:11.5px;color:var(--cn-text-muted);
}
.cn-root .carmar-hover-title{font-size:var(--cn-fs-sm);font-weight:600;margin-top:4px;}
.cn-root .carmar-hover-desc{
  font-size:var(--cn-fs-sm);color:var(--cn-text-muted);line-height:1.45;margin-top:2px;
}
.cn-root .carmar-hover-more{
  font-size:10.5px;color:var(--cn-text-muted);opacity:.75;margin-top:6px;
  border-top:1px solid var(--cn-border-soft);padding-top:5px;
}
/* Focused: the focus ring AND the state edge \u2014 a green cell that you click
   into must not look like a cell that never ran. */
.cn-root .carmar-editor:focus-within{
  border-color:var(--cn-accent);
  box-shadow:inset 3px 0 0 var(--carmar-state,transparent), var(--cn-focus-ring);
}

/* \u2500\u2500 the cell's one control strip: exec \xB7 Run \xB7 \u2318\u21B5 \xB7 status \xB7 \u2699 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root .carmar-ai-turnbody pre{
  max-width:100%; min-width:0; overflow-x:hidden;
  white-space:pre-wrap; overflow-wrap:anywhere; word-break:normal;
}
.cn-root .carmar-ai-turnbody pre code{
  white-space:inherit; overflow-wrap:inherit; word-break:inherit;
}

.cn-root .carmar-chunk-options{
  flex:1 0 100%; display:flex; align-items:center; min-width:240px;
  padding:2px 0 7px; margin-bottom:5px; border-bottom:1px solid var(--cn-line);
}
.cn-root .carmar-chunk-option{
  display:flex; align-items:center; gap:9px; cursor:pointer; color:var(--cn-ink);
}
.cn-root .carmar-chunk-option:has(input:disabled){ cursor:not-allowed; opacity:.58; }
.cn-root .carmar-chunk-option-input{
  width:15px; height:15px; margin:0; accent-color:var(--cn-blue); cursor:inherit;
}
.cn-root .carmar-chunk-option-copy{ display:flex; flex-direction:column; gap:1px; }
.cn-root .carmar-chunk-option-title{ font-size:12px; font-weight:700; line-height:1.25; }
.cn-root .carmar-chunk-option-hint{ font-size:10px; color:var(--cn-muted); line-height:1.25; }

.cn-root .carmar-editor-foot{
  display:flex;align-items:center;gap:10px;padding:4px 10px;min-width:0;
  border-top:1px solid var(--cn-border);background:var(--cn-surface);
}

/* \u2500\u2500 toolbar discipline: a control keeps its shape at every width \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The foot is one flex row holding up to ten items, and flex's default is to
   shrink them all \u2014 which crushed each 999px pill down to its own padding: a
   row of dots. Buttons never shrink and never wrap their label; the two TEXT
   narrators (status, badge) absorb squeeze by truncating; past that the row
   WRAPS to more lines. Plain flexbox only: the previous version keyed compact
   tiers on at-container queries with container:carmar-chunk/inline-size on
   the editor, and that containment broke click hit-testing on a real user's
   Chrome (invisible dead slivers on Run). Wrapping needs no containment and
   nothing is ever crushed or unreachable. */
.cn-root .carmar-editor-foot{flex-wrap:wrap;row-gap:4px;}
.cn-root .carmar-editor-foot > *{flex:0 0 auto;}
.cn-root .carmar-editor-foot button{white-space:nowrap;}
.cn-root .carmar-editor-foot .carmar-editor-status{
  flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-editor-foot .carmar-chunk-badge{
  flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
}
/* The width-adaptive label pairs are inert without the tiers: the full
   wording always shows, the short form never does. */
.cn-root .carmar-label-short{display:none;}

/* \u2500\u2500 the run chip: what this cell is doing, in its footer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   One state at a time: queued, running (live elapsed), done-with-duration,
   failed, interrupted, skipped. An edited-since-run cell tints its \u2713 amber
   through the cell's existing carmar-stale class \u2014 the chip itself never
   has to know about editing. */
.cn-root .carmar-runchip{
  font:600 10.5px var(--cn-mono);letter-spacing:.02em;white-space:nowrap;
  padding:2px 9px;border-radius:999px;margin-left:auto;
}
.cn-root .carmar-runchip[data-state="idle"]{display:none;}
.cn-root .carmar-runchip[data-state="queued"]{
  color:var(--cn-text-dim);background:color-mix(in srgb, currentColor 10%, transparent);
}
.cn-root .carmar-runchip[data-state="running"]{
  color:var(--cn-accent);background:color-mix(in srgb, var(--cn-accent) 12%, transparent);
  animation:carmar-chip-pulse 1.2s ease-in-out infinite;
}
@keyframes carmar-chip-pulse{0%,100%{opacity:1}50%{opacity:.55}}
@media (prefers-reduced-motion: reduce){
  .cn-root .carmar-runchip[data-state="running"]{animation:none;}
}
.cn-root .carmar-runchip[data-state="ok"]{
  color:#1a7f37;background:color-mix(in srgb, #1a7f37 10%, transparent);
}
.cn-root .carmar-runchip[data-state="err"]{
  color:#c0392b;background:color-mix(in srgb, #c0392b 10%, transparent);
}
.cn-root .carmar-runchip[data-state="int"]{
  color:#9a6700;background:color-mix(in srgb, #9a6700 10%, transparent);
}
.cn-root .carmar-runchip[data-state="skipped"]{
  color:var(--cn-text-dim);background:color-mix(in srgb, currentColor 7%, transparent);
  font-style:italic;
}
.cn-root .cell.carmar-stale .carmar-runchip[data-state="ok"]{
  color:#9a6700;background:color-mix(in srgb, #9a6700 12%, transparent);
}
.cn-root .cell.carmar-stale .carmar-runchip[data-state="ok"]::before{
  content:"edited \xB7 ";
}

/* \u2500\u2500 the run pill: the header narrates a batch \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root header .carmar-runpill{
  display:inline-flex;align-items:center;gap:8px;
  font:600 11px ui-sans-serif,system-ui,sans-serif;
  color:var(--cn-on-dark,#fff);
  background:rgba(255,255,255,.14);border-radius:999px;
  padding:3px 4px 3px 11px;
}
.cn-root header .carmar-runpill-stop{
  font:700 10.5px ui-sans-serif,system-ui,sans-serif;
  color:#fff;background:#c0392b;border:0;border-radius:999px;
  padding:2px 10px;cursor:pointer;
}
.cn-root header .carmar-runpill-stop:disabled{opacity:.55;cursor:default;}

/* \u2500\u2500 publication tables \u2014 APA rules, the aistatia way \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   A heavy rule above the header, a hairline under it, a heavy rule to
   close, no vertical lines, numbers right-aligned in tabular figures.
   Compact tightens the same shape for wide models. */
.cn-root .carmar-pubwrap{overflow-x:auto;margin:6px 0;}
.cn-root .carmar-pub-caption{
  font-size:11.5px;opacity:.65;margin:2px 0 6px;font-style:italic;
}
.cn-root table.carmar-pub{
  border-collapse:collapse;font-size:13px;min-width:320px;
  font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
}
.cn-root .carmar-pub th{
  text-align:left;font-weight:600;font-size:12.5px;letter-spacing:.01em;
  padding:6px 14px;white-space:nowrap;
  border-top:2px solid color-mix(in srgb, currentColor 85%, transparent);
  border-bottom:1px solid color-mix(in srgb, currentColor 40%, transparent);
}
.cn-root .carmar-pub td{padding:5px 14px;border:0;}
.cn-root .carmar-pub tbody tr:last-child td{
  border-bottom:2px solid color-mix(in srgb, currentColor 85%, transparent);
}
.cn-root .carmar-pub th.r,.cn-root .carmar-pub td.r{
  text-align:right;font-variant-numeric:tabular-nums;
}
.cn-root .carmar-pub th.c,.cn-root .carmar-pub td.c{text-align:center;}
.cn-root .carmar-pubwrap.is-compact table.carmar-pub{font-size:11.5px;}
.cn-root .carmar-pubwrap.is-compact .carmar-pub th{padding:3px 9px;font-size:11px;}
.cn-root .carmar-pubwrap.is-compact .carmar-pub td{padding:2.5px 9px;}

/* The style select in the table toolbar \u2014 quiet, control-shaped. */
.cn-root .carmar-tablestyle{
  font:inherit;font-size:11px;color:inherit;
  background:var(--cn-control-bg);border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);padding:3px 6px;
}
.cn-root .carmar-table-print{margin:6px 0;}

/* The prose-table export button: floats onto the hovered table. */
.cn-root .carmar-tblexport,
.carmar-tblexport{
  position:fixed;z-index:300;width:24px;height:24px;
  font-size:13px;line-height:1;border-radius:6px;cursor:pointer;
  color:var(--cn-text,#333);background:var(--cn-surface,#fff);
  border:1px solid var(--cn-border,#d6dbe1);
  box-shadow:0 1px 5px rgba(0,0,0,.12);
}
.carmar-tblexport[hidden]{display:none;}
.carmar-tblexport:hover{color:var(--cn-accent,#3d6491);}

/* \u2500\u2500 output \u2500\u2500 */
.cn-root .carmar-output{margin-top:4px;display:flex;flex-direction:column;gap:3px;}
.cn-root .carmar-console,.cn-root .carmar-stream{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;
  margin:0;padding:10px 12px;border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);border:1px solid var(--cn-border);
}
.cn-root .carmar-stderr{border-left:3px solid #b45309;}
.cn-root .carmar-warning{border-left:3px solid #b45309;}
.cn-root .carmar-message{border-left:3px solid var(--cn-accent);}
/* \u2500\u2500 message blocks: consecutive messages of one kind are ONE console block
   with a single subtle left rule \u2014 never a card per line. Startup chatter
   (kind "message") hides behind a one-line toggle by default. \u2500\u2500 */
.cn-root .carmar-msgs{display:flex;flex-direction:column;gap:4px;}
.cn-root .carmar-msgs-pre{border-left:2px solid var(--cn-border-strong);}
.cn-root .carmar-msgs-warning .carmar-msgs-pre{border-left-color:#b45309;}
.cn-root .carmar-msgs-toggle{
  align-self:flex-start;font-family:var(--cn-mono);font-size:11px;line-height:1.4;
  color:var(--cn-text-muted);background:transparent;border:0;cursor:pointer;
  padding:2px 4px;border-radius:var(--cn-radius-sm);
}
.cn-root .carmar-msgs-toggle:hover{background:var(--cn-control-bg);color:var(--cn-text);}
.cn-root .carmar-banner{
  padding:8px 12px;border-radius:var(--cn-radius-sm);font-size:var(--cn-fs-xs);
}
.cn-root .carmar-banner-error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;}
.cn-root .carmar-banner-interrupted{background:#fffbeb;border:1px solid #fde68a;color:#92400e;}
.cn-root .carmar-empty-result{font-size:var(--cn-fs-xs);opacity:.55;font-style:italic;}

/* \u2500\u2500 plots: a plot pane, with zoom stops \u2500\u2500 */
.cn-root .carmar-figure{
  margin:0;padding:0;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-surface);overflow:auto;
}
.cn-root .carmar-plot{display:block;height:auto;margin-inline:auto;}
.cn-root .carmar-figure-tools{
  display:flex;align-items:center;gap:2px;padding:4px 6px;
  border-top:1px solid var(--cn-border);position:sticky;left:0;
  background:var(--cn-surface);
  /* A hover toolbar, but by OPACITY \u2014 the strip keeps its box, so revealing
     it never shifts the cells below (the staircase-reflow rule). */
  opacity:0;transition:opacity .15s ease;
}
.cn-root .carmar-figure:hover .carmar-figure-tools,
.cn-root .carmar-figure:focus-within .carmar-figure-tools,
.cn-root .carmar-figure:fullscreen .carmar-figure-tools{opacity:1;}
@media (hover:none){.cn-root .carmar-figure-tools{opacity:1;}}
.cn-root .carmar-tools-sp{flex:1;}
.cn-root .carmar-zoomgroup{
  display:inline-flex;align-items:center;
  border:1px solid var(--cn-border);border-radius:6px;background:var(--cn-control-bg);
}
.cn-root .carmar-zoomgroup .carmar-figure-btn{border:0;background:none;}
.cn-root .carmar-figure-btn{
  display:inline-grid;place-items:center;width:26px;height:24px;padding:0;
  font:inherit;font-size:12px;line-height:1;cursor:pointer;
  border:0;border-radius:6px;background:none;color:var(--cn-text);opacity:.72;
}
.cn-root .carmar-figure-btn:hover{opacity:1;background:rgba(0,0,0,.06);color:var(--cn-accent-deep);}
.cn-root .carmar-figure-btn:active{background:rgba(0,0,0,.1);}
.cn-root .carmar-figure-btn:focus-visible{outline:2px solid var(--cn-accent);outline-offset:1px;opacity:1;}
.cn-root .carmar-figure-btn svg{display:block;}
.cn-root .carmar-zoom-label{
  font-size:11px;opacity:.6;min-width:4ch;text-align:center;
  font-variant-numeric:tabular-nums;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
.cn-root .carmar-figure:fullscreen{display:grid;place-content:center;background:var(--cn-surface);}

/* \u2500\u2500 popups (menu-pop.js): fixed on .cn-root, outside every cell's overflow \u2500\u2500 */
.cn-root .carmar-pop{
  position:fixed;z-index:1000;min-width:210px;padding:4px;
  display:flex;flex-direction:column;
  background:var(--cn-control-bg);border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);box-shadow:0 8px 28px rgba(0,0,0,.16);
}
.cn-root .carmar-pop[hidden]{display:none!important;}
.cn-root .carmar-pop-item{
  font:inherit;font-size:12px;text-align:left;padding:6px 10px;cursor:pointer;
  border:0;border-radius:4px;background:none;color:var(--cn-text);white-space:nowrap;
}
.cn-root .carmar-pop-item:hover{background:var(--cn-surface);color:var(--cn-accent-deep);}

/* \u2500\u2500 tables: the filter / sort / export toolbar \u2500\u2500 */
.cn-root .carmar-tablebar{
  display:flex;align-items:center;gap:4px;margin:0 0 3px;padding:3px 5px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-surface);
}
.cn-root .carmar-output-bar.carmar-tablebar.is-table-result{
  opacity:1;margin:3px 0 0;min-height:31px;flex-wrap:nowrap;
}
.cn-root .carmar-output-bar.carmar-tablebar.is-table-result .carmar-fold{
  flex:0 0 24px;width:24px;height:24px;padding:0;
}
.cn-root .carmar-output-bar.carmar-tablebar.is-table-result .carmar-clear{margin-left:2px;}
.cn-root .carmar-tablesearch{
  font:inherit;font-size:12px;padding:4px 9px;width:160px;
  border:1px solid var(--cn-border);border-radius:6px;
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-tablesearch::placeholder{color:var(--cn-text);opacity:.4;}
.cn-root .carmar-tablesearch:focus{outline:none;border-color:var(--cn-accent);}
.cn-root .carmar-tablenote{
  font-size:11px;opacity:.6;margin-right:auto;padding-left:4px;
  font-variant-numeric:tabular-nums;
}
.cn-root .carmar-table-inline-nav{display:inline-flex;align-items:center;gap:3px;white-space:nowrap;}
.cn-root .carmar-table-navbtn{
  width:22px;height:22px;padding:0;border:1px solid var(--cn-border);border-radius:5px;
  background:var(--cn-control-bg);color:var(--cn-text-muted);cursor:pointer;
}
.cn-root .carmar-table-navbtn:disabled{opacity:.3;cursor:default;}
.cn-root .carmar-table-navrange{font:10px var(--cn-mono);color:var(--cn-text-muted);font-variant-numeric:tabular-nums;}
.cn-root .carmar-result-grid-wrap{
  max-width:100%;overflow:auto;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-surface);
}
.cn-root table.carmar-result-grid{
  width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;
  font:11.5px/1.3 var(--cn-font);font-variant-numeric:tabular-nums;
}
.cn-root .carmar-result-grid th{
  position:sticky;top:0;z-index:1;padding:4px 8px;text-align:left;white-space:nowrap;
  border:0;border-bottom:1.5px solid var(--cn-text-muted);background:var(--cn-surface);
  color:var(--cn-text);font-weight:650;
}
.cn-root .carmar-result-grid td{
  padding:3px 8px;white-space:nowrap;border:0;border-bottom:1px solid color-mix(in srgb,var(--cn-border) 55%,transparent);
  color:var(--cn-text);
}
.cn-root .carmar-result-grid tbody tr:last-child td{border-bottom:0;}
.cn-root .carmar-result-grid tbody tr:hover td{background:var(--cn-control-bg);}
.cn-root .carmar-result-grid td.is-num{text-align:right;}
.cn-root .carmar-result-grid td.is-selected{
  background:var(--cn-accent-soft)!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cn-accent) 55%,transparent);
}
.cn-root .carmar-result-grid:focus{outline:2px solid color-mix(in srgb,var(--cn-accent) 32%,transparent);outline-offset:-2px;}
.cn-root .carmar-copy-menu{min-width:220px;padding:4px;}
.cn-root .carmar-copy-menu .carmar-pop-item{
  display:flex;align-items:center;gap:8px;min-height:28px;padding:5px 8px;
}
.cn-root .carmar-copy-menu .carmar-pop-item svg{flex:0 0 14px;width:14px;height:14px;opacity:.72;}
.cn-root .carmar-copy-menu .carmar-pop-item[hidden]{display:none!important;}
.cn-root .carmar-copy-menu .carmar-pop-item:disabled{opacity:.38;cursor:default;}
.cn-root .carmar-tbl-btn{
  width:auto;height:24px;padding:0 9px;display:inline-flex;align-items:center;gap:5px;
}
.cn-root .carmar-tbl-btn span{font-size:11.5px;font-weight:500;}
.cn-root .carmar-tbl-btn .carmar-tbl-glyph{
  display:inline-flex;align-items:center;justify-content:center;min-width:14px;
  font:600 14px/1 var(--cn-font);color:currentColor;
}
.cn-root .carmar-th-sort{cursor:pointer;user-select:none;position:relative;}
.cn-root .carmar-th-sort:hover{color:var(--cn-accent-deep);}
.cn-root .carmar-th-sort[data-sort]{color:var(--cn-accent-deep);}
.cn-root .carmar-th-sort[data-sort="asc"]::after{content:" \u25B4";color:var(--cn-accent);}
.cn-root .carmar-th-sort[data-sort="desc"]::after{content:" \u25BE";color:var(--cn-accent);}

/* \u2500\u2500 prose cells: flat. A heading is a heading, not a card with a form in it. \u2500\u2500 */
.cn-root .cell.carmar-md-cell,
.cn-root .cell.carmar-md-cell:hover{
  background:transparent;border-color:transparent;box-shadow:none;
  /* The gutter mark hangs left of the cell and the seam below it: both are
     absolutely positioned chrome that must not be clipped. Core's cell clips
     for its rounded card; a flat prose cell has nothing to clip. */
  overflow:visible;
}
.cn-root .carmar-md-cell .btn-run,
.cn-root .carmar-md-cell .cell-timing,
.cn-root .carmar-md-cell .cell-run-icon,
.cn-root .carmar-md-cell .run-btn{display:none;}
.cn-root .carmar-md-cell .cell-body,
/* No rule under a prose cell either (core's form border): paragraphs flow
   into the next cell's paragraphs; the seam draws its own hairline only
   while the pointer rests on the gap. */
.cn-root .carmar-md-cell .cell-form{padding-top:0;padding-bottom:0;border-bottom:0;}
.cn-root .carmar-md-wrap{padding:2px 0;}
/* The block list wears the prose typography (.carmar-md) and no box of its
   own: every block is its own quiet row (see "block editing" below). */
.cn-root .carmar-md-wrap .carmar-md{cursor:text;border-radius:var(--cn-radius-sm);}
.cn-root .carmar-md-placeholder{opacity:.4;font-style:italic;}
/* Source mode (View \u25B8 Source Mode): the whole document as the .qmd it is.
   Surfaces stay open at rest, so the "live" accent hairline dims to neutral
   \u2014 nothing is being edited, everything is simply source. */
.cn-root .carmar-md-wrap.is-source .carmar-prose{
  box-shadow:inset 2px 0 0 color-mix(in srgb, currentColor 15%, transparent);
}

/* \u2500\u2500 the writing surface \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The same overlay contract as the R editor: a coloured <pre> underneath, a
   transparent-text textarea on top, metrics identical to the glyph. The
   wrapper carries the box (border, background, focus ring); the two layers
   inside it carry NOTHING that could differ \u2014 same font, same padding, no
   borders of their own. Prose is set at reading size in the UI face: this is
   a writing surface, not a form field. */
/* No box. Writing happens on the PAGE \u2014 the toolbar above and the caret are
   the editing signals; a border plus a glow ring around 15.5px prose reads
   as a form field and feels like a cage. A hairline accent on the left edge
   is the only boundary: it says "live" without enclosing anything. */
.cn-root .carmar-prose{
  position:relative;border:0;border-radius:0;background:transparent;
  /* Painted, not laid out: an inset shadow costs no width, so the words of
     an opening block stay on the same x as their rendered face. */
  box-shadow:inset 2px 0 0 color-mix(in srgb, var(--cn-accent) 45%, transparent);
}
.cn-root .carmar-prose[hidden]{display:none;}
.cn-root .carmar-prose-hl,
.cn-root textarea.carmar-md-input{
  font-family:var(--cn-font);font-size:15.5px;line-height:1.7;
  white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;tab-size:4;
  width:100%;box-sizing:border-box;margin:0;padding:12px 16px;border:0;
}
.cn-root .carmar-prose-hl{
  position:absolute;inset:0;overflow:hidden;pointer-events:none;
  color:var(--cn-text);background:transparent;
}
.cn-root textarea.carmar-md-input{
  position:relative;display:block;resize:none;overflow:hidden;outline:none;
  background:transparent;color:transparent;caret-color:var(--cn-text);
}
.cn-root textarea.carmar-md-input::selection{
  background:color-mix(in srgb, var(--cn-accent) 24%, transparent);
}
.cn-root textarea.carmar-md-input::placeholder{color:var(--cn-text);opacity:.35;}

/* Markdown source tokens \u2014 colour, background, decoration and a hairline
   text-shadow only: nothing that moves a glyph. Markers recede, prose leads. */
.cn-root .carmar-prose-hl .mdh-mark{opacity:.35;}
.cn-root .carmar-prose-hl .mdh-bullet{color:var(--cn-accent);}
.cn-root .carmar-prose-hl .mdh-h{color:var(--cn-accent-deep);text-shadow:0 0 .55px currentColor;}
.cn-root .carmar-prose-hl .mdh-b{text-shadow:0 0 .6px currentColor;}
.cn-root .carmar-prose-hl .mdh-i{color:color-mix(in srgb, var(--cn-text) 62%, var(--cn-accent));}
.cn-root .carmar-prose-hl .mdh-del{text-decoration:line-through;opacity:.55;}
.cn-root .carmar-prose-hl .mdh-code{
  background:color-mix(in srgb, currentColor 9%, transparent);border-radius:3px;
}
.cn-root .carmar-prose-hl .mdh-fence{opacity:.45;}
.cn-root .carmar-prose-hl .mdh-codeblock{opacity:.8;}
.cn-root .carmar-prose-hl .mdh-quote{opacity:.7;}
.cn-root .carmar-prose-hl .mdh-link{color:var(--cn-accent);}
.cn-root .carmar-prose-hl .mdh-url{
  opacity:.5;text-decoration:underline;
  text-decoration-color:color-mix(in srgb, currentColor 35%, transparent);
}
.cn-root .carmar-prose-hl .mdh-cite{
  color:var(--cn-accent);border-radius:3px;
  background:color-mix(in srgb, var(--cn-accent) 10%, transparent);
}
.cn-root .carmar-prose-hl .mdh-math{
  color:var(--cn-accent-deep);border-radius:3px;
  background:color-mix(in srgb, currentColor 7%, transparent);
}
.cn-root .carmar-prose-hl .mdh-fn{color:var(--cn-accent);text-shadow:0 0 .5px currentColor;}

/* \u2500\u2500 result bar: fold / clear \u2500\u2500 */
.cn-root .carmar-output-bar{
  display:flex;align-items:center;gap:5px;margin:3px 0 0;
  font-size:var(--cn-fs-xs);opacity:.55;transition:opacity var(--cn-dur-2);
}
.cn-root .cell:hover .carmar-output-bar{opacity:1;}
.cn-root .carmar-fold,.cn-root .carmar-clear{
  font:inherit;font-size:var(--cn-fs-xs);cursor:pointer;color:var(--cn-text);
  background:transparent;border:1px solid transparent;border-radius:var(--cn-radius-sm);
  padding:1px 7px;
}
.cn-root .carmar-fold{padding:1px 5px;}
.cn-root .carmar-fold:hover,.cn-root .carmar-clear:hover{
  border-color:var(--cn-border);background:var(--cn-control-bg);
}
.cn-root .carmar-output-summary{
  font-variant-numeric:tabular-nums;margin-right:auto;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
.cn-root .carmar-output.folded{display:none;}
/* \u2500\u2500 rendered prose: document typography, not UI typography \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   15.5px/1.7 with a real heading scale. This is what a .qmd chapter reads as
   once imported, and what the author stares at longest \u2014 it earns book
   measure, not form-field measure. */
.cn-root .carmar-md{font-size:15.5px;line-height:1.7;}
.cn-root .carmar-md h1,.cn-root .carmar-md h2,.cn-root .carmar-md h3,
.cn-root .carmar-md h4{margin:.9em 0 .4em;line-height:1.25;font-weight:650;}
.cn-root .carmar-md h1{font-size:1.65em;letter-spacing:-.015em;}
.cn-root .carmar-md h2{font-size:1.35em;letter-spacing:-.01em;}
.cn-root .carmar-md h3{font-size:1.15em;}
.cn-root .carmar-md h4{font-size:1em;}
.cn-root .carmar-md p{margin:.55em 0;}
.cn-root .carmar-md code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.86em;
  padding:1px 4px;border-radius:3px;background:var(--cn-control-bg);
}
/* A function name in prose speaks in the editor's own function colour. */
.cn-root .carmar-md code.carmar-fncode{color:var(--rtok-fn);}
.cn-root .carmar-md-code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;
  line-height:1.55;
  padding:10px 12px;border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);
  border:1px solid var(--cn-border);overflow-x:auto;
}
.cn-root .carmar-md a{color:var(--cn-accent);}
.cn-root .carmar-md blockquote{
  margin:.7em 0;padding:.1em 0 .1em 14px;
  border-left:3px solid color-mix(in srgb, var(--cn-accent) 55%, transparent);
  color:color-mix(in srgb, var(--cn-text) 78%, transparent);
}
.cn-root .carmar-md hr{border:0;border-top:1px solid var(--cn-border);margin:1.4em 0;}
.cn-root .carmar-md del{opacity:.55;}
.cn-root .carmar-md-tblwrap{overflow-x:auto;margin:.7em 0;}
.cn-root .carmar-md-tbl{border-collapse:collapse;font-size:.9em;line-height:1.5;}
.cn-root .carmar-md-tbl th,.cn-root .carmar-md-tbl td{
  border:1px solid var(--cn-border);padding:4px 10px;text-align:left;
}
.cn-root .carmar-md-tbl th{background:var(--cn-control-bg);font-weight:600;}
.cn-root .carmar-md-img{
  display:block;max-width:100%;height:auto;margin:.6em 0;
  border-radius:var(--cn-radius-sm);
}
.cn-root .carmar-md-badsrc{opacity:.5;font-style:italic;}

/* Math: native MathML, sized to sit in the line without shouting. */
.cn-root .carmar-math math{font-size:1.05em;}
.cn-root .carmar-math-block{
  margin:.9em 0;text-align:center;font-size:1.12em;overflow-x:auto;
}

/* Callouts \u2014 Quarto's boxes, the vignette author's furniture. */
.cn-root .carmar-callout{
  margin:.9em 0;border:1px solid var(--cn-border);border-left-width:4px;
  border-radius:var(--cn-radius-sm);overflow:hidden;font-size:.95em;
}
.cn-root .carmar-callout-title{
  font-weight:650;font-size:.88em;padding:6px 13px;letter-spacing:.01em;
  background:color-mix(in srgb, currentColor 6%, transparent);
}
.cn-root .carmar-callout-body{padding:8px 13px;}
.cn-root .carmar-callout-body > :first-child{margin-top:0;}
.cn-root .carmar-callout-body > :last-child{margin-bottom:0;}
.cn-root .carmar-callout.is-note{border-left-color:var(--cn-accent);}
.cn-root .carmar-callout.is-note .carmar-callout-title{color:var(--cn-accent-deep);}
.cn-root .carmar-callout.is-tip{border-left-color:#2e8b57;}
.cn-root .carmar-callout.is-tip .carmar-callout-title{color:#1e6e41;}
.cn-root .carmar-callout.is-warning,.cn-root .carmar-callout.is-caution{border-left-color:#d99114;}
.cn-root .carmar-callout.is-warning .carmar-callout-title,
.cn-root .carmar-callout.is-caution .carmar-callout-title{color:#96660b;}
.cn-root .carmar-callout.is-important{border-left-color:#c0392b;}
.cn-root .carmar-callout.is-important .carmar-callout-title{color:#992d22;}

/* Quarto prose constructs: crossrefs, attributed spans, captioned figures
   and tables, CSS-only panel tabsets. Same classes as the knit stylesheet so
   a cell previews the way its report renders. */
.cn-root .carmar-xref{color:var(--cn-accent);text-decoration:none;}
.cn-root a.carmar-xref:hover{text-decoration:underline;}
.cn-root .carmar-underline{text-decoration:underline;}
.cn-root .carmar-smallcaps{font-variant:small-caps;}
.cn-root .carmar-md-figure{display:block;text-align:center;margin:.9em 0;}
.cn-root .carmar-md-figcap,.cn-root .carmar-md-tblcap{
  display:block;font-size:.84em;margin-top:6px;text-align:center;
  color:color-mix(in srgb, var(--cn-text) 62%, transparent);
}
.cn-root .carmar-md-div{margin:.6em 0;}
.cn-root .carmar-tabset{
  display:flex;flex-wrap:wrap;align-items:center;margin:.9em 0;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);padding:0 14px 12px;
}
.cn-root .carmar-tabset>.carmar-tab-radio{display:none;}
.cn-root .carmar-tabset>.carmar-tab-label{
  order:0;padding:9px 13px 7px;cursor:pointer;font-size:.88em;
  color:color-mix(in srgb, var(--cn-text) 62%, transparent);
  border-bottom:2px solid transparent;
}
.cn-root .carmar-tabset>.carmar-tab-radio:checked+.carmar-tab-label{
  color:var(--cn-accent);border-bottom-color:var(--cn-accent);font-weight:600;
}
.cn-root .carmar-tabset>.carmar-tabpane{display:none;order:1;width:100%;padding-top:8px;overflow-x:auto;}
.cn-root .carmar-tabset>.carmar-tab-radio:checked+.carmar-tab-label+.carmar-tabpane{display:block;}

/* A chunk that will not run says so standing still \u2014 the quiet pill in the
   editor's footer, instead of a parse error when someone presses Run All. */
.cn-root .carmar-chunk-badge{
  font:500 10.5px/1 var(--cn-font-ui, ui-sans-serif, system-ui, sans-serif);
  color:color-mix(in srgb, var(--cn-text) 55%, transparent);
  border:1px solid var(--cn-border);border-radius:999px;
  padding:3px 9px;margin-left:8px;white-space:nowrap;align-self:center;
}

/* Footnotes: small, at the end, each with its way back. */
.cn-root .carmar-fnref a{
  color:var(--cn-accent);font-weight:650;text-decoration:none;padding:0 1px;
}
.cn-root .carmar-footnotes{
  margin-top:1.6em;border-top:1px solid var(--cn-border);padding-top:.7em;
  font-size:.86em;color:color-mix(in srgb, var(--cn-text) 82%, transparent);
}
.cn-root .carmar-footnotes ol{margin:0;padding-left:1.5em;}
.cn-root .carmar-footnotes li{margin:.25em 0;}
.cn-root .carmar-fnback{text-decoration:none;opacity:.55;}
.cn-root .carmar-fnback:hover{opacity:1;}

/* Task lists: real (inert) checkboxes, done items recede. */
.cn-root .carmar-md li.carmar-task{list-style:none;margin-left:-1.15em;}
.cn-root .carmar-md .carmar-task input{accent-color:var(--cn-accent);vertical-align:-1px;}
.cn-root .carmar-md .carmar-task.is-done{opacity:.6;}

/* A citation on the page: quiet, obviously special, the full reference one
   hover away. A key the library does not know is a visible problem, not a
   silent one \u2014 it becomes a wrong bibliography later. */
.cn-root .carmar-md .carmar-cite{
  color:var(--cn-accent);cursor:help;
  border-bottom:1px dotted color-mix(in srgb, var(--cn-accent) 55%, transparent);
}
.cn-root .carmar-md .carmar-cite.is-missing{
  color:#c0392b;background:color-mix(in srgb, #c0392b 9%, transparent);
  border-bottom-color:#c0392b;border-radius:3px;padding:0 3px;
  cursor:pointer;                    /* clicking opens the wizard on that key */
}

/* \u2500\u2500 block editing: every block rendered, the caret's one open as source \u2500\u2500
   The list inherits .carmar-md typography; each block is a quiet row that
   lights on hover. The active block swaps its render for the prose surface
   (overlay + textarea \u2014 metrics shared via the carmar-md-input class). */
.cn-root .carmar-md-wrap .carmar-md-blocks{padding:4px 0;}
.cn-root .carmar-md-wrap .carmar-md-blocks:hover{background:transparent;}
.cn-root .carmar-md-blocks[hidden]{display:none;}
.cn-root .carmar-block{
  border-radius:var(--cn-radius-sm);padding:2px 16px;
  border:1px solid transparent;
}
.cn-root .carmar-md-wrap .carmar-block:hover{
  background:color-mix(in srgb, currentColor 4%, transparent);
}
/* The open block is unmistakably "editing": a soft tinted panel with a
   hairline and the accent edge, all PAINTED (background, inset shadows) \u2014
   no border-width, margin or padding changes, so not one word moves between
   the rendered face and the open one. The panel is the block's own box; the
   cell around it stays flat, and the page gains no second chrome. */
.cn-root .carmar-block.is-active{
  position:relative;padding:0;overflow:visible;border-color:transparent;
  background:color-mix(in srgb, var(--cn-accent) 5%, var(--cn-surface));
  box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--cn-accent) 18%, transparent);
}
.cn-root .carmar-md-wrap .carmar-block.is-active:hover{
  background:color-mix(in srgb, var(--cn-accent) 5%, var(--cn-surface));
}
.cn-root .carmar-block.is-active .carmar-prose{
  box-shadow:inset 2px 0 0 color-mix(in srgb, var(--cn-accent) 55%, transparent);
  border-radius:var(--cn-radius-sm);
}
/* The tag sits in the panel's top-right corner, on the panel's own top
   padding (the textarea's first line box starts 12px down, its glyphs lower
   still): 13px tall from the top edge, it never reaches a letter and never
   enters the flow. Same words as the header bar's mode label. */
.cn-root .carmar-block-tag{
  position:absolute;top:1px;right:8px;height:13px;line-height:13px;
  font:600 9.5px/13px var(--cn-font);letter-spacing:.02em;
  color:color-mix(in srgb, var(--cn-accent-deep) 70%, transparent);
  padding:0 5px;border-radius:999px;
  background:color-mix(in srgb, var(--cn-accent) 7%, var(--cn-surface));
  pointer-events:none;user-select:none;white-space:nowrap;
}
.cn-root .carmar-block.is-empty{opacity:.75;padding:8px 16px;}
.cn-root .carmar-block-front{
  font:11.5px/1.55 var(--cn-mono);opacity:.55;margin:0;white-space:pre-wrap;
}

/* A div block's chip says what the fence means \u2014 a callout's kind, a
   conditional's format \u2014 without ever printing ::: at a reader. Content
   the HTML renderer would drop shows dimmed instead of vanishing. */
.cn-root .carmar-block-chip{
  display:inline-block;font:600 10px/1 var(--cn-mono);
  letter-spacing:.04em;text-transform:uppercase;
  color:color-mix(in srgb, var(--cn-text) 55%, transparent);
  border:1px solid color-mix(in srgb, currentColor 22%, transparent);
  border-radius:999px;padding:3px 8px;margin:2px 0 4px;
}
.cn-root .carmar-block-offformat{opacity:.45;}

/* The in-place table cell input: same type as the cell it replaces. */
.cn-root .carmar-cell-input{
  font:inherit;color:inherit;background:transparent;
  border:0;outline:2px solid color-mix(in srgb, var(--cn-accent) 55%, transparent);
  outline-offset:-1px;border-radius:3px;padding:0 2px;margin:0;
  width:100%;min-width:60px;box-sizing:border-box;
}

/* \u2500\u2500 table tools \u2500\u2500
   The structural menu a table cell offers on right-click: the shared
   context-item recipe (13px rows, icon column) riding the popupMenu
   surface. is-on lights the column's current alignment. */
.cn-root .carmar-table-menu{
  min-width:216px;padding:5px;border-radius:10px;background:var(--cn-surface);
  box-shadow:0 20px 48px -16px rgba(20,35,52,.34),0 4px 14px -8px rgba(20,35,52,.2);
}
.cn-root .carmar-table-menu .carmar-context-item.is-on{
  color:var(--cn-accent-deep);
  background:color-mix(in srgb, var(--cn-accent) 9%, transparent);
}

/* \u2500\u2500 Open Recent \u2014 rows a reopen away \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root .carmar-recent-list{display:flex;flex-direction:column;gap:2px;margin:4px 0;}
.cn-root .carmar-recent-row{
  display:flex;align-items:center;gap:12px;width:100%;
  padding:8px 10px;border:0;border-radius:var(--cn-radius-sm);
  background:transparent;cursor:pointer;text-align:left;font:inherit;color:inherit;
}
.cn-root .carmar-recent-row:hover{background:var(--cn-accent-soft);}
.cn-root .carmar-recent-main{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;}
.cn-root .carmar-recent-name{font-weight:600;font-size:13px;}
.cn-root .carmar-recent-path{
  font:11px var(--cn-mono);opacity:.55;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-recent-when{font-size:11px;opacity:.5;flex:0 0 auto;}

/* \u2500\u2500 the live References section \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Derived from what the prose cites, after the last cell \u2014 same face as the
   knitted bibliography: APA lines, hanging indent, links live. It renders
   with the prose type ramp (.carmar-md) so it reads as part of the document,
   not chrome. */
.cn-root .carmar-refs{
  margin:26px 0 40px;padding:10px 16px 0;
  border-top:1px solid color-mix(in srgb, currentColor 14%, transparent);
  font-size:14.5px;line-height:1.6;
}
.cn-root .carmar-refs[hidden]{display:none;}
.cn-root .carmar-refs-title{
  margin:.4em 0 .6em;font-size:1.35em;font-weight:650;letter-spacing:-.01em;
}
.cn-root .carmar-ref{margin:0 0 .55em;padding-left:2em;text-indent:-2em;}
.cn-root .carmar-ref a{color:var(--cn-accent);word-break:break-all;}

/* \u2500\u2500 the prose toolbar \u2014 ONE per document, in the header's work row \u2500\u2500\u2500\u2500\u2500\u2500
   Icons, grouped by intent (text \xB7 blocks \xB7 insert), then the word count
   and Done. It is the document's bar (lib/md-editor.js proseBar), placed by
   organizeHeader in the Add group's slot and shown only while a Text block
   (or a definition cell's whole surface) is being written. It lives OUTSIDE
   every cell on purpose: an in-cell bar either stuck to the cell's own
   overflow box over the first paragraph, or entered the flow and moved the
   document 46 px on every open and close. Up here it pushes nothing and
   covers nothing. Cite is the one labelled, tinted control: it is the door
   to a feature, not another mark. */
.cn-root .carmar-md-bar{
  display:inline-flex;align-items:center;gap:7px;flex:0 1 auto;min-width:0;
  flex-wrap:nowrap;white-space:nowrap;padding:0;margin:0;border:0;background:none;
}
.cn-root .carmar-md-bar[hidden]{display:none;}
/* The bar's first word is its state \u2014 quiet, mono, the header's dim voice. */
.cn-root .carmar-md-bar-mode{
  font:600 10px/1 var(--cn-mono);letter-spacing:.08em;text-transform:uppercase;
  color:rgba(219,231,242,.55);white-space:nowrap;margin-right:4px;
}
/* The bar takes the Add slot: while writing, the formatting verbs stand
   where R \xB7 Text stood \u2014 same row, same place, nothing else moves. */
.cn-root .hdr-row-work:has(> .carmar-md-bar:not([hidden])) > .carmar-add-actions{display:none;}
/* Each group \u2014 text marks \xB7 blocks \xB7 inserts \u2014 sits in a whisper tray: the
   faintest tint that still separates the three families (user-picked from a
   five-way pass, 2026-08-20). No border, no wall \u2014 the header shows through. */
.cn-root .carmar-md-group{
  display:inline-flex;align-items:center;gap:1px;
  padding:2px 3px;border-radius:9px;background:rgba(0,0,0,.045);
}
.cn-root .carmar-md-tool{
  display:inline-flex;align-items:center;justify-content:center;gap:4px;
  min-width:26px;height:24px;padding:0 4px;cursor:pointer;
  border:1px solid transparent;border-radius:6px;
  background:none;color:var(--cn-text);
}
.cn-root .carmar-md-tool svg{display:block;}
.cn-root .carmar-md-tool:hover{background:var(--cn-canvas);border-color:var(--cn-border);}
.cn-root .carmar-md-tool:focus-visible{outline:0;box-shadow:var(--cn-focus-ring);}
.cn-root .carmar-md-tool.is-cite{color:var(--cn-accent);}
.cn-root .carmar-md-tool-label{font:600 var(--cn-fs-sm) var(--cn-font);}
.cn-root .carmar-md-bar-sp{flex:0 0 4px;}
.cn-root .carmar-md-count{
  font-size:var(--cn-fs-sm);opacity:.55;font-variant-numeric:tabular-nums;margin-right:2px;
}
.cn-root .carmar-md-done{
  font:600 var(--cn-fs-sm) var(--cn-font);cursor:pointer;padding:3px 13px;
  border-radius:9px;border:1px solid transparent;
  background:var(--cn-accent);color:#fff;
}
/* On the dark header the bar speaks the header's own voice: light icons,
   hover as a soft lift, Done a quiet pill \u2014 the same family as Undo and
   Run All beside it. */
.cn-root header .carmar-md-bar .carmar-md-tool{color:#eef6ff;opacity:.84;}
.cn-root header .carmar-md-bar .carmar-md-tool:hover{
  background:rgba(255,255,255,.14);border-color:transparent;opacity:1;
}
.cn-root header .carmar-md-bar .carmar-md-tool:active{background:rgba(255,255,255,.22);opacity:1;}
.cn-root header .carmar-md-bar .carmar-md-tool.is-cite{color:#8fc0ff;opacity:1;}
.cn-root header .carmar-md-bar .carmar-md-group{background:rgba(255,255,255,.035);}
.cn-root header .carmar-md-bar .carmar-md-count{color:rgba(219,231,242,.62);opacity:1;}
.cn-root header .carmar-md-bar .carmar-md-done{
  background:rgba(255,255,255,.13);color:#eef6ff;height:30px;padding:0 12px;
}
.cn-root header .carmar-md-bar .carmar-md-done:hover{background:rgba(255,255,255,.22);}
/* The row's fixed groups leave the bar roughly (viewport \u2212 910) px. The bar
   gives up its least essential pixels first \u2014 the Cite label, then the word
   count, then tool breathing room (Undo drops to its icon, as it already
   does on phones) \u2014 so nothing ever spills onto the session controls. */
@media (max-width:1520px){
  .cn-root header .carmar-md-bar .carmar-md-tool-label{display:none;}
}
@media (max-width:1480px){
  .cn-root header .carmar-md-bar .carmar-md-count{display:none;}
}
/* The mode label is the next to go. */
@media (max-width:1320px){
  .cn-root header .carmar-md-bar .carmar-md-bar-mode{display:none;}
}
@media (max-width:1420px){
  .cn-root header .carmar-md-bar .carmar-md-tool{min-width:24px;padding:0 2px;}
  .cn-root .hdr-row-work:has(> .carmar-md-bar:not([hidden])) .carmar-session-actions .hdr-undo-btn{width:30px;padding:0;justify-content:center;}
  .cn-root .hdr-row-work:has(> .carmar-md-bar:not([hidden])) .carmar-session-actions .hdr-undo-btn span{display:none;}
}
@media (max-width:1380px){
  .cn-root header .carmar-md-bar{gap:3px;}
  .cn-root header .carmar-md-bar .carmar-md-group{padding:2px 2px;}
}
@media (max-width:1340px){
  .cn-root .hdr-row-work:has(> .carmar-md-bar:not([hidden])) .carmar-session-actions .hdr-width-btn{display:none;}
  .cn-root .hdr-row-work:has(> .carmar-md-bar:not([hidden])) .carmar-session-actions .carmar-runall-action span{display:none;}
  .cn-root .hdr-row-work:has(> .carmar-md-bar:not([hidden])) .carmar-session-actions .carmar-runall-action{width:30px;padding:0;justify-content:center;}
}
.cn-root .carmar-md-hmenu{display:flex;flex-direction:column;min-width:160px;padding:5px;}
.cn-root .carmar-md-hitem{text-align:left;border-radius:var(--cn-radius-sm);}
.cn-root .carmar-md-hitem.is-h1{font-size:15px;font-weight:700;}
.cn-root .carmar-md-hitem.is-h2{font-size:13.5px;font-weight:650;}
.cn-root .carmar-md-hitem.is-h3{font-size:12.5px;font-weight:600;}
.cn-root .carmar-md-hitem.is-h4{font-size:12px;font-weight:600;}
.cn-root .carmar-md-hitem.is-h5{font-size:11.5px;font-weight:550;}
.cn-root .carmar-md-hitem.is-h6{font-size:11px;font-weight:550;letter-spacing:.01em;}
/* The caret's formatting lights its button \u2014 a soft pill, Docs-style. */
.cn-root .carmar-md-tool.is-active{
  background:color-mix(in srgb, var(--cn-accent) 16%, transparent);
  color:var(--cn-accent-deep);
}
.cn-root header .carmar-md-bar .carmar-md-tool.is-active{
  background:rgba(143,192,255,.30);color:#fff;opacity:1;
}
/* The \u22EE shelf: the same tools, on a light popup strip. */
.cn-root .carmar-md-morebar{flex-direction:row;align-items:center;gap:2px;min-width:0;padding:5px;}
.cn-root .carmar-md-morebar .carmar-md-tool{color:var(--cn-text);}
/* The colour door: swatch rows for text colour and highlight. */
.cn-root .carmar-md-colors{gap:7px;min-width:0;padding:9px 11px;}
.cn-root .carmar-md-color-row{display:flex;align-items:center;gap:6px;}
.cn-root .carmar-md-color-lab{
  font:600 10px/1 var(--cn-mono);letter-spacing:.07em;text-transform:uppercase;
  color:var(--cn-text-dim);width:38px;
}
.cn-root .carmar-md-swatch{
  width:21px;height:21px;border-radius:7px;border:1px solid rgba(15,30,50,.18);
  cursor:pointer;padding:0;
}
.cn-root .carmar-md-swatch:hover{border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);}
.cn-root .carmar-md-color-clear{
  align-self:flex-start;border:0;background:none;cursor:pointer;
  font:600 var(--cn-fs-sm) var(--cn-font);color:var(--cn-text-muted);padding:2px 0 0;
}
.cn-root .carmar-md-color-clear:hover{color:var(--cn-accent-deep);}

/* \u2500\u2500 the citation wizard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   One box up top; what it finds in the world in the middle; what you already
   own at the bottom. Rows are scannable \u2014 title first, people and venue
   quieter, actions on the right where every row keeps them. */
.cn-root .carmar-cite-input{
  width:100%;box-sizing:border-box;resize:none;outline:none;
  font:13.5px/1.5 var(--cn-font);padding:9px 12px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-cite-input:focus{border-color:var(--cn-accent);}
.cn-root .carmar-cite-hint{font-size:11px;opacity:.5;margin:5px 2px 12px;}
.cn-root .carmar-cite-results,
.cn-root .carmar-cite-library{
  display:flex;flex-direction:column;gap:5px;overflow-y:auto;
}
.cn-root .carmar-cite-results{max-height:250px;margin-bottom:6px;}
.cn-root .carmar-cite-library{max-height:210px;}
.cn-root .carmar-cite-row{
  display:flex;align-items:center;gap:10px;padding:7px 10px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-surface);
}
.cn-root .carmar-cite-row:hover{border-color:var(--cn-accent);}
.cn-root .carmar-cite-rowmain{flex:1 1 auto;min-width:0;}
.cn-root .carmar-cite-rowtitle{font-size:13px;font-weight:600;line-height:1.35;}
.cn-root .carmar-cite-rowmeta{
  display:flex;gap:9px;flex-wrap:wrap;font-size:11.5px;opacity:.72;margin-top:2px;
}
.cn-root .carmar-cite-where{font-style:italic;}
.cn-root .carmar-cite-key{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  color:var(--cn-accent);
}
.cn-root .carmar-cite-rowactions{display:flex;gap:5px;flex:0 0 auto;}
.cn-root .carmar-cite-btn{
  font:600 11.5px var(--cn-font);padding:4px 11px;cursor:pointer;
  border-radius:999px;border:1px solid var(--cn-border);
  background:var(--cn-surface);color:var(--cn-text);
}
.cn-root .carmar-cite-btn:hover{background:var(--cn-canvas);}
.cn-root .carmar-cite-btn.is-primary{
  background:var(--cn-accent);border-color:transparent;color:#fff;
}
.cn-root .carmar-cite-btn.is-primary:hover{background:var(--cn-accent-deep);}
.cn-root .carmar-cite-btn.is-del{padding:4px 8px;}
.cn-root .carmar-cite-empty{font-size:12.5px;opacity:.6;padding:10px 4px;}
.cn-root .carmar-cite-empty.is-err{color:#c0392b;opacity:.95;}
.cn-root .carmar-cite-libhead{
  display:flex;align-items:baseline;gap:8px;
  margin:8px 0 7px;padding-top:11px;border-top:1px solid var(--cn-border);
}
.cn-root .carmar-cite-libtitle{
  font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;opacity:.55;
}
.cn-root .carmar-cite-libcount{font-size:11px;opacity:.5;font-variant-numeric:tabular-nums;}
.cn-root .carmar-cite-narrative{
  display:inline-flex;align-items:center;gap:6px;font-size:12px;
  margin-right:auto;cursor:pointer;user-select:none;
}
/* Code inside prose: R gets the notebook's own colours, other languages stay
   plain \u2014 see codeBlock() in lib/markdown.js. */
.cn-root .carmar-md-code.is-r{
  background:var(--ed-bg);border-color:var(--ed-border);
}
.cn-root .carmar-md-code.is-r code{color:var(--ed-fg);}

/* (CarmaR's header controls are menus now \u2014 see "header menus" below.) */

/* A prose cell reports "<1 ms" \u2014 a runtime for something that does not run.
   It is noise on every text cell in the notebook. */
.cn-root .cell.carmar-md-cell .cell-runtime{display:none;}

/* \u2500\u2500 prose should read as prose \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   A text cell's chrome (drag grip, badge, collapse/copy/lock/close) appears
   on hover \u2014 as a FLOATING card over the cell's top-right corner, revealed
   by opacity alone. The first version animated the header's height 0\u219230px,
   which shoved the whole document down and back on every mouse pass: the
   "jumpy" feel, and a violation of the house rule that hover reveals change
   opacity, never layout. Nothing below a hovered cell may ever move. */
.cn-root .cell.carmar-md-cell .cell-header{
  position:absolute;top:0;left:0;right:0;height:0;min-height:0;
  padding:0;margin:0;border:0;background:none;box-shadow:none;
  overflow:hidden;visibility:hidden;pointer-events:none;
}
/* Since 0.40.27 the card is gone altogether: NOTHING floats over a Text
   cell's words. The header stays in the DOM out of sight \u2014 core's drag,
   duplicate, collapse, lock and close live on its buttons, and the
   right-click menu clicks them (lib/command-system.js) \u2014 while the
   address + drag grip move to the GUTTER and the +R/+Text pills to the SEAM
   under the cell; an AI byline (\u26A1) paints above the first block. */
/* The prose block's own first/last margins double the cell's padding. */
.cn-root .carmar-md > :first-child{margin-top:0;}
.cn-root .carmar-md > :last-child{margin-bottom:0;}

/* \u2500\u2500 adding cells: pills on the cell's own bottom row, NO lane \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Core renders a +R/+Text strip under every cell; as a lane it either
   reserves dead height or animates it (the second source of "jumpy").
   verbs.js ADOPTS the strip element instead: into the R cell's footer row
   (a row that already exists \u2014 the pills cost zero new pixels and are
   simply always there), and into the text cell's wrap as a bottom-right
   overlay that fades in on hover. The strip's insert-below wiring is
   core's own closure and survives the move.
   Base rule = pre-adoption/fallback: invisible and heightless, so nothing
   flashes and nothing jumps. */
.cn-root .cell-stack .cn-add-strip{
  height:0;padding:0;margin:0;overflow:hidden;opacity:0;
}
.cn-root .cell-stack .cn-add-strip.carmar-add-inline{
  position:static;height:auto;overflow:visible;opacity:.8;
  display:inline-flex;align-items:center;gap:4px;margin-left:6px;
  transition:opacity var(--cn-dur-1);
}
.cn-root .cell-stack .cn-add-strip.carmar-add-inline:hover{opacity:1;}
.cn-root .carmar-md-wrap{position:relative;}
/* \u2500\u2500 the seam: +R / +Text between cells, never over them \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   A Text cell's strip moves into a seam that lies OVER the stack gap below
   the cell (10px) plus the cell's last 5px \u2014 absolutely positioned, so it
   is in nobody's flow. Resting on it draws a hairline across the gap with
   the two pills centred on it; leave it and it is gone. Nothing shows on a
   plain hover of the cell, because nothing may float over the words. */
.cn-root .carmar-md-seam{
  position:absolute;left:0;right:0;bottom:-10px;height:15px;z-index:7;
  pointer-events:auto;
}
/* The seam spans the cell's last 5px (its bottom padding \u2014 no words there)
   and the 10px gap; its line and pills sit on the GAP's centre (top + 10px),
   not the element's. */
.cn-root .carmar-md-seam::before{
  content:"";position:absolute;left:14px;right:14px;top:10px;
  border-top:1px solid color-mix(in srgb, var(--cn-accent) 40%, transparent);
  opacity:0;transition:opacity var(--cn-dur-1);
}
.cn-root .cell-stack .carmar-md-seam .cn-add-strip{
  position:absolute;left:50%;top:10px;transform:translate(-50%,-50%);
  height:auto;overflow:visible;padding:0;margin:0;
  display:inline-flex;align-items:center;gap:6px;
  opacity:0;pointer-events:none;transition:opacity var(--cn-dur-1);
}
.cn-root .carmar-md-seam:hover::before{opacity:1;}
.cn-root .cell-stack .carmar-md-seam:hover .cn-add-strip{opacity:1;pointer-events:auto;}
.cn-root .carmar-md-seam .cn-add-pill{
  background:var(--cn-surface);border:1px solid color-mix(in srgb, var(--cn-accent) 40%, transparent);
  color:var(--cn-accent-deep);box-shadow:0 1px 3px color-mix(in srgb, currentColor 10%, transparent);
}
.cn-root .carmar-md-seam .cn-add-pill:hover{background:var(--cn-accent-soft);}
.cn-root .cn-add-pill{padding:2px 10px;}

/* \u2500\u2500 the gutter: the cell's address, which is also its drag grip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   "#7" at the left of the text column, in the margin (outside every block's
   box, so it can never sit on a word), visible on hover. Core's .cell-grip
   element itself lives here (verbs.js adoptCellChrome), so core's drag
   listens where the mark is \u2014 the address IS the handle. */
.cn-root .carmar-md-gutter{
  position:absolute;top:6px;right:calc(100% + 4px);
  display:flex;flex-direction:column;align-items:flex-end;gap:4px;
  pointer-events:none;
}
.cn-root .carmar-md-gutter .cell-grip{
  display:inline-block;font:600 10px/16px var(--cn-mono);letter-spacing:0;
  color:color-mix(in srgb, var(--cn-text) 55%, transparent);
  padding:0 3px;border-radius:4px;cursor:grab;user-select:none;white-space:nowrap;
  opacity:0;pointer-events:none;transition:opacity var(--cn-dur-1),background var(--cn-dur-1);
}
.cn-root .carmar-md-gutter .cell-grip:empty{display:none;}
.cn-root .cell.carmar-md-cell:hover .carmar-md-gutter .cell-grip,
.cn-root .cell.carmar-md-cell:focus-within .carmar-md-gutter .cell-grip{
  opacity:1;pointer-events:auto;
}
.cn-root .carmar-md-gutter .cell-grip:hover{
  background:color-mix(in srgb, var(--cn-accent) 10%, transparent);color:var(--cn-accent-deep);
}
.cn-root .carmar-md-gutter .cell-grip:active{cursor:grabbing;}
@media print{.cn-root .carmar-md-gutter,.cn-root .carmar-md-seam{display:none!important;}}

/* \u2500\u2500 the byline: where an AI's \u26A1 stamp goes on a Text cell \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The stamp lands here (lib/ai-provenance.js paints into
   [data-carmar-stamp-home]) instead of the hidden header. In the flow above
   the first block, so it never covers a word; empty it costs nothing. */
.cn-root .carmar-md-byline{display:none;padding:4px 16px 0;}
.cn-root .carmar-md-byline:has(.carmar-agent-stamp){display:flex;align-items:center;gap:6px;}
.cn-root .carmar-md-byline .carmar-agent-stamp{
  display:inline-flex;align-items:center;flex:0 0 auto;
  font-size:10px;font-weight:600;padding:1px 8px;border-radius:999px;
  border:1px solid rgba(8,143,143,.35);background:rgba(8,143,143,.10);
  color:#077575;white-space:nowrap;
}

/* \u2500\u2500 collapsed and locked Text cells stay READABLE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Core hides a collapsed or locked cell's form \u2014 for a verb whose form is a
   panel of controls. A Text cell's form IS the prose: collapsed, it shows
   its first lines fading out (click anywhere, or Expand, to reopen);
   locked, it shows everything and opens nothing (lib/block-editor.js). */
.cn-root .cell.carmar-md-cell.minimized .cell-form,
.cn-root .cell.carmar-md-cell.locked .cell-form{display:block!important;}
.cn-root .cell.carmar-md-cell.minimized .carmar-md-blocks{
  max-height:52px;overflow:hidden;
  -webkit-mask-image:linear-gradient(to bottom, #000 30%, transparent 100%);
  mask-image:linear-gradient(to bottom, #000 30%, transparent 100%);
}
.cn-root .cell.carmar-md-cell.minimized .carmar-md-blocks .carmar-block{pointer-events:none;}
.cn-root .cell.carmar-md-cell.minimized .carmar-md-wrap{cursor:pointer;}
.cn-root .cell.carmar-md-cell.locked .carmar-md-wrap .carmar-block:hover{background:transparent;}
.cn-root .cell.carmar-md-cell.locked .carmar-md-wrap .carmar-md{cursor:default;}

/* \u2500\u2500 per-cell figure size \u2500\u2500 */
.cn-root .carmar-gear{
  font:inherit;font-size:12px;line-height:1;cursor:pointer;
  /* A real hit target \u2014 a 21\xD720px icon button is a miss waiting to happen. */
  min-width:24px;min-height:24px;padding:0 5px;
  display:inline-flex;align-items:center;justify-content:center;
  border:1px solid transparent;border-radius:var(--cn-radius-sm);
  background:transparent;color:var(--cn-text);opacity:.5;
}
.cn-root .carmar-gear:hover{opacity:1;border-color:var(--cn-border);background:var(--cn-control-bg);}
.cn-root .carmar-dims{
  display:flex;align-items:center;gap:12px;padding:6px 10px;
  border-bottom:1px solid var(--cn-border);background:var(--cn-surface);
  font-size:var(--cn-fs-xs);
}
.cn-root .carmar-dim{display:inline-flex;align-items:center;gap:5px;}
.cn-root .carmar-dim span{opacity:.6;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.cn-root .carmar-dim input{
  /* 5.5ch clipped "900" to "9": a number input reserves room for its spinner
     inside the content box, so the usable width was barely two digits. The
     spinners are useless here (you type a size, you don't nudge it 1px at a
     time), so they go, and the field is sized for four digits plus padding. */
  width:4.75rem;min-width:4.75rem;padding:3px 7px;box-sizing:border-box;
  border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);
  font:inherit;font-size:var(--cn-fs-xs);font-variant-numeric:tabular-nums;
  -moz-appearance:textfield;appearance:textfield;
}
.cn-root .carmar-dim input::-webkit-outer-spin-button,
.cn-root .carmar-dim input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
.cn-root .carmar-dim-inches{opacity:.45;font-variant-numeric:tabular-nums;}

/* \u2500\u2500 LAYOUT: a real two-column grid, not padding pushing the header off-edge.
   The header and footer span both columns; the session panel is column 1 and
   the workspace (pub-bar, main) is column 2 with minmax(0,1fr) so NOTHING can
   overflow the viewport at any width. Collapsing swaps the first track for a
   slim rail. \u2500\u2500 */
.cn-root{display:grid;grid-template-columns:var(--carmar-side-w,264px) minmax(0,1fr);}
.cn-root > *{grid-column:2;min-width:0;}
/* A grid item with margin:0 auto loses its stretch and shrinks to content \u2014
   core's <main> must first take the full track, THEN center inside it. */
.cn-root > main{width:100%;}
/* The header FLOATS \u2014 always. Menus, Run All, the kernel badge and the
   working directory stay in reach however deep the document scrolls. Its
   measured height rides --carmar-hdr-h (set by a ResizeObserver at boot),
   and every other sticky element offsets below it instead of fighting it. */
.cn-root > header{
  grid-column:1 / -1;
  position:sticky;top:0;z-index:220;
}
/* CarmaR's application toolbar: exactly two bands at every width. Core's
   controls are re-homed by organizeHeader(); these rules make the hierarchy
   visible instead of leaving fourteen unrelated buttons in a wrapping row. */
.cn-root > header{gap:6px;padding:8px 16px 8px;box-shadow:0 1px 0 rgba(255,255,255,.06),0 4px 16px rgba(9,22,34,.16);}
.cn-root .hdr-row-id{min-width:0;flex-wrap:nowrap;gap:10px;min-height:30px;}
/* Row 1 reads left \u2192 right: brand \xB7 Open \xB7 Import \xB7 Save \xB7 autosave \xB7 AI
   model \u2026 then, on the far side, the status pills and the TITLE (owner,
   2026-08-19: "make the title on the other side"). Flex order does the
   placing so chips mounted later by other modules still land right. */
.cn-root .hdr-row-id > .hdr-sp{order:5;flex:1 1 auto;}
/* Far side, left \u2192 right: the TITLE, then the folder, the kernel state
   ("no kernel" / R 4.5.2), the agent chip, and Install at the very edge
   (owner, 2026-08-19: "title before no-kernel \u2026 move install to the right"). */
.cn-root .hdr-row-id .hdr-title-input{
  order:6;flex:0 1 340px;min-width:110px;max-width:380px;text-align:left;margin-right:28px;
  border-bottom-color:rgba(255,255,255,.12);
}
.cn-root .hdr-row-id .carmar-wd{order:7;}
.cn-root .hdr-row-id .carmar-kernel{order:8;}
.cn-root .hdr-row-id .carmar-agent-chip{order:9;}
.cn-root .hdr-row-id .carmar-install-btn{order:10;}
.cn-root .hdr-row-id .hdr-title-input:focus{border-bottom-color:rgba(143,192,255,.7);}
.cn-root .hdr-row-id .carmar-file-actions .hdr-btn{height:28px;}
/* The brand is the wordmark; the version is a whisper beside it, not a
   second word in capitals. */
.cn-root .hdr-brand .hdr-badge{font:500 10px var(--cn-mono);text-transform:none;letter-spacing:0;color:rgba(219,231,242,.5);}
/* Row 1's status family \u2014 model, R, agent, working directory \u2014 is ONE pill
   shape: 26px, fully round, hairline, nothing filled. */
.cn-root .hdr-row-id .carmar-header-model,.cn-root .hdr-row-id .carmar-kernel,
.cn-root .hdr-row-id .carmar-agent-chip,.cn-root .hdr-row-id .carmar-wd{
  height:26px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);
  background:transparent;box-shadow:none;
}
.cn-root .hdr-row-id .carmar-wd{gap:6px;}
.cn-root .hdr-row-id .carmar-wd:hover,.cn-root .hdr-row-id .carmar-header-model:hover{background:rgba(255,255,255,.09);}
.cn-root .hdr-row-id .hdr-saved{flex:0 0 auto;min-width:0;white-space:nowrap;}
.cn-root .hdr-row-id .hdr-build:empty{display:none;}
.cn-root .carmar-header-model{
  display:inline-flex;align-items:center;gap:5px;flex:0 1 auto;min-width:0;max-width:260px;
  height:24px;padding:0 8px;border:1px solid rgba(255,255,255,.14);border-radius:999px;
  background:rgba(255,255,255,.07);color:#eaf3fb;cursor:pointer;font:600 10px var(--cn-font);
}
.cn-root .carmar-header-model:hover{background:rgba(255,255,255,.14);}
.cn-root .carmar-header-model.is-unready{color:rgba(234,243,251,.68);}
.cn-root .carmar-header-model-prefix{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#8fc0ff;}
.cn-root .carmar-header-model-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .hdr-row-work{
  min-width:0;flex-wrap:nowrap;gap:8px;overflow:visible;
  padding:1px 0 2px;scrollbar-width:none;overscroll-behavior-x:contain;
}
.cn-root .hdr-row-work::-webkit-scrollbar{display:none;}
.cn-root .carmar-file-actions,.cn-root .carmar-header-menus,
.cn-root .carmar-add-actions,.cn-root .carmar-session-actions{
  display:inline-flex;align-items:center;flex:0 0 auto;
}
/* Row 2 \u2014 one voice. No boxed group, no separators: spacing does the
   grouping. Outlined ghosts for actions (Open, Import, Run All), bare text
   for menus, exactly TWO filled buttons and they differ by hue \u2014 Save in the
   notebook's blue, CarmAI in the model family's teal \u2014 so nothing else
   competes for "primary". */
.cn-root .carmar-file-actions{gap:4px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;}
.cn-root .carmar-file-actions .hdr-btn{height:30px;padding:0 11px;border-radius:7px;color:#eef6ff;}
.cn-root .carmar-file-actions .hdr-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.cn-root .carmar-open-action,.cn-root .carmar-import-action{
  background:transparent;border:1px solid rgba(255,255,255,.14);color:rgba(238,246,255,.92);
}
.cn-root .carmar-open-action:hover,.cn-root .carmar-import-action:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.24);}
.cn-root .carmar-file-actions .carmar-save-action{
  background:#2f7bd6;border:1px solid rgba(255,255,255,.1);box-shadow:none;font-weight:700;
}
.cn-root .carmar-file-actions .carmar-save-action:hover{background:#3a88e4;}
.cn-root .carmar-header-menus{gap:0;margin-left:0;padding-right:0;border-right:0;}
.cn-root .carmar-header-menus .hdr-btn{height:30px;padding:0 10px;border-radius:7px;color:rgba(238,246,255,.82);}
.cn-root .carmar-header-menus .hdr-btn:hover{color:#fff;}
/* CarmAI ends row 2 at the right edge \u2014 the side the pane opens on. */
.cn-root .carmar-session-actions .carmar-agent-launch{margin-left:6px;border-radius:7px;}
.cn-root .carmar-add-actions{gap:2px;margin-left:6px;padding:0;border-right:0;}
.cn-root .carmar-add-label{display:none;}
.cn-root .carmar-add-actions .hdr-verbs{gap:2px;flex-wrap:nowrap;}
.cn-root .carmar-add-actions .hdr-verb{
  height:30px;padding:0 10px;opacity:1;border-radius:7px;
  color:rgba(238,246,255,.72);font-weight:600;
}
.cn-root .carmar-add-actions .hdr-verb::before{content:"+";margin-right:1px;opacity:.7;font-weight:500;}
.cn-root .carmar-add-actions .hdr-verb:hover,.cn-root .carmar-add-actions .hdr-verb.added:hover{background:rgba(255,255,255,.09);color:#fff;}
.cn-root .carmar-add-actions .hdr-verb.added{color:rgba(238,246,255,.72);}
.cn-root .cell.carmar-placement-active{
  outline:1px solid color-mix(in srgb,var(--cn-accent,#276dc3) 48%,transparent);
  outline-offset:2px;
}
/* A Text cell shows ONE chrome \u2014 the hover card. No placement frame, no
   focus ring: the open block's accent edge says where the writer is. */
.cn-root .cell.carmar-md-cell.carmar-placement-active{outline:0;}
.cn-root .carmar-session-actions{gap:4px;}
.cn-root .carmar-session-actions .hdr-btn{height:30px;padding:0 10px;border-radius:7px;}
.cn-root .carmar-runall-action{border:1px solid rgba(255,255,255,.14);color:#eef6ff;font-weight:700;}
.cn-root .carmar-runall-action:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.24);}
.cn-root .carmar-session-actions .hdr-width-btn{font-size:var(--cn-fs-xs);color:rgba(238,246,255,.6);}
.cn-root .hdr-row-work > .hdr-sp{min-width:6px;}
.cn-root .carmar-menu-drop{
  margin-top:7px;padding:5px;border:1px solid var(--cn-border-soft);border-radius:10px;
  box-shadow:0 20px 48px -16px rgba(20,35,52,.34),0 4px 14px -8px rgba(20,35,52,.2);
}
.cn-root .carmar-menu-drop button,.cn-root .carmar-header-menus > .hdr-export-wrap > .hdr-export-drop button{
  min-height:31px;border-radius:var(--cn-radius-sm);padding:6px 10px;
}
/* Any dropdown row carrying the icon slot stands in the shared two-column
   grid \u2014 CarmaR's own items and core's decorated File \u25BE rows alike. The drop
   holding such rows is widened so the icon column never costs a label its
   words (core's File \u25BE is not a .carmar-menu-drop, so the width lives here). */
.cn-root .hdr-export-drop:has(button > .carmar-menu-ico){min-width:252px;}
.cn-root .hdr-export-drop button:has(> .carmar-menu-ico){
  display:grid;grid-template-columns:16px minmax(0,1fr);align-items:center;gap:9px;text-align:left;
}
.cn-root .carmar-menu-ico{display:inline-flex;align-items:center;justify-content:center;color:var(--cn-text-muted);}
.cn-root .carmar-menu-ico svg{display:block;}
.cn-root .hdr-export-drop button:hover .carmar-menu-ico{color:var(--cn-accent-deep);}
.cn-root .hdr-export-drop button:disabled .carmar-menu-ico{color:var(--cn-text-dim);}
.cn-root .carmar-menu-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* The binding, right-aligned and quiet. Present so the menu teaches the key
   every time it is opened \u2014 a menu that only performs actions teaches
   nothing. Dimmed because it is a reminder, not a second label.
   A THIRD grid column, not a flex child: the row above is a two-track grid,
   so a third element with no track of its own wraps to a second line and
   doubles the height of every row in the menu. (Backticks are banned in this
   file's comments \u2014 it is one long JS template literal.) */
.cn-root .hdr-export-drop button:has(> .carmar-menu-key){
  grid-template-columns:16px minmax(0,1fr) auto;
}
.cn-root .carmar-menu-key{
  justify-self:end;padding-left:22px;font-size:10.5px;line-height:1;
  color:var(--cn-text-dim,#9aa0a6);font-variant-numeric:tabular-nums;white-space:nowrap;
}
.cn-root .hdr-export-drop button:disabled .carmar-menu-key{opacity:.55;}
@media (max-width:760px){
  .cn-root > header{padding-left:10px;padding-right:10px;}
  .cn-root .hdr-row-id{gap:7px;}
  .cn-root .hdr-row-id .hdr-sep,.cn-root .hdr-row-id .hdr-saved{display:none;}
  .cn-root .hdr-row-id .hdr-title-input{flex-basis:130px;min-width:80px;}
  .cn-root .carmar-header-model{max-width:150px;}
  .cn-root .carmar-wd{max-width:150px;}
  .cn-root .carmar-wd-crumb:not(:last-child),.cn-root .carmar-wd-sep{display:none;}
  .cn-root .carmar-add-actions{display:none;}
  .cn-root .carmar-session-actions .hdr-undo-btn{width:30px;padding:0;justify-content:center;}
  .cn-root .carmar-session-actions .hdr-undo-btn span{display:none;}
  .cn-root .carmar-session-actions .hdr-width-btn{display:none;}
  .cn-root .carmar-header-menus .carmar-ai-launch{width:30px;padding:0;justify-content:center;}
  .cn-root .carmar-header-menus .carmar-ai-launch > span:last-child{display:none;}
  .cn-root .hdr-row-work{overflow-x:auto;overflow-y:hidden;}
  .cn-root .hdr-row-work:has(.hdr-export-drop.show){overflow:visible;}
}
@media (max-width:520px){
  .cn-root .hdr-brand .hdr-badge{display:none;}
  .cn-root .hdr-row-id .hdr-title-input{min-width:70px;}
  .cn-root .carmar-header-model{max-width:105px;padding:0 6px;}
  .cn-root .carmar-header-model-prefix{display:none;}
  .cn-root .carmar-wd{max-width:110px;}
  .cn-root .carmar-kernel{font-size:0;width:24px;height:24px;padding:0;justify-content:center;}
  .cn-root .carmar-kernel::before{width:7px;height:7px;}
}
.cn-root > .cn-footer{grid-column:1 / -1;}
.cn-root > .carmar-side{grid-column:1;grid-row:2 / span 30;}
.cn-root.carmar-collapsed{grid-template-columns:24px minmax(0,1fr) !important;}

/* \u2500\u2500 the session panel \u2014 carm-embed CarmNote's sidebar, at ITS scale.
   Reference values from carm-embed/dist/carmnote.html, not guessed:
   .sb-section{padding:12px 14px;border-bottom:1px solid #eee} \u2014 stacked
   hairline sections, no floating cards; .panel-title 10px/700 uppercase
   #9aa0a6; .sb-var{gap:6px;padding:4px 2px} hover #e8f0fe; .sb-var-name
   11px/500 #202124; .sb-var-stat 9px mono #9aa0a6; .sb-var-miss 9px #c5221f;
   .sb-sel-btn font:700 8px, 1px 5px, radius 3px; sparklines 44\xD714 at
   SPARK_COLORS numeric #3b82f6 / categorical #f59e0b, opacity .7. \u2500\u2500 */
.cn-root .carmar-side{
  position:sticky;top:var(--carmar-hdr-h,0px);align-self:start;
  height:calc(100vh - var(--carmar-hdr-h,0px));
  display:flex;flex-direction:column;overflow:hidden;
  background:var(--cn-surface);border-right:1px solid var(--cn-border);
  font-size:11px;line-height:1.45;color:#202124;
}

/* \u2500\u2500 tab strip: Environment \xB7 Data \xB7 Files \xB7 Help \u2014 RStudio's pane tabs at
   the reference's quiet scale. Flat text tabs, active carries the accent
   underline; a hairline closes the row. \u2500\u2500 */
/* gap 0 + 2px strip padding: the six labels need ~292px of the 300px strip,
   and any sub-pixel overflow makes flex-shrink shave every tab, whose
   text-overflow then eats three characters to paint "\u2026". A few px of real
   slack keeps full labels; ellipsis appears only when the user narrows the
   sidebar (measured, tmp/tabnat.mjs). */
.cn-root .carmar-sb-tabs{
  display:flex;align-items:stretch;gap:0;flex:0 0 auto;
  padding:0 2px;border-bottom:1px solid var(--cn-border-soft);
}
/* Sentence case at 10.5px reads larger than 9px uppercase AND is the only
   typography that fits six full labels in the default 300px strip \u2014 the
   uppercase form ellipsized every tab (measured, tmp/tabfit.mjs). */
.cn-root .carmar-sb-tab{
  font-family:var(--cn-font);font-size:10.5px;font-weight:500;letter-spacing:0;
  color:var(--cn-text-dim,#9aa0a6);background:transparent;border:0;
  border-bottom:2px solid transparent;padding:7px 3px 5px;cursor:pointer;
  white-space:nowrap;display:inline-flex;align-items:center;gap:3px;
}
/* \u2500\u2500 the strip sheds labels by width, it does not chop them \u2500\u2500
   Eight tabs want 375px of a 299px strip, so text-overflow ellipsized ALL of
   them: "Ou\u2026 Prob\u2026 F\u2026 S\u2026 Enviro\u2026 Pack\u2026 F\u2026 H\u2026" \u2014 with two different tabs both
   reading "F\u2026". An icon plus a tooltip identifies a tab at any width; three
   characters and a full stop identify nothing.

   Tiers on the STRIP's own inline size (lib/sidebar.js wraps it for exactly
   this \u2014 containing the whole sidebar would make it the containing block for
   every position:fixed descendant). Labels are the default, so a browser
   without container queries keeps today's behaviour rather than a bare rail. */
.cn-root .carmar-sb-tabwrap{flex:0 0 auto;container-type:inline-size;container-name:carmar-sbtabs;}
.cn-root .carmar-sb-tab-ico{display:inline-flex;flex:0 0 auto;}
.cn-root .carmar-sb-tab-ico svg{width:13px;height:13px;display:block;stroke-width:1.7;}
.cn-root .carmar-sb-tab-label{overflow:hidden;text-overflow:ellipsis;}
@container carmar-sbtabs (max-width: 504px){
  /* Only the ACTIVE tab is named \u2014 which is the orientation question a reader
     actually has ("where am I?"). The rest are icons with tooltips.
     504px, measured: eight icons plus eight labels need 499px, and the pane
     is 264-320px in practice \u2014 so this tier is what a reader normally sees
     and the full-label tier is the graceful case for a wider pane. */
  .cn-root .carmar-sb-tab:not(.active) .carmar-sb-tab-label{display:none;}
  .cn-root .carmar-sb-tab{padding:7px 5px 5px;}
}
@container carmar-sbtabs (max-width: 284px){
  /* Too narrow even for ONE label: a pure rail. 284px because the widest
     active label is Environment and the middle tier costs 279px with it
     showing \u2014 thresholds take the worst case, or the strip would reflow
     depending on which tab you were standing on. */
  .cn-root .carmar-sb-tab-label{display:none;}
  .cn-root .carmar-sb-tab{padding:7px 4px 5px;}
}
.cn-root .carmar-sb-tab:hover{color:var(--cn-accent,#4e79a7);}
.cn-root .carmar-sb-tab.active{color:var(--cn-text,#202124);border-bottom-color:var(--cn-accent);}
.cn-root .carmar-sb-tabs-sp{flex:1 1 auto;}
.cn-root .carmar-sb-icon{
  font:inherit;font-size:11px;line-height:1;cursor:pointer;padding:2px 4px;
  align-self:center;background:transparent;border:0;border-radius:3px;color:#9aa0a6;
}
.cn-root .carmar-sb-icon:hover{background:#e8f0fe;color:#1a73e8;}

.cn-root .carmar-sb-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;}
.cn-root .carmar-sb-pane{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;}
.cn-root .carmar-sb-pane[hidden]{display:none;}
.cn-root .carmar-sb-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;}

/* Stats for nerds \u2014 the activity surface docked in the existing collapsible
   session pane, not a second floating AI window. */
.cn-root .carmar-stats-head{
  display:flex;align-items:center;gap:8px;padding:12px 12px 9px;border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-stats-copy{display:flex;flex-direction:column;min-width:0;flex:1 1 auto;}
.cn-root .carmar-stats-kicker{font:700 8px var(--cn-font);letter-spacing:.08em;text-transform:uppercase;color:#7b8794;}
.cn-root .carmar-stats-title{font:650 13px var(--cn-font);color:var(--cn-text);}
.cn-root .carmar-stats-reset{
  border:1px solid var(--cn-border);border-radius:5px;background:var(--cn-control-bg);
  color:var(--cn-text-muted);font:600 9px var(--cn-font);padding:4px 7px;cursor:pointer;
}
.cn-root .carmar-stats-reset:hover{color:var(--cn-accent-deep);border-color:#b6c9dc;}
.cn-root .carmar-stats-host{flex:1 1 auto;min-height:0;overflow:auto;padding:10px;}
.cn-root .carmar-runtime-surface.is-compact .carmar-runtime-cards{grid-template-columns:repeat(2,minmax(0,1fr));}
.cn-root .carmar-runtime-surface.is-compact .carmar-runtime-state{margin-bottom:10px;}
.cn-root .carmar-runtime-surface.is-compact .carmar-runtime-row{grid-template-columns:72px minmax(0,1fr);gap:7px;}

/* Resize handle on the pane's right edge (the sticky aside is the containing
   block; overflow:hidden clips anything past the border, so it sits inside). */
.cn-root .carmar-sb-resize{
  position:absolute;top:0;right:0;width:5px;height:100%;cursor:col-resize;z-index:2;
}
.cn-root .carmar-sb-resize:hover{background:color-mix(in srgb,var(--cn-accent) 25%,transparent);}
.cn-root.carmar-collapsed .carmar-sb-resize{display:none;}

.cn-root .carmar-sb-section{padding:12px 14px;border-bottom:1px solid var(--cn-border-soft);}
.cn-root .carmar-sb-sec-title{
  display:flex;align-items:center;gap:6px;margin-bottom:8px;
  font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;
  color:#9aa0a6;
}
.cn-root .carmar-sb-sec-tools{margin-left:auto;display:flex;gap:2px;}
.cn-root .carmar-sb-sel{
  border:1px solid #dadce0;background:var(--cn-surface);color:#5f6368;
  font-family:var(--cn-font);font-size:8px;font-weight:700;letter-spacing:.3px;
  line-height:1.4;text-transform:uppercase;padding:1px 5px;border-radius:3px;cursor:pointer;
}
.cn-root .carmar-sb-sel:hover{background:#e8f0fe;border-color:#1a73e8;color:#1a73e8;}
.cn-root .carmar-sb-sel.active{background:#1a73e8;border-color:#1a73e8;color:#fff;}
.cn-root .carmar-sb-list{display:flex;flex-direction:column;gap:1px;}

/* Object rows \u2014 data / values / functions. One quiet 11px line each. */
.cn-root .carmar-sb-row{
  display:flex;align-items:center;gap:6px;padding:4px 2px;border-radius:4px;
  cursor:pointer;min-width:0;
}
.cn-root .carmar-sb-row:hover{background:#e8f0fe;}
.cn-root .carmar-sb-row.active{background:var(--cn-accent-soft);}
.cn-root .carmar-sb-row.active .carmar-sb-name{color:var(--cn-accent-deep);font-weight:600;}
.cn-root .carmar-sb-name{
  font-size:11px;font-weight:500;color:#202124;flex:0 1 auto;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-sb-meta,.cn-root .carmar-sb-desc{
  font-family:var(--cn-mono);font-size:9px;color:#9aa0a6;flex:1 1 auto;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-sb-size{
  font-family:var(--cn-mono);font-size:9px;color:#bdc1c6;flex:0 0 auto;
  font-variant-numeric:tabular-nums;
}
.cn-root .carmar-sb-del{
  font:inherit;font-size:11px;line-height:1;cursor:pointer;flex:0 0 auto;
  background:transparent;border:0;color:#9aa0a6;padding:0 2px;opacity:0;
}
.cn-root .carmar-sb-row:hover .carmar-sb-del{opacity:1;}
.cn-root .carmar-sb-del:hover{color:#c5221f;}

/* Variable rows \u2014 the reference's .sb-var, verbatim scale. */
.cn-root .carmar-var{
  display:flex;align-items:center;gap:6px;padding:4px 2px;border-radius:4px;
  cursor:pointer;user-select:none;min-width:0;
}
.cn-root .carmar-var:hover{background:#e8f0fe;}
.cn-root .carmar-var.copied{background:var(--cn-accent-soft);}
.cn-root .carmar-var-badge{
  flex:0 0 15px;min-width:15px;height:15px;border-radius:3px;display:inline-flex;
  align-items:center;justify-content:center;font-family:var(--cn-mono);
  font-size:9px;font-weight:600;background:#f1f3f4;color:#5f6368;
}
.cn-root .carmar-var-badge[data-kind="numeric"]{background:#e8f0fe;color:#1a73e8;}
.cn-root .carmar-var-badge[data-kind="categorical"],
.cn-root .carmar-var-badge[data-kind="factor"],
.cn-root .carmar-var-badge[data-kind="character"]{background:#fce8e6;color:#c5221f;}
.cn-root .carmar-var-badge[data-kind="logical"]{background:#e6f4ea;color:#137333;}
/* The same badge scaled to grid-header size \u2014 lives WITH the column name. */
.cn-root .carmar-th-badge{
  flex:0 0 12px;width:12px;min-width:12px;height:12px;font-size:8px;
  border-radius:2px;display:inline-flex;vertical-align:middle;margin-right:4px;
}
.cn-root .carmar-grid-sort .carmar-th-badge{margin-right:0;}
.cn-root .carmar-var-name{
  font-size:11px;font-weight:500;color:#202124;flex:1 1 auto;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
/* The sparkline is ONE builder (lib/var-rows.js) but its size and fill used to
   be scoped to .carmar-side and .carmar-var-pop. Anywhere else the SVG got no
   dimensions and no fill \u2014 with preserveAspectRatio:none it stretched to fill
   the container and painted black. The builder is shared; the look has to be
   shared with it, or the next surface to reuse it repeats the discovery. */
.cn-root .carmar-spark{flex:0 0 44px;width:44px;height:14px;display:block;--carmar-spark-ink:#3b82f6;}
.cn-root .carmar-spark[data-kind="categorical"],
.cn-root .carmar-spark[data-kind="character"],
.cn-root .carmar-spark[data-kind="factor"]{--carmar-spark-ink:#f59e0b;}
.cn-root .carmar-spark[data-kind="logical"]{--carmar-spark-ink:#34a853;}
.cn-root .carmar-spark rect{fill:var(--carmar-spark-ink);opacity:.72;}
/* The histogram's floor. Without it a column whose mass sits in one low bin
   is indistinguishable from a column with no shape at all. */
.cn-root .carmar-spark .carmar-spark-base{fill:var(--cn-text-dim,#6b7280);opacity:.26;}
/* The proportion band shades by RANK within one hue. Five colours would read
   as five unrelated things; five steps of one colour read as shares of the
   same whole, which is what they are. */
.cn-root .carmar-spark .carmar-spark-seg[data-rank="0"]{opacity:.92;}
.cn-root .carmar-spark .carmar-spark-seg[data-rank="1"]{opacity:.74;}
.cn-root .carmar-spark .carmar-spark-seg[data-rank="2"]{opacity:.58;}
.cn-root .carmar-spark .carmar-spark-seg[data-rank="3"]{opacity:.46;}
.cn-root .carmar-spark .carmar-spark-seg[data-rank="4"]{opacity:.37;}
.cn-root .carmar-spark .carmar-spark-seg[data-rank="5"]{opacity:.3;}
/* Everything past the top 12 the kernel counted: grey, because it is a
   quantity we know the size of and nothing else about. */
.cn-root .carmar-spark .carmar-spark-seg.is-other{fill:var(--cn-text-dim,#6b7280);opacity:.22;}

/* The distribution popover \u2014 hover/focus a column name, anywhere. Fixed
   position (never pushes layout, never overflows the page) and
   pointer-events:none (never traps the pointer, never blocks the sort). */
.cn-root .carmar-var-pop{
  position:fixed;z-index:400;pointer-events:none;width:212px;box-sizing:border-box;
  background:var(--cn-surface);border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-lg);
  padding:8px 10px;font-size:11px;line-height:1.45;color:#202124;
}
.cn-root .carmar-var-pop-head{display:flex;align-items:baseline;gap:6px;}
.cn-root .carmar-var-pop-name{
  font-weight:600;font-size:11px;color:#202124;flex:1 1 auto;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-var-pop-class{
  flex:0 0 auto;font:500 8.5px var(--cn-mono);color:var(--cn-text-muted,#6b7280);
}
/* The figures, which is now the whole point of hovering: label left, value
   right, hairline between. Same shape as the statistics card's list, because
   they are the same numbers out of the same formatter \u2014 a reader who opens the
   card after hovering should recognise what they are looking at. */
.cn-root .carmar-var-pop-list{display:grid;grid-template-columns:auto 1fr;gap:0;margin:6px 0 0;}
.cn-root .carmar-var-pop-list dt{
  padding:2.5px 0;border-top:1px solid var(--cn-border-soft);
  font:500 10px var(--cn-font);color:var(--cn-text-muted,#6b7280);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:104px;
}
.cn-root .carmar-var-pop-list dd{
  padding:2.5px 0;margin:0;border-top:1px solid var(--cn-border-soft);
  text-align:right;font:600 10px var(--cn-mono);color:var(--cn-text,#202124);
}
.cn-root .carmar-var-pop-hint{
  margin-top:6px;padding-top:5px;border-top:1px solid var(--cn-border-soft);
  font:500 8.5px var(--cn-font);color:var(--cn-text-dim,#9aa0a6);
}
.cn-root .carmar-var-pop .carmar-spark{width:100%;height:36px;display:block;margin:7px 0 5px;}
.cn-root .carmar-var-pop-stat{font-family:var(--cn-mono);font-size:10px;color:#5f6368;}
.cn-root .carmar-var-pop-miss{font-family:var(--cn-mono);font-size:10px;color:#c5221f;margin-top:2px;}
.cn-root .carmar-var-stat{
  flex:0 0 auto;font-family:var(--cn-mono);font-size:9px;color:#9aa0a6;white-space:nowrap;
}
.cn-root .carmar-var-miss{
  flex:0 0 auto;font-family:var(--cn-mono);font-size:9px;color:#c5221f;
}

/* Files \u2014 a path crumb, then dir/file rows at the same 11px scale. */
.cn-root .carmar-sb-path{
  display:flex;align-items:center;gap:6px;padding:2px 2px 6px;min-width:0;
}
.cn-root .carmar-sb-path-name{
  font-family:var(--cn-mono);font-size:10px;color:#5f6368;flex:1 1 auto;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;
}
.cn-root .carmar-sb-up{
  font:inherit;font-size:10px;line-height:1;cursor:pointer;flex:0 0 auto;
  border:1px solid #dadce0;background:var(--cn-surface);color:#5f6368;
  padding:1px 6px;border-radius:3px;
}
.cn-root .carmar-sb-up:hover{background:#e8f0fe;border-color:#1a73e8;color:#1a73e8;}
.cn-root .carmar-sb-fglyph{flex:0 0 10px;font-size:9px;color:#9aa0a6;text-align:center;}
.cn-root .carmar-sb-file{cursor:default;}
.cn-root .carmar-sb-file.is-dir,.cn-root .carmar-sb-file.is-data,
.cn-root .carmar-sb-file.is-doc{cursor:pointer;}
.cn-root .carmar-sb-file:not(.is-dir):not(.is-data){opacity:.55;}
.cn-root .carmar-sb-file:not(.is-dir):not(.is-data):hover{background:transparent;}
.cn-root .carmar-sb-file.is-data .carmar-sb-fglyph{color:#1a73e8;}
/* A document is openable, like a dataset, but it REPLACES the notebook rather
   than adding to the session \u2014 a different colour so the two do not read as
   the same action. */
.cn-root .carmar-sb-file.is-doc .carmar-sb-fglyph{color:#7c4dff;}
.cn-root .carmar-sb-file.is-doc .carmar-sb-name{font-weight:500;}
.cn-root .carmar-sb-file .carmar-sb-name{font-weight:400;flex:1 1 auto;}

.cn-root .carmar-sb-empty{padding:26px 16px;text-align:center;}
.cn-root .carmar-sb-empty-title{font-weight:600;color:#5f6368;font-size:11px;}
.cn-root .carmar-sb-empty-hint{margin-top:3px;font-size:10px;color:#9aa0a6;line-height:1.5;}

/* Collapsed rail \u2014 a slim vertical tab in the 24px track. */
.cn-root .carmar-sb-rail{
  display:none;flex:1 1 auto;border:0;background:transparent;cursor:pointer;
  color:#9aa0a6;font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.8px;writing-mode:vertical-rl;transform:rotate(180deg);
  padding:14px 0;
}
.cn-root .carmar-sb-rail:hover{color:#1a73e8;background:#e8f0fe;}
.cn-root.carmar-collapsed .carmar-sb-tabs,
.cn-root.carmar-collapsed .carmar-sb-body{display:none;}
.cn-root.carmar-collapsed .carmar-sb-rail{display:block;}
@media print{.cn-root .carmar-side{display:none;}.cn-root{display:block;}}

/* \u2500\u2500 outline \u2014 the document's headings as a navigator (sidebar Outline tab).
   Rows at the pane's quiet scale, indented by level; H1 carries the weight.
   The click-flash lands on the RENDERED heading in the document. \u2500\u2500 */
/* Tabs no longer shrink-and-ellipsize: at eight tabs that produced "F\u2026" twice
   over. They shed their labels by tier instead (see .carmar-sb-tabwrap), so
   the icon is never squeezed and min-width has nothing left to defend. */
.cn-root .carmar-sb-tab{flex:0 0 auto;overflow:hidden;}
/* \u2500\u2500 traceback (Stage 5 slice 1) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Directly under the error banner, never behind a tab: the first thing you
   need after "Error in g(a): boom" is WHERE, and a traceback nobody opens is
   the same as no traceback. Clickable rows say so with a cursor and a hover,
   and rows that cannot be reached (a frame inside a package) deliberately do
   not pretend to be buttons. */
.cn-root .carmar-traceback{
  border:1px solid var(--cn-hairline,rgba(0,0,0,.09));border-radius:var(--cn-radius-sm,6px);
  margin:0 0 8px;overflow:hidden;background:rgba(0,0,0,.02);
}
.cn-root .carmar-traceback-head{
  font:600 10.5px/1.5 var(--cn-font,system-ui);color:#8b1a22;padding:5px 9px;
  border-bottom:1px solid var(--cn-hairline,rgba(0,0,0,.07));
}
.cn-root .carmar-traceback-head.is-clickable,
.cn-root .carmar-traceback-frame.is-clickable{cursor:pointer;}
.cn-root .carmar-traceback-head.is-clickable:hover,
.cn-root .carmar-traceback-frame.is-clickable:hover{background:rgba(78,121,167,.10);}
.cn-root .carmar-traceback-head:focus-visible,
.cn-root .carmar-traceback-frame:focus-visible{outline:var(--cn-focus-ring,2px solid #4e79a7);outline-offset:-2px;}
.cn-root .carmar-traceback-frame{display:flex;gap:8px;align-items:baseline;padding:3px 9px;}
.cn-root .carmar-traceback-depth{
  font:600 9.5px/1.5 var(--cn-mono);color:#9aa0a6;flex:0 0 auto;min-width:12px;text-align:right;
}
.cn-root .carmar-traceback-call{
  font-family:var(--cn-mono);font-size:11px;color:#3c4043;flex:1 1 auto;
  white-space:pre;overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-traceback-where{
  font:400 10px/1.5 var(--cn-font,system-ui);color:#9aa0a6;flex:0 0 auto;
}
.cn-root .carmar-traceback-vars{padding:0 9px 4px 29px;}
.cn-root .carmar-traceback-vars>summary{
  font:400 10px/1.6 var(--cn-font,system-ui);color:#9aa0a6;cursor:pointer;list-style:none;
}
.cn-root .carmar-traceback-vars>summary::before{content:"\u25B8 ";}
.cn-root .carmar-traceback-vars[open]>summary::before{content:"\u25BE ";}
.cn-root .carmar-traceback-var{display:flex;gap:8px;align-items:baseline;padding:1px 0;}
.cn-root .carmar-traceback-varname{font-family:var(--cn-mono);font-size:10.5px;color:#1c5391;flex:0 0 auto;}
.cn-root .carmar-traceback-varclass{font:400 9.5px/1.5 var(--cn-font,system-ui);color:#9aa0a6;flex:0 0 auto;}
.cn-root .carmar-traceback-varvalue{
  font-family:var(--cn-mono);font-size:10.5px;color:#5f6368;flex:1 1 auto;
  white-space:pre;overflow:hidden;text-overflow:ellipsis;
}
/* \u2500\u2500 change review \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The one preview surface for rename, replace, quick fixes and AI edits. Two
   deliberate choices: the diff shows only changed lines plus one of context
   (a diff that reprints an unchanged 80-line chunk buries the two lines you
   must check), and add/remove carry a SIGN as well as a colour, so the
   difference survives a colour-blind reader and a dark theme alike. */
.cn-root .carmar-review-backdrop{
  position:fixed;inset:0;z-index:900;background:rgba(20,22,26,.45);
  display:flex;align-items:center;justify-content:center;padding:24px;
}
.cn-root .carmar-review{
  display:flex;flex-direction:column;max-width:min(880px,92vw);max-height:86vh;width:100%;
  background:var(--cn-surface,#fff);border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-md,10px);box-shadow:var(--cn-shadow-lg,0 12px 40px rgba(0,0,0,.25));
  overflow:hidden;
}
.cn-root .carmar-review-head{padding:14px 18px 10px;border-bottom:1px solid var(--cn-hairline,rgba(0,0,0,.08));}
.cn-root .carmar-review-title{
  font:600 15px/1.4 var(--cn-font,system-ui);color:var(--cn-text,#202124);
  display:inline-block;margin-right:8px;
}
.cn-root .carmar-review-source{
  font:600 9.5px/1 var(--cn-font,system-ui);text-transform:uppercase;letter-spacing:.06em;
  color:#5f6368;background:rgba(0,0,0,.06);border-radius:3px;padding:3px 6px;vertical-align:2px;
}
.cn-root .carmar-review-note{
  font:400 11.5px/1.5 var(--cn-font,system-ui);color:var(--cn-text-dim,#5f6368);margin-top:4px;
}
.cn-root .carmar-review-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:10px 14px;}
.cn-root .carmar-review-file{
  border:1px solid var(--cn-hairline,rgba(0,0,0,.09));border-radius:var(--cn-radius-sm,6px);
  margin-bottom:10px;overflow:hidden;
}
.cn-root .carmar-review-file[data-off="true"]{opacity:.45;}
.cn-root .carmar-review-filebar{
  display:flex;align-items:center;gap:8px;padding:6px 9px;background:rgba(0,0,0,.03);
  font:600 11px/1.4 var(--cn-font,system-ui);color:#3c4043;cursor:pointer;
}
.cn-root .carmar-review-filename{flex:1 1 auto;}
.cn-root .carmar-review-open{
  font:500 10px/1 var(--cn-font,system-ui);color:var(--cn-accent,#4e79a7);
  background:transparent;border:1px solid var(--cn-border);border-radius:4px;
  padding:3px 7px;cursor:pointer;
}
.cn-root .carmar-review-diff{
  margin:0;padding:6px 0;font-family:var(--cn-mono);font-size:11.5px;line-height:1.55;
  white-space:pre;overflow-x:auto;
}
.cn-root .carmar-review-diff span{display:block;padding:0 9px;}
.cn-root .carmar-review-add{background:rgba(46,160,67,.14);color:#136229;}
.cn-root .carmar-review-remove{background:rgba(207,34,46,.12);color:#8b1a22;}
.cn-root .carmar-review-equal{color:#5f6368;}
.cn-root .carmar-review-gap{color:#bdc1c6;}
.cn-root .carmar-review-skipped{
  border:1px dashed var(--cn-border);border-radius:var(--cn-radius-sm,6px);padding:8px 10px;
}
.cn-root .carmar-review-skiptitle{
  font:600 10.5px/1.4 var(--cn-font,system-ui);color:var(--cn-text-dim,#5f6368);margin-bottom:4px;
}
.cn-root .carmar-review-skiprow{display:flex;gap:8px;align-items:baseline;padding:2px 0;}
.cn-root .carmar-review-skipwhere{font:600 10px/1.4 var(--cn-font,system-ui);color:#9aa0a6;flex:0 0 auto;}
.cn-root .carmar-review-skiptext{font-family:var(--cn-mono);font-size:11px;color:#5f6368;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-review-skipwhy{font:400 10px/1.4 var(--cn-font,system-ui);color:#9aa0a6;flex:0 0 auto;font-style:italic;}
.cn-root .carmar-review-error{
  margin:0 14px 8px;padding:8px 10px;border-radius:var(--cn-radius-sm,6px);
  background:rgba(207,34,46,.10);color:#8b1a22;font:400 11.5px/1.5 var(--cn-font,system-ui);
}
.cn-root .carmar-review-foot{
  display:flex;align-items:center;gap:8px;padding:10px 14px;
  border-top:1px solid var(--cn-hairline,rgba(0,0,0,.08));
}
.cn-root .carmar-review-count{flex:1 1 auto;font:400 11px/1.4 var(--cn-font,system-ui);color:var(--cn-text-dim,#9aa0a6);}
.cn-root .carmar-review-btn{
  font:500 12px/1 var(--cn-font,system-ui);padding:7px 14px;cursor:pointer;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm,6px);
  background:var(--cn-control-bg,#fff);color:var(--cn-text,#202124);
}
.cn-root .carmar-review-btn.is-primary{
  background:var(--cn-accent,#4e79a7);border-color:var(--cn-accent,#4e79a7);color:#fff;
}
.cn-root .carmar-review-btn[disabled]{opacity:.5;cursor:default;}
/* \u2500\u2500 Find pane (CODE search \u2014 the sidebar tab) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Prefixed carmar-codefind- because carmar-find- is prose find's
   (lib/prose-find.js) and has been since before this pane. Sharing it in
   0.50.0 restyled prose find's bar into a vertical column.
   \u2500\u2500 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The result list scrolls on its OWN, not with the pane: the query row must
   stay reachable while you read 400 matches, and rows are painted a
   screenful at a time as this box scrolls (lib/find-pane.js). */
.cn-root .carmar-codefind{padding:6px 5px;display:flex;flex-direction:column;min-height:0;height:100%;}
.cn-root .carmar-codefind-bar{display:flex;gap:3px;align-items:center;padding:0 3px 6px;}
.cn-root .carmar-codefind-input{
  flex:1 1 auto;min-width:0;font:400 var(--cn-fs-sm,11px)/1.5 var(--cn-font,system-ui);
  padding:4px 7px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm,6px);
  background:var(--cn-control-bg,#fff);color:var(--cn-text,#202124);
}
.cn-root .carmar-codefind-flag{
  font:600 10px/1 var(--cn-mono);padding:4px 5px;cursor:pointer;color:#9aa0a6;
  background:transparent;border:1px solid transparent;border-radius:4px;
}
.cn-root .carmar-codefind-flag[aria-pressed="true"]{
  color:var(--cn-accent,#4e79a7);border-color:var(--cn-border);background:rgba(78,121,167,.10);
}
.cn-root .carmar-codefind-replace{padding-top:0;}
.cn-root .carmar-codefind-go{
  font:600 10px/1 var(--cn-font,system-ui);padding:5px 8px;color:var(--cn-accent,#4e79a7);
  border:1px solid var(--cn-border);border-radius:4px;background:var(--cn-control-bg,#fff);
}
.cn-root .carmar-codefind-go:hover{background:rgba(78,121,167,.10);}
.cn-root .carmar-codefind-status{
  font:400 10px/1.5 var(--cn-font,system-ui);color:var(--cn-text-dim,#9aa0a6);
  padding:0 8px 4px;
}
.cn-root .carmar-codefind-list{flex:1 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;}
.cn-root .carmar-codefind-row{
  display:flex;flex-direction:column;gap:1px;width:100%;text-align:left;
  background:transparent;border:0;border-top:1px solid var(--cn-hairline,rgba(0,0,0,.07));
  cursor:pointer;padding:5px 8px;font:inherit;
}
.cn-root .carmar-codefind-row:first-child{border-top:0;}
.cn-root .carmar-codefind-row:hover{background:rgba(0,0,0,.05);}
.cn-root .carmar-codefind-row:focus-visible{outline:var(--cn-focus-ring,2px solid #4e79a7);outline-offset:-2px;}
.cn-root .carmar-codefind-where{
  font:600 10px/1.4 var(--cn-font,system-ui);color:var(--cn-text-dim,#9aa0a6);
}
.cn-root .carmar-codefind-text{
  font-family:var(--cn-mono);font-size:11px;color:#3c4043;
  white-space:pre;overflow:hidden;text-overflow:ellipsis;
}
/* A same-spelling hit that is NOT this symbol (a field, an argument name).
   Shown, because a rename must say what it declined to touch \u2014 dimmed,
   because it is not what you asked for. */
.cn-root .carmar-codefind-row[data-field="true"] .carmar-codefind-text{color:#9aa0a6;font-style:italic;}
/* \u2500\u2500 Problems pane \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Deliberately plain: a problem is already an interruption, and a red-boxed,
   icon-laden list makes a missing bracket look like a system failure. One
   dim location, one plain-language message, a hairline between rows \u2014 and the
   tab label carries the count, so the pane costs nothing while it is empty. */
.cn-root .carmar-problems{padding:6px 5px;}
.cn-root .carmar-problems-empty{
  font:400 var(--cn-fs-sm,11px)/1.6 var(--cn-font,system-ui);
  color:var(--cn-text-dim,#9aa0a6);padding:8px 8px 10px;
}
.cn-root .carmar-problems-list{display:flex;flex-direction:column;}
.cn-root .carmar-problem{
  display:flex;flex-direction:column;gap:1px;width:100%;text-align:left;
  background:transparent;border:0;border-top:1px solid var(--cn-hairline,rgba(0,0,0,.07));
  cursor:pointer;padding:6px 8px;font:inherit;
}
.cn-root .carmar-problem:first-child{border-top:0;}
.cn-root .carmar-problem:hover{background:rgba(0,0,0,.05);}
.cn-root .carmar-problem:focus-visible{outline:var(--cn-focus-ring,2px solid #4e79a7);outline-offset:-2px;}
.cn-root .carmar-problem-where{
  font:600 10px/1.4 var(--cn-font,system-ui);letter-spacing:.02em;
  color:var(--cn-text-dim,#9aa0a6);
}
.cn-root .carmar-problem-msg{
  font:400 var(--cn-fs-sm,11px)/1.5 var(--cn-font,system-ui);color:#3c4043;
}
.cn-root .carmar-problem[data-severity="error"] .carmar-problem-where{color:#c5303e;}
.cn-root .carmar-sb-tab.has-problems{color:#c5303e;}
.cn-root .carmar-outline{padding:6px 5px;}
.cn-root .carmar-outline-list{display:flex;flex-direction:column;gap:1px;}
.cn-root .carmar-outline-item{
  display:block;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;
  font:400 var(--cn-fs-sm,11px)/1.5 var(--cn-font,system-ui);color:#3c4043;
  padding:3px 8px;border-radius:var(--cn-radius-sm,6px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-outline-item:hover{background:rgba(0,0,0,.05);color:#1a73e8;}
.cn-root .carmar-outline-item:focus-visible{outline:var(--cn-focus-ring,2px solid #4e79a7);outline-offset:-2px;}
.cn-root .carmar-outline-item.is-l1{font-weight:600;color:#202124;}
/* A code definition in the outline. Monospace and a leading glyph, so prose
   and code are told apart at a glance without a second list. */
.cn-root .carmar-outline-item.is-code{
  font-family:var(--cn-mono);font-size:10.5px;color:#1c5391;padding-left:18px;position:relative;
}
.cn-root .carmar-outline-item.is-code::before{
  content:"\u2261";position:absolute;left:6px;color:#9aa0a6;font-family:var(--cn-font,system-ui);
}
.cn-root .carmar-outline-item.is-code[data-kind="function"]::before{content:"\u0192";font-style:italic;}
.cn-root .carmar-outline-item.is-l2{padding-left:18px;}
.cn-root .carmar-outline-item.is-l3{padding-left:28px;}
.cn-root .carmar-outline-item.is-l4{padding-left:38px;}
.cn-root .carmar-outline-item.is-l5{padding-left:48px;}
.cn-root .carmar-outline-item.is-l6{padding-left:58px;}
.cn-root .carmar-outline-flash{animation:carmar-outline-flash 1.2s ease-out;}
@keyframes carmar-outline-flash{
  from{background:color-mix(in srgb,var(--cn-accent,#4e79a7) 16%,transparent);}
  to{background:transparent;}
}
@media (prefers-reduced-motion:reduce){
  .cn-root .carmar-outline-flash{animation:none;}
}

/* \u2500\u2500 Object Observatory \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Semantic zoom for the live R workspace: inventory row -> inline lens ->
   full workbench tab. It deliberately uses the existing CarmaR tokens and
   small inline SVGs; no UI or charting dependency is shipped for this pane. */
.cn-root:has(.carmar-obs){--carmar-side-w:300px;}
.cn-root .carmar-obs{
  --obs-ink:var(--cn-text,#182a3b);
  --obs-muted:var(--cn-text-muted,#687684);
  --obs-line:color-mix(in srgb,var(--cn-border,#d7dde2) 82%,transparent);
  --obs-paper:var(--cn-surface,#fff);
  --obs-wash:color-mix(in srgb,var(--cn-accent,#276dc3) 6%,var(--cn-surface,#fff));
  color:var(--obs-ink);background:var(--obs-paper);min-height:100%;
}
/* The old section builders remain available to Files/Help and older kernels,
   but the Environment surface has one visual owner now. */
.cn-root .carmar-obs ~ .carmar-sb-empty,
.cn-root .carmar-obs ~ .carmar-sb-section{display:none !important;}
.cn-root .carmar-obs-mast{
  position:relative;overflow:hidden;display:flex;align-items:flex-end;gap:12px;
  min-height:64px;padding:12px 14px 10px;border-bottom:1px solid var(--obs-line);
  background:
    radial-gradient(circle at 92% 5%,color-mix(in srgb,var(--cn-accent,#276dc3) 17%,transparent),transparent 44%),
    linear-gradient(142deg,var(--obs-paper),var(--obs-wash));
}
.cn-root .carmar-obs-mast::after{
  content:"";position:absolute;right:-18px;bottom:-24px;width:108px;height:108px;
  border:1px solid color-mix(in srgb,var(--cn-accent,#276dc3) 14%,transparent);
  border-radius:50%;box-shadow:0 0 0 17px color-mix(in srgb,var(--cn-accent,#276dc3) 4%,transparent);
  pointer-events:none;
}
.cn-root .carmar-obs-mast-copy{position:relative;z-index:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.cn-root .carmar-obs-kicker{
  color:var(--cn-accent-deep,#174f91);font-size:9px;font-weight:750;letter-spacing:.13em;text-transform:uppercase;
}
.cn-root .carmar-obs-title{
  font-family:var(--cn-font);font-size:17px;line-height:1.15;letter-spacing:-.025em;font-weight:680;
}
.cn-root .carmar-obs-session{
  position:relative;z-index:1;margin-left:auto;max-width:120px;color:var(--obs-muted);
  font:500 9px/1.35 var(--cn-mono);font-variant-numeric:tabular-nums;text-align:right;
}
.cn-root .carmar-obs-tools{display:flex;align-items:center;gap:7px;padding:7px 10px 4px;}
.cn-root .carmar-obs-search{
  flex:1 1 auto;min-width:0;height:28px;display:flex;align-items:center;gap:7px;padding:0 8px;
  border:1px solid var(--obs-line);border-radius:8px;background:var(--obs-wash);
  transition:border-color 150ms ease,box-shadow 150ms ease,background 150ms ease;
}
.cn-root .carmar-obs-search:focus-within{
  border-color:color-mix(in srgb,var(--cn-accent,#276dc3) 65%,var(--obs-line));
  background:var(--obs-paper);box-shadow:0 0 0 3px color-mix(in srgb,var(--cn-accent,#276dc3) 11%,transparent);
}
.cn-root .carmar-obs-search-glyph{display:flex;color:var(--obs-muted);flex:0 0 14px;}
.cn-root .carmar-obs-search-glyph svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5;}
.cn-root .carmar-obs-search-input{
  width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--obs-ink);
  font:500 11px var(--cn-font);padding:0;
}
.cn-root .carmar-obs-search-input::placeholder{color:color-mix(in srgb,var(--obs-muted) 72%,transparent);}
.cn-root .carmar-obs-sort{
  height:28px;max-width:72px;border:1px solid var(--obs-line);border-radius:8px;
  background:var(--obs-paper);color:var(--obs-muted);font:600 9px var(--cn-font);padding:0 5px;
}
.cn-root .carmar-obs-filters{display:flex;gap:5px;padding:1px 10px 7px;overflow-x:auto;scrollbar-width:none;}
.cn-root .carmar-obs-filters::-webkit-scrollbar{display:none;}
.cn-root .carmar-obs-filter{
  border:1px solid transparent;border-radius:999px;background:transparent;color:var(--obs-muted);
  font:650 9px var(--cn-font);padding:3px 7px;cursor:pointer;white-space:nowrap;
}
.cn-root .carmar-obs-filter:hover{background:var(--obs-wash);color:var(--cn-accent-deep,#174f91);}
.cn-root .carmar-obs-filter.active{
  color:var(--cn-accent-deep,#174f91);background:color-mix(in srgb,var(--cn-accent,#276dc3) 11%,var(--obs-paper));
  border-color:color-mix(in srgb,var(--cn-accent,#276dc3) 18%,transparent);
}
.cn-root .carmar-obs-inventory{padding:0 0 30px;}
.cn-root .carmar-obs-group{border-top:1px solid var(--obs-line);}
.cn-root .carmar-obs-group-head{
  width:100%;height:28px;display:flex;align-items:center;gap:7px;padding:0 10px;border:0;
  background:color-mix(in srgb,var(--obs-wash) 72%,var(--obs-paper));color:var(--obs-muted);cursor:pointer;text-align:left;
}
.cn-root .carmar-obs-group-head:hover{background:var(--obs-wash);}
.cn-root .carmar-obs-group-name{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--obs-ink);}
.cn-root .carmar-obs-group-note{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;opacity:.72;}
.cn-root .carmar-obs-count{
  margin-left:auto;min-width:17px;height:15px;display:inline-grid;place-items:center;padding:0 4px;
  border:1px solid var(--obs-line);border-radius:999px;background:var(--obs-paper);font:600 8px var(--cn-mono);
}
.cn-root .carmar-obs-chevron{display:inline-flex;align-items:center;justify-content:center;flex:0 0 12px;color:var(--obs-muted);}
.cn-root .carmar-obs-chevron svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:1.4;transition:transform 180ms cubic-bezier(.2,.8,.2,1);}
.cn-root .carmar-obs-chevron.is-open svg{transform:rotate(90deg);}
.cn-root .carmar-obs-object{position:relative;border-bottom:1px solid color-mix(in srgb,var(--obs-line) 62%,transparent);}
.cn-root .carmar-obs-object::before{
  content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:transparent;transition:background 150ms ease;
}
.cn-root .carmar-obs-object.is-selected::before{background:var(--cn-accent,#276dc3);}
.cn-root .carmar-obs-object,
.cn-root .carmar-obs-object + .carmar-obs-object{border-top:0;border-bottom:0;}
.cn-root .carmar-obs-row{
  min-height:25px;display:grid;grid-template-columns:11px 18px minmax(0,1fr) auto auto auto 18px;
  align-items:center;gap:4px;padding:0 6px;transition:background 140ms ease;
}
.cn-root .carmar-obs-object:hover > .carmar-obs-row,
.cn-root .carmar-obs-object.is-selected > .carmar-obs-row{background:var(--obs-wash);}
.cn-root .carmar-obs-disclosure{
  width:11px;height:17px;display:grid;place-items:center;padding:0;border:0;background:transparent;color:var(--obs-muted);cursor:pointer;
}
.cn-root .carmar-obs-disclosure:disabled{opacity:0;cursor:default;}
.cn-root .carmar-obs-glyph{
  width:17px;height:17px;display:grid;place-items:center;border-radius:4px;
  color:var(--cn-accent-deep,#174f91);background:color-mix(in srgb,var(--cn-accent,#276dc3) 10%,var(--obs-paper));
}
.cn-root .carmar-obs-glyph svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round;}
.cn-root .carmar-obs-glyph[data-kind="model"]{color:#8a5c12;background:#f7edd8;}
.cn-root .carmar-obs-glyph[data-kind="collection"]{color:#596579;background:#eef1f5;}
.cn-root .carmar-obs-glyph[data-kind="value"]{color:#0f766e;background:#e5f4f1;}
.cn-root .carmar-obs-glyph[data-kind="function"]{color:#9a4a28;background:#f9ebe5;}
.cn-root .carmar-obs-identity{
  min-width:0;display:flex;flex-direction:row;align-items:baseline;gap:5px;padding:0;border:0;
  background:transparent;color:inherit;text-align:left;cursor:pointer;
}
.cn-root .carmar-obs-object-name{
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:var(--obs-ink);font:610 11px var(--cn-mono);letter-spacing:-.01em;
}
.cn-root .carmar-obs-signature{
  max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:var(--obs-muted);font:480 9px var(--cn-font);
}
.cn-root .carmar-obs-memory{color:var(--obs-muted);font:500 8px var(--cn-mono);white-space:nowrap;font-variant-numeric:tabular-nums;opacity:.72;}
.cn-root .carmar-obs-changed{
  display:none;color:#8a5c12;background:#f7edd8;border-radius:999px;padding:2px 5px;
  font:700 7px var(--cn-font);letter-spacing:.04em;text-transform:uppercase;
}
.cn-root .carmar-obs-object.is-changed .carmar-obs-changed{display:inline-flex;animation:carmar-obs-change 700ms ease both;}
@keyframes carmar-obs-change{0%{box-shadow:0 0 0 0 rgba(184,132,43,.35)}100%{box-shadow:0 0 0 7px rgba(184,132,43,0)}}
.cn-root .carmar-obs-open{
  border:1px solid var(--obs-line);border-radius:999px;background:var(--obs-paper);color:var(--cn-accent-deep,#174f91);
  font:680 8px var(--cn-font);padding:1px 5px;cursor:pointer;white-space:nowrap;opacity:.78;
}
.cn-root .carmar-obs-open:hover{border-color:var(--cn-accent,#276dc3);background:var(--obs-wash);opacity:1;}
.cn-root .carmar-obs-remove{
  width:18px;height:18px;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;
  color:var(--obs-muted);cursor:pointer;opacity:0;transition:opacity 120ms ease,background 120ms ease,color 120ms ease;
}
.cn-root .carmar-obs-remove svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round;}
.cn-root .carmar-obs-object:hover .carmar-obs-remove,
.cn-root .carmar-obs-object.is-selected .carmar-obs-remove,
.cn-root .carmar-obs-remove:focus{opacity:1;}
.cn-root .carmar-obs-remove:hover{background:#fce9e7;color:#b42318;}
.cn-root .carmar-obs-lens{
  margin:0 6px 5px 31px;overflow:hidden;border:1px solid var(--obs-line);border-radius:10px;
  background:linear-gradient(160deg,var(--obs-paper),var(--obs-wash));box-shadow:0 8px 20px -18px rgba(20,42,60,.55);
  animation:carmar-obs-open 180ms cubic-bezier(.2,.8,.2,1) both;
}
@keyframes carmar-obs-open{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.cn-root .carmar-obs-lens-head{
  display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px 6px;
  border-bottom:1px solid color-mix(in srgb,var(--obs-line) 72%,transparent);
}
.cn-root .carmar-obs-lens-head strong{font-size:9px;letter-spacing:.07em;text-transform:uppercase;}
.cn-root .carmar-obs-lens-head span{color:var(--obs-muted);font:500 8px var(--cn-mono);}
.cn-root .carmar-obs-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid var(--obs-line);}
.cn-root .carmar-obs-metric{display:flex;flex-direction:column;gap:1px;padding:8px 7px;border-right:1px solid var(--obs-line);min-width:0;}
.cn-root .carmar-obs-metric:last-child{border-right:0;}
.cn-root .carmar-obs-metric span{color:var(--obs-muted);font-size:7px;text-transform:uppercase;letter-spacing:.05em;}
.cn-root .carmar-obs-metric strong{font:650 10px var(--cn-mono);overflow:hidden;text-overflow:ellipsis;}
.cn-root .carmar-obs-metric.is-warning strong{color:#a45b10;}
.cn-root .carmar-obs-profiles{padding:3px 6px 7px;}
.cn-root .carmar-obs-profiles .carmar-var{padding:4px;border-radius:6px;}
.cn-root .carmar-obs-structure{max-height:310px;overflow:auto;}
.cn-root .carmar-obs-structure .carmar-st-row{gap:5px;padding-top:4px;padding-bottom:4px;}
.cn-root .carmar-obs-structure .carmar-st-name{flex:0 1 88px;}
.cn-root .carmar-obs-structure .carmar-st-class{max-width:64px;overflow:hidden;text-overflow:ellipsis;}
.cn-root .carmar-obs-structure .carmar-st-size{display:none;}
.cn-root .carmar-obs-preview{
  max-height:180px;overflow:auto;margin:0;padding:9px 10px 11px;background:transparent;color:var(--obs-ink);
  font:500 9px/1.55 var(--cn-mono);white-space:pre-wrap;overflow-wrap:anywhere;
}
.cn-root .carmar-obs-message{padding:9px 10px;color:var(--obs-muted);font-size:9px;line-height:1.5;}
.cn-root .carmar-obs-loading{display:flex;align-items:center;gap:8px;padding:12px;color:var(--obs-muted);font-size:9px;}
.cn-root .carmar-obs-loading-mark{
  width:11px;height:11px;border:1.5px solid color-mix(in srgb,var(--cn-accent,#276dc3) 24%,transparent);
  border-top-color:var(--cn-accent,#276dc3);border-radius:50%;animation:carmar-obs-spin 700ms linear infinite;
}
@keyframes carmar-obs-spin{to{transform:rotate(360deg)}}
.cn-root .carmar-obs-empty{
  min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
  padding:24px;text-align:center;color:var(--obs-muted);
}
.cn-root .carmar-obs-empty .carmar-obs-glyph{width:38px;height:38px;border-radius:12px;margin-bottom:3px;}
.cn-root .carmar-obs-empty .carmar-obs-glyph svg{width:21px;height:21px;}
.cn-root .carmar-obs-empty strong{color:var(--obs-ink);font-size:11px;}
.cn-root .carmar-obs-empty span:last-child{max-width:230px;font-size:9px;line-height:1.55;}
@media (max-width:760px){
  .cn-root:has(.carmar-obs){--carmar-side-w:min(44vw,320px);}
  .cn-root .carmar-obs-row{grid-template-columns:11px 18px minmax(0,1fr) auto auto 18px;}
  .cn-root .carmar-obs-memory{display:none;}
}
@media (max-width:600px){
  .cn-root:has(.carmar-obs){grid-template-columns:24px minmax(0,1fr) !important;}
  .cn-root:has(.carmar-obs) > .carmar-side{
    position:fixed;left:0;top:var(--carmar-hdr-h,0px);z-index:190;width:min(88vw,370px);
    box-shadow:18px 0 42px -28px rgba(15,35,52,.55);
  }
  .cn-root:has(.carmar-obs).carmar-collapsed > .carmar-side{width:24px;box-shadow:none;}
}
@media (prefers-reduced-motion:reduce){
  .cn-root .carmar-obs-chevron svg,.cn-root .carmar-obs-lens,.cn-root .carmar-obs-object.is-changed .carmar-obs-changed{animation:none;transition:none;}
}

/* \u2500\u2500 the Data tab \u2014 View(df) as a pane, never furniture over the analysis. \u2500\u2500 */
.cn-root .carmar-vw{min-height:0;}
.cn-root .carmar-vw.is-loading{opacity:.6;}
.cn-root .carmar-vw-head{
  display:flex;align-items:center;gap:8px;flex:0 0 auto;
  padding:7px 10px;border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-vw-name{
  font-family:var(--cn-mono);font-size:11px;font-weight:600;color:#202124;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-vw-dims{
  font-size:10px;color:#9aa0a6;font-variant-numeric:tabular-nums;white-space:nowrap;
}
.cn-root .carmar-vw-sp{flex:1;}
.cn-root .carmar-vw-pager{display:inline-flex;align-items:center;gap:5px;}
.cn-root .carmar-vw-range{
  font-family:var(--cn-mono);font-size:9px;color:#5f6368;
  font-variant-numeric:tabular-nums;white-space:nowrap;
}
.cn-root .carmar-vw-pg{
  font:inherit;font-size:11px;line-height:1;cursor:pointer;padding:1px 6px;
  border:1px solid #dadce0;border-radius:3px;background:var(--cn-surface);color:#5f6368;
}
.cn-root .carmar-vw-pg:hover:not(:disabled){border-color:#1a73e8;color:#1a73e8;}
.cn-root .carmar-vw-pg:disabled{opacity:.35;cursor:default;}
.cn-root .carmar-vw-colpager{margin-right:8px;}
.cn-root .carmar-vw-clamp{
  font-size:9px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;
  color:#b45309;white-space:nowrap;
}
.cn-root .carmar-vw-body{display:block;min-height:0;}
.cn-root .carmar-vw-foldable.folded{display:none;}
.cn-root .carmar-vw-note{padding:12px 14px;font-size:11px;color:#9aa0a6;line-height:1.55;}
.cn-root .carmar-vw-label{
  padding:8px 10px 2px;font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.8px;color:#9aa0a6;flex:0 0 auto;
}
.cn-root .carmar-vw-pre{
  margin:0 10px 10px;padding:8px 10px;min-height:0;overflow:auto;
  font-family:var(--cn-mono);font-size:11px;line-height:1.55;white-space:pre;
  background:var(--cn-control-bg);border:1px solid var(--cn-border-soft);
  border-radius:var(--cn-radius-sm);color:var(--cn-text);
}
.cn-root .carmar-vw-viewbar{
  display:flex;align-items:center;gap:4px;padding:6px 10px;
  border-bottom:1px solid var(--cn-border-soft);
}

/* \u2500\u2500 the structure tree \u2014 lists, fits, S4: one row per child. \u2500\u2500 */
.cn-root .carmar-st-host{min-height:0;}
.cn-root .carmar-st{padding:4px 0 8px;}
.cn-root .carmar-st-row{
  display:flex;align-items:center;gap:7px;padding:3px 10px 3px 0;min-width:0;
  font-size:11px;line-height:1.45;color:#202124;
}
.cn-root .carmar-st-row.is-branch{cursor:pointer;}
.cn-root .carmar-st-row:hover{background:var(--cn-surface-soft);}
.cn-root .carmar-st-caret{
  flex:0 0 12px;width:12px;text-align:center;font-size:9px;color:#9aa0a6;
  user-select:none;
}
.cn-root .carmar-st-name{
  font-family:var(--cn-mono);font-weight:500;color:#202124;flex:0 1 auto;
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-st-class{font-size:10px;color:#5f6368;white-space:nowrap;}
.cn-root .carmar-st-len,.cn-root .carmar-st-size{
  font-family:var(--cn-mono);font-size:9px;color:#9aa0a6;white-space:nowrap;
  font-variant-numeric:tabular-nums;
}
.cn-root .carmar-st-preview{
  flex:1 1 auto;min-width:0;font-family:var(--cn-mono);font-size:10px;
  color:#9aa0a6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-st-open{
  flex:0 0 auto;font:600 9px var(--cn-font);letter-spacing:.2px;cursor:pointer;
  padding:1px 7px;border:1px solid #dadce0;border-radius:999px;
  background:var(--cn-surface);color:#5f6368;white-space:nowrap;
}
.cn-root .carmar-st-open:hover{border-color:#1a73e8;color:#1a73e8;background:#e8f0fe;}
.cn-root .carmar-st-note{
  padding:3px 10px;font-size:10px;color:#9aa0a6;font-style:italic;
}
/* Badge colors for the tree's and the completion popup's extra kinds. */
.cn-root .carmar-var-badge[data-kind="data"]{background:var(--cn-accent-soft);color:var(--cn-accent-deep);}
.cn-root .carmar-var-badge[data-kind="function"]{background:#fef3e2;color:#b45309;}
.cn-root .carmar-var-badge[data-kind="variable"]{background:#e8f0fe;color:#1a73e8;}
.cn-root .carmar-var-badge[data-kind="argument"]{background:#e6f4ea;color:#137333;}
.cn-root .carmar-var-badge[data-kind="package"]{background:#e6f7f7;color:var(--cn-accent-deep,#3a6a9f);}

/* \u2500\u2500 the completion popup \u2014 anchored at the caret, fixed so it can never
   push layout or overflow the page. ~12 rows visible, scroll for more. \u2500\u2500 */
.cn-root .carmar-ac{
  position:fixed;z-index:500;min-width:220px;max-width:400px;box-sizing:border-box;
  max-height:276px;overflow-y:auto;overflow-x:hidden;padding:3px;
  background:var(--cn-surface);border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-lg);
}
.cn-root .carmar-ac-row{
  display:flex;align-items:center;gap:7px;padding:3px 8px;border-radius:4px;
  cursor:pointer;min-width:0;
}
.cn-root .carmar-ac-row:hover,.cn-root .carmar-ac-row.active{background:var(--cn-accent-soft);}
.cn-root .carmar-ac-value{
  font-family:var(--cn-mono);font-size:12px;color:var(--cn-text);white-space:nowrap;
}
.cn-root .carmar-ac-detail{
  flex:1 1 auto;min-width:0;margin-left:14px;text-align:right;
  font-family:var(--cn-mono);font-size:10px;color:var(--cn-text-dim);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-ac-more{padding:2px 8px;font-size:10px;color:var(--cn-text-dim);}

/* \u2500\u2500 the Help tab \u2014 R's own help pages, restyled to the pane's scale. \u2500\u2500 */
.cn-root .carmar-help-bar{
  flex:0 0 auto;padding:8px 10px;border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-help-input{
  width:100%;box-sizing:border-box;font-family:var(--cn-font);font-size:11px;
  padding:4px 8px;border:1px solid #dadce0;border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:#202124;outline:none;
}
.cn-root .carmar-help-input:focus{border-color:var(--cn-accent);background:var(--cn-surface);}
.cn-root .carmar-help{padding:0;}
.cn-root .carmar-help-page{padding:10px 14px 20px;font-size:12px;line-height:1.55;color:var(--cn-text);}
.cn-root .carmar-help-page h1,.cn-root .carmar-help-page h2{
  font-size:13px;font-weight:600;margin:.8em 0 .35em;color:#202124;
}
.cn-root .carmar-help-page h3{font-size:12px;font-weight:600;margin:.7em 0 .3em;}
.cn-root .carmar-help-page p{margin:.4em 0;}
.cn-root .carmar-help-page code,.cn-root .carmar-help-page pre,
.cn-root .carmar-help-page .carmar-help-text{
  font-family:var(--cn-mono);font-size:11px;
}
.cn-root .carmar-help-page pre{
  padding:8px 10px;overflow-x:auto;background:var(--cn-control-bg);
  border:1px solid var(--cn-border-soft);border-radius:var(--cn-radius-sm);
}
.cn-root .carmar-help-page table{border-collapse:collapse;width:100%;font-size:11px;}
.cn-root .carmar-help-page td,.cn-root .carmar-help-page th{
  padding:3px 8px 3px 0;vertical-align:top;border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-help-page a{color:var(--cn-accent);text-decoration:none;}
.cn-root .carmar-help-page img{max-width:100%;}
.cn-root .carmar-help-page hr{border:0;border-top:1px solid var(--cn-border-soft);}

/* The grid: 12px data rows, sortable headers, its own scroll region so the
   page never scrolls horizontally. */
.cn-root .carmar-grid-wrap{overflow:auto;max-height:calc(100vh - 240px);}
.cn-root .carmar-grid{border-collapse:collapse;width:max-content;min-width:100%;font-size:12px;}
.cn-root .carmar-grid th{
  position:sticky;top:0;z-index:1;background:var(--cn-surface);
  border-bottom:1px solid var(--cn-border);padding:0;text-align:left;
}
.cn-root .carmar-grid-sort{
  display:flex;align-items:center;gap:4px;width:100%;padding:5px 10px;
  font:600 11px var(--cn-font);color:var(--cn-text-muted);cursor:pointer;
  background:transparent;border:0;white-space:nowrap;
}
.cn-root .carmar-grid th.is-num .carmar-grid-sort{justify-content:flex-end;}
.cn-root .carmar-grid-sort:hover{color:var(--cn-accent-deep);background:var(--cn-accent-soft);}
.cn-root .carmar-grid th.is-sorted .carmar-grid-sort{color:var(--cn-accent-deep);}
.cn-root .carmar-grid-arrow{font-size:9px;line-height:1;}
.cn-root .carmar-grid td{
  padding:3px 10px;border-bottom:1px solid var(--cn-border-soft);
  white-space:nowrap;max-width:28ch;overflow:hidden;text-overflow:ellipsis;
  color:var(--cn-text);
}
.cn-root .carmar-grid td.is-num{
  text-align:right;font-family:var(--cn-mono);font-size:11px;
  font-variant-numeric:tabular-nums;
}
.cn-root .carmar-grid td.is-na{color:var(--cn-text-dim);font-style:italic;}
.cn-root .carmar-grid tbody tr:hover td{background:var(--cn-surface-soft);}
.cn-root .carmar-grid .carmar-grid-idx{
  position:sticky;left:0;background:var(--cn-surface);color:var(--cn-text-dim);
  font-family:var(--cn-mono);font-size:10px;text-align:right;padding:3px 8px;
  border-right:1px solid var(--cn-border-soft);font-variant-numeric:tabular-nums;
}
.cn-root .carmar-grid th.carmar-grid-idx{z-index:2;}
/* Search, Filter and Export live IN the head row, not on a band below it: a
   second bar spends ~40 px of vertical space on every data tab to hold three
   controls that fit in the gap the head row already has. No padding, no rule,
   no background of its own \u2014 it is a group inside a row, not a row. */
.cn-root .carmar-vw-tools{
  display:flex;align-items:center;gap:6px;flex:0 1 auto;min-width:0;margin-left:4px;
}
.cn-root .carmar-vw-tools[hidden]{display:none;}
.cn-root .carmar-vw-search{
  width:min(210px,22vw);height:25px;padding:0 9px;border:1px solid var(--cn-border);border-radius:7px;
  background:var(--cn-surface);color:var(--cn-text);font:500 10px var(--cn-font);outline:0;
}
.cn-root .carmar-vw-search:focus{border-color:var(--cn-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--cn-accent) 10%,transparent);}
.cn-root .carmar-vw-filter,.cn-root .carmar-vw-filter-clear{
  height:25px;border:1px solid var(--cn-border);border-radius:7px;background:var(--cn-surface);color:var(--cn-text-muted);
  font:650 9px var(--cn-font);padding:0 8px;cursor:pointer;white-space:nowrap;
}
.cn-root .carmar-vw-filter:hover,.cn-root .carmar-vw-filter.active{border-color:var(--cn-accent);color:var(--cn-accent-deep);background:var(--cn-accent-soft);}
.cn-root .carmar-vw-filter-count{
  display:inline-grid;place-items:center;min-width:14px;height:14px;margin-left:5px;padding:0 3px;border-radius:999px;
  background:var(--cn-accent);color:#fff;font:700 7px var(--cn-mono);
}
.cn-root .carmar-vw-filter-count[hidden],.cn-root .carmar-vw-filter-clear[hidden]{display:none;}
.cn-root .carmar-vw-filter-clear{border-color:transparent;background:transparent;}
.cn-root .carmar-vw-filter-status{margin-left:2px;color:var(--cn-text-muted);font:500 8px var(--cn-mono);}
/* Hidden columns announce themselves. A column you cannot see and cannot find
   a way back to is data loss as far as the reader is concerned. */
.cn-root .carmar-vw-hidden{
  height:25px;border:1px dashed var(--cn-border);border-radius:7px;background:transparent;
  color:var(--cn-text-muted);font:650 9px var(--cn-font);padding:0 8px;cursor:pointer;white-space:nowrap;
}
.cn-root .carmar-vw-hidden:hover{border-style:solid;border-color:var(--cn-accent);color:var(--cn-accent-deep);background:var(--cn-accent-soft);}
/* \u2500\u2500 Export \u25BE \u2014 one menu, two homes (lib/export-menu.js) \u2500\u2500
   On the viewer's tools row it wears the Filter button's chrome, because it
   is the third thing you do to a table you are looking at. On an Object
   Observatory row it is compact and icon-only, sitting beside Open, where
   the row has no width to spare. The status line pushes it right, so Export
   is the last control on the tools row rather than crowding search. */
.cn-root .carmar-export-btn{
  display:inline-flex;align-items:center;gap:4px;height:25px;padding:0 8px;
  border:1px solid var(--cn-border);border-radius:7px;background:var(--cn-surface);
  color:var(--cn-text-muted);font:650 9px var(--cn-font);cursor:pointer;white-space:nowrap;
}
.cn-root .carmar-export-btn:hover,.cn-root .carmar-export-btn[aria-expanded="true"]{
  border-color:var(--cn-accent);color:var(--cn-accent-deep);background:var(--cn-accent-soft);
}
.cn-root .carmar-export-btn:focus-visible{outline:0;border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring,0 0 0 3px rgba(78,121,167,.25));}
.cn-root .carmar-export-ico{display:inline-flex;align-items:center;}
.cn-root .carmar-export-ico svg{display:block;width:12px;height:12px;}
.cn-root .carmar-export-caret{font-size:8px;line-height:1;opacity:.7;}
.cn-root .carmar-export-btn.is-compact{
  height:22px;padding:0 5px;gap:2px;border-color:transparent;background:transparent;
}
.cn-root .carmar-export-btn.is-compact .carmar-export-ico svg{width:13px;height:13px;}
.cn-root .carmar-obs-row .carmar-export-btn.is-compact{opacity:0;transition:opacity 110ms var(--cn-ease,ease-out);}
.cn-root .carmar-obs-row:hover .carmar-export-btn.is-compact,
.cn-root .carmar-obs-row .carmar-export-btn.is-compact:focus-visible,
.cn-root .carmar-obs-row .carmar-export-btn.is-compact[aria-expanded="true"]{opacity:1;}
@media (prefers-reduced-motion:reduce){
  .cn-root .carmar-obs-row .carmar-export-btn.is-compact{transition:none;}
}
/* Fixed, and placed at open: the viewer scrolls and the sidebar clips, so a
   menu in the flow would be cut off by the first overflow:hidden ancestor. */
.cn-root .carmar-export-menu,.carmar-export-menu{
  position:fixed;z-index:1600;min-width:212px;padding:5px;
  border:1px solid var(--cn-border,#d8dee5);border-radius:10px;background:var(--cn-surface,#fff);
  box-shadow:0 18px 44px -14px rgba(20,35,52,.32),0 3px 12px -7px rgba(20,35,52,.2);
}
.cn-root .carmar-export-menu[hidden],.carmar-export-menu[hidden]{display:none;}
.carmar-export-item{
  width:100%;display:grid;grid-template-columns:64px minmax(0,1fr);align-items:baseline;gap:8px;
  padding:6px 9px;border:0;border-radius:6px;background:transparent;color:var(--cn-text,#202124);
  font:600 12px var(--cn-font,system-ui);text-align:left;cursor:pointer;
}
.carmar-export-item:hover,.carmar-export-item:focus-visible{
  outline:0;background:color-mix(in srgb,var(--cn-accent,#276dc3) 10%,var(--cn-surface,#fff));
  color:var(--cn-accent-deep,#174f8f);
}
.carmar-export-item-hint{color:var(--cn-text-muted,#6b7280);font:500 10.5px var(--cn-font,system-ui);}
.carmar-export-item:hover .carmar-export-item-hint{color:var(--cn-accent-deep,#174f8f);opacity:.85;}
/* The column's shape, on the second line of its header \u2014 the same builder the
   Object Observatory's profiles draw. It reads as a caption under the name,
   not as another control: no box, no border, dim mono figures.

   The shape STRETCHES. At a fixed 44 px it sat at the left edge of a
   right-aligned group, so its position drifted with the length of the stat
   text beside it and no two columns lined up. Flexing it means the second
   line spans exactly the column, edge to edge, whatever it holds \u2014 and the
   padding below matches .carmar-grid-sort's 10 px, which it did not (8 px),
   so the name and its distribution start on different verticals. */
.cn-root .carmar-grid-dist{
  display:flex;align-items:center;gap:6px;padding:0 10px 4px;min-width:0;
}
.cn-root .carmar-grid-dist .carmar-spark{flex:1 1 auto;width:auto;min-width:24px;opacity:.95;}
/* The figures sit against the name they describe: right for a numeric column
   (whose name and values are both right-aligned), left for everything else.
   Same DOM either way \u2014 only the visual order changes. */
.cn-root .carmar-grid th:not(.is-num) .carmar-grid-dist .carmar-spark{order:3;}
.cn-root .carmar-grid th:not(.is-num) .carmar-grid-dist-stat{order:1;}
.cn-root .carmar-grid th:not(.is-num) .carmar-grid-dist-miss{order:2;}
.cn-root .carmar-grid-dist-stat{
  color:var(--cn-text-dim);font:500 9.5px var(--cn-mono);flex:0 0 auto;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;
}
/* Missing is a FACT about the column, not an error in it. It used to be bold
   danger red \u2014 the loudest thing in a header whose job is to name a column. */
.cn-root .carmar-grid-dist-miss{
  color:var(--cn-danger-text,#a7372e);opacity:.75;
  font:500 9.5px var(--cn-mono);flex:0 0 auto;
}
.cn-root .carmar-grid th:hover .carmar-grid-dist .carmar-spark{opacity:1;}
/* The shape is a control, not a picture: a bar you can click says so under the
   pointer, and the bar whose filter is currently on stays lit. */
.cn-root .carmar-grid-dist.is-filterable .carmar-spark [data-filter]{cursor:pointer;}
.cn-root .carmar-grid-dist.is-filterable .carmar-spark:hover [data-filter]{opacity:.34;}
.cn-root .carmar-grid-dist.is-filterable .carmar-spark [data-filter]:hover{opacity:1;}
.cn-root .carmar-grid-dist .carmar-spark [data-filter].is-picked,
.cn-root .carmar-grid-dist.is-filterable .carmar-spark:hover [data-filter].is-picked{
  opacity:1;stroke:var(--cn-accent,#276dc3);stroke-width:.6;paint-order:stroke;
}
/* \u2500\u2500 the variable card (lib/column-stats.js) \u2500\u2500
   Fixed and placed at open, like the export menu and for the same reason: the
   grid scrolls inside its own overflow, so a card in the flow would be clipped
   by the first scroll container it met. Nothing here pushes layout. */
.cn-root .carmar-colstats{
  position:fixed;z-index:1650;width:326px;max-height:min(78vh,660px);overflow:auto;
  padding:0 0 10px;border:1px solid var(--cn-border);border-radius:12px;background:var(--cn-surface);
  box-shadow:0 24px 60px -18px rgba(20,35,52,.34),0 4px 14px -8px rgba(20,35,52,.22);
}
.cn-root .carmar-colstats[hidden]{display:none;}
.cn-root .carmar-colstats-top{
  position:sticky;top:0;z-index:1;padding:11px 12px 9px;background:var(--cn-surface);
  border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-colstats-head{display:flex;align-items:center;gap:7px;}
.cn-root .carmar-colstats-badge{flex:0 0 15px;width:15px;min-width:15px;height:15px;font-size:9px;border-radius:3px;}
.cn-root .carmar-colstats-name{
  flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font:650 13px var(--cn-font);color:var(--cn-text);
}
.cn-root .carmar-colstats-x{
  flex:0 0 auto;width:20px;height:20px;display:grid;place-items:center;border:0;border-radius:6px;
  background:transparent;color:var(--cn-text-muted);font:400 15px var(--cn-font);cursor:pointer;line-height:1;
}
.cn-root .carmar-colstats-x:hover{background:var(--cn-surface-2);color:var(--cn-text);}
.cn-root .carmar-colstats-sub{margin-top:3px;color:var(--cn-text-muted);font:500 9.5px var(--cn-mono);}
.cn-root .carmar-colstats-note{padding:14px 12px;color:var(--cn-text-muted);font:500 11px var(--cn-font);}
/* Three counters, equal columns: the reader compares them to each other. */
.cn-root .carmar-colstats-counters{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;
  margin:10px 12px 0;background:var(--cn-border-soft);border:1px solid var(--cn-border-soft);border-radius:8px;overflow:hidden;}
.cn-root .carmar-colstats-counter{display:flex;flex-direction:column;gap:1px;padding:7px 8px;background:var(--cn-surface);}
.cn-root .carmar-colstats-counter-v{font:650 13px var(--cn-mono);color:var(--cn-text);}
.cn-root .carmar-colstats-counter-k{font:600 8.5px var(--cn-font);letter-spacing:.05em;text-transform:uppercase;color:var(--cn-text-muted);}
.cn-root .carmar-colstats-counter.is-warn .carmar-colstats-counter-v{color:var(--cn-danger-text,#a7372e);}
.cn-root .carmar-colstats-fig{margin:12px 12px 0;}
.cn-root .carmar-colstats-hist{width:100%;height:62px;display:block;--carmar-spark-ink:#3b82f6;}
.cn-root .carmar-colstats-hist rect{fill:var(--carmar-spark-ink);opacity:.78;}
.cn-root .carmar-colstats-hist .carmar-colstats-hist-base{fill:var(--cn-text-dim,#6b7280);opacity:.28;}
.cn-root .carmar-colstats-ends{display:flex;justify-content:space-between;margin-top:3px;
  color:var(--cn-text-muted);font:500 9px var(--cn-mono);}
.cn-root .carmar-colstats-box{margin:12px 12px 0;}
.cn-root .carmar-colstats-boxsvg{width:100%;height:15px;display:block;}
.cn-root .carmar-colstats-whisker{fill:var(--cn-text-dim,#6b7280);opacity:.55;}
.cn-root .carmar-colstats-iqr{fill:#3b82f6;opacity:.3;}
.cn-root .carmar-colstats-median{fill:#3b82f6;opacity:.95;}
.cn-root .carmar-colstats-box-note{margin-top:3px;color:var(--cn-text-muted);font:500 9px var(--cn-mono);}
/* Level shares. The name column is fixed so the bars share a left edge and
   can actually be compared; long names ellipsis rather than shift the chart. */
.cn-root .carmar-colstats-levels{margin:12px 12px 0;display:flex;flex-direction:column;gap:3px;}
.cn-root .carmar-colstats-level{display:grid;grid-template-columns:82px minmax(0,1fr) 74px;align-items:center;gap:7px;}
.cn-root .carmar-colstats-level-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font:500 10px var(--cn-mono);color:var(--cn-text);}
.cn-root .carmar-colstats-level-track{height:9px;border-radius:2px;background:var(--cn-surface-2);overflow:hidden;}
.cn-root .carmar-colstats-level-fill{display:block;height:100%;background:#f59e0b;opacity:.72;}
.cn-root .carmar-colstats-level-n{text-align:right;color:var(--cn-text-muted);font:500 9px var(--cn-mono);}
/* What is NOT in the list above. A statement about the list, so it is set off
   from it rather than drawn as one more bar competing with the levels. */
.cn-root .carmar-colstats-levels-foot{
  display:flex;justify-content:space-between;gap:8px;margin-top:3px;padding-top:5px;
  border-top:1px solid var(--cn-border-soft);
  color:var(--cn-text-muted);font:500 9px var(--cn-mono);font-style:italic;
}
/* Label left, figure right, hairline between rows: a definition list that
   reads down the values, which is how anyone scans a summary. */
.cn-root .carmar-colstats-list{margin:12px 12px 0;display:grid;grid-template-columns:auto 1fr;gap:0;}
.cn-root .carmar-colstats-list dt{padding:4px 0;border-top:1px solid var(--cn-border-soft);
  font:500 10.5px var(--cn-font);color:var(--cn-text-muted);}
.cn-root .carmar-colstats-list dd{padding:4px 0;margin:0;border-top:1px solid var(--cn-border-soft);
  text-align:right;font:600 10.5px var(--cn-mono);color:var(--cn-text);}
.cn-root .carmar-colstats-actions{display:flex;gap:6px;margin:12px 12px 0;}
.cn-root .carmar-colstats-act{
  flex:1 1 auto;height:27px;border:1px solid var(--cn-border);border-radius:7px;background:var(--cn-surface);
  color:var(--cn-text);font:650 10px var(--cn-font);cursor:pointer;
}
.cn-root .carmar-colstats-act:hover{border-color:var(--cn-accent);color:var(--cn-accent-deep);background:var(--cn-accent-soft);}
.cn-root .carmar-colstats-act.is-quiet{flex:0 0 78px;color:var(--cn-text-muted);}
/* The filter row sits under the header, so its sticky offset IS the header's
   height \u2014 which just stopped being a constant. panel.js measures the header
   and publishes it; 29px is only the pre-measurement fallback. */
.cn-root .carmar-grid-filter-row th{position:sticky;top:var(--carmar-th-h,29px);z-index:2;background:var(--cn-surface-2);padding:3px 4px;border-bottom:1px solid var(--cn-border);}
.cn-root .carmar-grid-filter-row th.carmar-grid-idx{z-index:3;}
/* Filters recede until used. Five identical bordered slabs across the header
   read as the loudest thing in the table, above the data they filter. */
.cn-root .carmar-grid-filter-input{
  width:100%;min-width:84px;box-sizing:border-box;height:21px;padding:0 6px;
  border:1px solid transparent;border-radius:5px;background:transparent;
  color:var(--cn-text);font:500 9px var(--cn-mono);outline:0;
}
.cn-root .carmar-grid-filter-input:hover{border-color:var(--cn-border-soft);background:var(--cn-surface);}
.cn-root .carmar-grid-filter-input:focus,.cn-root .carmar-grid-filter-input:not(:placeholder-shown){
  border-color:var(--cn-border);background:var(--cn-surface);
}
.cn-root .carmar-grid-filter-input:focus{border-color:var(--cn-accent);}
.cn-root .carmar-grid-filter-input::placeholder{color:var(--cn-text-dim);font-family:var(--cn-font);opacity:.55;}
/* Narrow: the head row now carries the tools too, so IT is what wraps. The
   search shrinks rather than claiming a line of its own \u2014 a wrapped head row
   is the two-row layout again, which is the thing being removed. */
@media (max-width:760px){
  .cn-root .carmar-vw-head{flex-wrap:wrap;row-gap:5px;}
  .cn-root .carmar-vw-tools{flex-wrap:wrap;margin-left:0;}
  .cn-root .carmar-vw-search{width:min(150px,40vw);}
  .cn-root .carmar-vw-filter-status{margin-left:0;}
}
/* \u2500\u2500 main-column tabs \u2014 Notebook \xB7 df \xB7 \u2026 (RStudio's source pane). The strip
   only exists once a data frame or inspection is open; the cell stack is
   CSS-hidden while another tab shows, never unmounted, so cell state, fold
   state and autosave survive every switch. \u2500\u2500 */
.cn-root .carmar-mtabs{
  position:sticky;top:var(--carmar-hdr-h,0px);z-index:60;
  display:flex;align-items:flex-end;gap:3px;
  margin:0 0 12px;padding:6px 4px 0;border-bottom:1px solid var(--cn-border);
  background:var(--cn-canvas);overflow-x:auto;
}
/* Real editor tabs \u2014 boxed, the active one filled and carrying the accent on
   its top edge, exactly the shape RStudio's source tabs make. */
.cn-root .carmar-mtab{
  display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;max-width:220px;
  font-family:var(--cn-font);font-size:11px;font-weight:500;color:#5f6368;
  background:var(--cn-control-bg);border:1px solid var(--cn-border);
  border-bottom:0;border-radius:7px 7px 0 0;padding:6px 11px 6px 9px;
  cursor:pointer;white-space:nowrap;margin-bottom:-1px;
  box-shadow:inset 0 2px 0 transparent;transition:background var(--cn-dur-1),color var(--cn-dur-1);
}
.cn-root .carmar-mtab:hover{background:var(--cn-surface);color:#202124;}
.cn-root .carmar-mtab.active{
  background:var(--cn-surface);color:#202124;font-weight:600;
  border-color:var(--cn-border);box-shadow:inset 0 2px 0 var(--cn-accent);
  border-bottom:1px solid var(--cn-surface);
}
.cn-root .carmar-mtab-glyph{font-size:10px;line-height:1;color:#9aa0a6;flex:0 0 auto;}
.cn-root .carmar-mtab.active .carmar-mtab-glyph{color:var(--cn-accent);}
.cn-root .carmar-mtab-label{
  font-family:var(--cn-mono);font-size:11px;min-width:0;
  overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-mtab-x{color:#9aa0a6;font-size:12px;line-height:1;padding:0 1px;border-radius:3px;}
.cn-root .carmar-mtab-x:hover{color:#c5221f;background:#fce8e6;}
.cn-root .cell-stack.carmar-mtab-off{display:none;}
.cn-root .carmar-mtab-page{
  background:var(--cn-surface);border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-sm);
  overflow:hidden;margin:0 0 10px;
}
@media print{.cn-root .carmar-mtabs,.cn-root .carmar-mtab-page{display:none;}}

/* \u2500\u2500 cell output tabs \u2014 Console \xB7 Plots (n) \xB7 Tables (n) \xB7 Data (n).
   Only present when a result has MORE than one kind of output; a single-kind
   result keeps the quiet fold \xB7 summary \xB7 Clear strip. \u2500\u2500 */
.cn-root .carmar-out-tabs{display:inline-flex;align-items:center;gap:2px;}
.cn-root .carmar-out-tab{
  font:600 var(--cn-fs-xs) var(--cn-font);letter-spacing:.2px;cursor:pointer;
  padding:2px 9px;border:1px solid transparent;border-radius:999px;
  background:transparent;color:var(--cn-text-muted);white-space:nowrap;
}
.cn-root .carmar-out-tab:hover{border-color:var(--cn-border);background:var(--cn-control-bg);}
.cn-root .carmar-out-tab.active{
  background:var(--cn-accent-soft);border-color:var(--cn-accent);color:var(--cn-accent-deep);
}
.cn-root .carmar-output-sp{flex:1 1 auto;}
.cn-root .carmar-out-group{display:flex;flex-direction:column;gap:8px;}

/* \u2500\u2500 data viewer \u2500\u2500 */
.cn-root .carmar-view{
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-surface);overflow:hidden;
}
.cn-root .carmar-view-head{
  display:flex;align-items:baseline;gap:10px;padding:7px 11px;
  border-bottom:1px solid var(--cn-border);
}
.cn-root .carmar-view-name{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:600;
}
.cn-root .carmar-view-dims{font-size:var(--cn-fs-xs);opacity:.55;font-variant-numeric:tabular-nums;}
.cn-root .carmar-view-vars{padding:3px 0;}
/* Scoped under .carmar-view: this is the INLINE fallback renderer (a view
   frame landing in a cell when no panel is mounted). The session sidebar has
   its own .carmar-var rules above and must not inherit these. */
.cn-root .carmar-view .carmar-var{
  display:grid;grid-template-columns:20px minmax(90px,1.3fr) 62px minmax(90px,1fr) 60px;
  align-items:center;gap:10px;padding:3px 11px;font-size:var(--cn-fs-xs);
}
.cn-root .carmar-view .carmar-var:hover{background:var(--cn-control-bg);}
.cn-root .carmar-view .carmar-var-badge{
  width:16px;height:16px;border-radius:3px;display:inline-flex;align-items:center;
  justify-content:center;font-size:9px;font-weight:700;color:#fff;background:#94a3b8;
  flex:0 0 16px;line-height:16px;
}
.cn-root .carmar-view .carmar-var-badge[data-kind="numeric"]{background:#2563eb;}
.cn-root .carmar-view .carmar-var-badge[data-kind="categorical"]{background:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-view .carmar-var-badge[data-kind="logical"]{background:#0f766e;}
.cn-root .carmar-view .carmar-var-name{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}
.cn-root .carmar-view .carmar-spark{width:60px;height:16px;display:block;}
.cn-root .carmar-view .carmar-spark rect{fill:var(--cn-accent,#276DC3);opacity:.55;}
.cn-root .carmar-view .carmar-var:hover .carmar-spark rect{opacity:.85;}
.cn-root .carmar-view .carmar-var-stat{opacity:.6;font-variant-numeric:tabular-nums;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-view .carmar-var-missing{text-align:right;opacity:.5;font-variant-numeric:tabular-nums;}
.cn-root .carmar-view .carmar-var-missing.has-missing{color:#b45309;opacity:1;}
.cn-root .carmar-view-grid{border-top:1px solid var(--cn-border);padding:6px 8px;}
.cn-root .carmar-view-error{padding:8px 11px;color:#b91c1c;}

/* \u2500\u2500 kernel badge \u2014 lives ON the dark header row, so on-dark colors with a
   state dot; never a white slab. \u2500\u2500 */
.cn-root .carmar-kernel{
  display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;
  font-size:var(--cn-fs-xs);font-weight:600;padding:3px 10px;border-radius:999px;
  border:1px solid rgba(255,255,255,.16);background:transparent;
  color:var(--cn-on-dark-dim);white-space:nowrap;
}
.cn-root .carmar-kernel::before{
  content:"";width:6px;height:6px;border-radius:50%;flex:0 0 auto;
  background:var(--cn-on-dark-muted);
}
.cn-root .carmar-kernel[data-state="ready"]::before{background:#4ade80;}
.cn-root .carmar-kernel[data-state="connecting"]::before{background:#fbbf24;}
.cn-root .carmar-kernel[data-state="absent"]::before,
.cn-root .carmar-kernel[data-state="closed"]::before,
.cn-root .carmar-kernel[data-state="error"]::before{background:#f87171;}

/* \u2500\u2500 the agent chip \u2014 visible exactly while a Claude Code / Codex session is
   connected through the MCP server. Same on-dark pill family as the kernel
   badge; teal, because it is a THIRD party acting in the notebook and must
   never be mistaken for the kernel's own state. \u2500\u2500 */
.cn-root .carmar-agent-chip{
  display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;
  font-size:var(--cn-fs-xs);font-weight:600;padding:3px 10px;border-radius:999px;
  border:1px solid rgba(153,246,246,.45);background:rgba(8,143,143,.18);
  color:#99f6f6;white-space:nowrap;
}
/* The provenance stamp on a chunk an agent inserted \u2014 same teal family as
   the chip (light surface variant), persisted with the cell, so a reader
   always knows which code a CLI wrote. */
.cn-root .cell-header .carmar-agent-stamp{
  display:inline-flex;align-items:center;flex:0 0 auto;margin-left:6px;
  font-size:10px;font-weight:600;padding:1px 8px;border-radius:999px;
  border:1px solid rgba(8,143,143,.35);background:rgba(8,143,143,.10);
  color:#077575;white-space:nowrap;
}
/* The same teal on the pane's per-answer provenance line. */
.cn-root .carmar-aiw-turnmeta.is-claude{color:#088F8F;font-weight:600;}

/* R inside prose is still R: one click turns it into a chunk. Sits in the
   block's corner, revealed on hover/focus so reading prose stays quiet \u2014 the
   same no-layout-shift rule the figure and table tools follow. */
.cn-root .carmar-md-code.is-r{position:relative;}
.cn-root .carmar-md-tochunk{
  position:absolute;top:6px;right:6px;
  font:600 10px var(--cn-font);cursor:pointer;padding:3px 9px;border-radius:999px;
  border:1px solid rgba(8,143,143,.4);background:rgba(255,255,255,.94);color:#077575;
  /* Visible, not hover-only: the assistant TELLS the reader this button is on
     each block, and an affordance you have to discover by hovering makes that
     sentence read like a lie. Quiet at rest, solid on hover. */
  opacity:.75;transition:opacity .12s ease,background .12s ease,color .12s ease;
}
.cn-root .carmar-md-code.is-r:hover .carmar-md-tochunk,
.cn-root .carmar-md-tochunk:focus-visible{opacity:1;}
.cn-root .carmar-md-tochunk:hover{background:#077575;color:#fff;border-color:#077575;}
@media print{.cn-root .carmar-md-tochunk{display:none !important;}}

/* \u2500\u2500 provisional chunks: written by an AI, not yet accepted \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The bar sits directly under the cell header \u2014 never inside .cell-result,
   which core persists into the saved document. Its own class, not the change
   -set review's, so a review teardown cannot erase it. */
.cn-root .cell.carmar-ai-provisional{
  outline:2px solid rgba(8,143,143,.45);outline-offset:2px;border-radius:2px;
}
.cn-root .carmar-ai-review-bar{
  display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  padding:5px 10px;border-bottom:1px solid rgba(8,143,143,.25);
  background:rgba(8,143,143,.07);
}
.cn-root .carmar-ai-review-what{
  font-size:11px;font-weight:600;color:#077575;flex:1 1 auto;min-width:0;
}
.cn-root .carmar-ai-review-bar .carmar-aiw-review-actions{margin-left:auto;}
/* A provisional mark is working state, never part of the printed document. */
@media print{
  .cn-root .carmar-ai-review-bar{display:none !important;}
  .cn-root .cell.carmar-ai-provisional{outline:none !important;}
}

/* \u2500\u2500 the working directory, beside the R badge \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   RStudio keeps getwd() on screen at all times, above the console, and every
   file action starts there. The same fact, in the same pair as "which R" \u2014
   monospace, because it is a path, and truncated from the LEFT so the folder
   name survives while the parents give way. */
.cn-root .carmar-wd{
  display:inline-flex;align-items:center;gap:7px;flex:0 1 auto;min-width:0;max-width:300px;
  height:28px;font-family:var(--cn-font);font-size:var(--cn-fs-xs);padding:0 9px;border-radius:7px;
  border:1px solid rgba(255,255,255,.14);background:rgba(5,15,24,.18);
  color:var(--cn-on-dark-dim);white-space:nowrap;cursor:pointer;box-shadow:inset 0 1px rgba(255,255,255,.04);
}
.cn-root .carmar-wd:hover{border-color:rgba(117,183,255,.55);background:rgba(39,109,195,.16);color:#fff;}
.cn-root .carmar-wd-glyph{display:inline-flex;flex:0 0 auto;color:#82b9f5;}
.cn-root .carmar-wd-glyph svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
.cn-root .carmar-wd-path{display:flex;align-items:center;min-width:0;overflow:hidden;}
.cn-root .carmar-wd-crumb{display:block;min-width:0;max-width:105px;overflow:hidden;text-overflow:ellipsis;color:rgba(226,236,246,.62);}
.cn-root .carmar-wd-path strong{color:#f4f8fc;font-weight:650;}
.cn-root .carmar-wd-sep{padding:0 5px;color:rgba(226,236,246,.28);font-size:14px;line-height:1;}
@media (max-width:760px){
  .cn-root > header .carmar-wd{max-width:150px;}
}
@media (max-width:520px){
  .cn-root > header .carmar-wd{max-width:105px;}
  /* While disconnected the adjacent Install action already carries the
     state; repeating "connecting\u2026" crushes the title on a phone. Once R is
     ready the compact green dot remains as the session indicator. */
  .cn-root > header .carmar-kernel:not([data-state="ready"]){display:none;}
  .cn-root > header .carmar-kernel[data-state="ready"]{
    font-size:0;width:24px;height:24px;padding:0;justify-content:center;
  }
  .cn-root > header .carmar-kernel[data-state="ready"]::before{width:7px;height:7px;}
}

/* The working-directory marks in the Files pane: a tag on the folder R is in,
   and the offer to move there on every other folder. */
.cn-root .carmar-sb-wdtag{
  flex:0 0 auto;font-size:9px;font-weight:600;letter-spacing:.02em;
  padding:1px 6px;border-radius:999px;background:#e8f0fe;color:#1a73e8;white-space:nowrap;
}
.cn-root .carmar-sb-wdset{
  font:inherit;font-size:9.5px;line-height:1;cursor:pointer;flex:0 0 auto;white-space:nowrap;
  border:1px solid #dadce0;background:var(--cn-surface);color:#5f6368;
  padding:2px 6px;border-radius:3px;
}
.cn-root .carmar-sb-wdset:hover{background:#e8f0fe;border-color:#1a73e8;color:#1a73e8;}

/* \u2500\u2500 the toast: a save says where it went, then gets out of the way \u2500\u2500 */
.cn-root .carmar-toast{
  position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:960;
  display:flex;align-items:center;gap:12px;max-width:min(680px,92vw);
  padding:9px 10px 9px 14px;border-radius:8px;
  background:#202124;color:#f1f3f4;border:1px solid rgba(255,255,255,.12);
  box-shadow:0 8px 26px rgba(0,0,0,.28);
  font-size:12.5px;line-height:1.45;
}
.cn-root .carmar-toast.is-warn{background:#7a3c00;border-color:rgba(255,255,255,.18);}
.cn-root .carmar-toast-msg{flex:1 1 auto;word-break:break-word;}
.cn-root .carmar-toast-x{
  flex:0 0 auto;border:0;background:transparent;color:inherit;opacity:.6;
  font-size:12px;line-height:1;cursor:pointer;padding:3px 5px;border-radius:4px;
}
.cn-root .carmar-toast-x:hover{opacity:1;background:rgba(255,255,255,.12);}

/* \u2500\u2500 a labelled checkbox in a dialog (Knit's two choices) \u2500\u2500 */
.cn-root .carmar-check{
  display:flex;align-items:flex-start;gap:9px;padding:8px 2px;cursor:pointer;
}
.cn-root .carmar-check input{margin-top:2px;flex:0 0 auto;}
.cn-root .carmar-check-text{display:flex;flex-direction:column;gap:2px;min-width:0;}
.cn-root .carmar-check-label{font-size:13px;color:var(--cn-text);}
.cn-root .carmar-check-hint{font-size:11.5px;color:#5f6368;}
.cn-root .carmar-check input:disabled + .carmar-check-text{opacity:.55;}

/* \u2500\u2500 run-state cues \u2014 one colored edge on the CODE BOX: blue pulse =
   running, green = ran clean, red = error, amber = interrupted, faded grey =
   edited since it ran. Inset shadow, not border: no layout shift, ever.
   The edge marks the code, not the output. It used to sit on the whole
   .cell, so it ran the full height of the result too \u2014 restating "this ran"
   next to the thing that visibly ran, and stretching a status colour over
   plots and tables that have nothing to do with it. The state class stays on
   the cell (that is what the observer toggles); it only sets a variable, and
   the editor is what draws. \u2500\u2500 */
.cn-root .cell.carmar-code-cell{--carmar-state:transparent;}
.cn-root .cell.carmar-ok{--carmar-state:color-mix(in srgb,#34a853 55%,transparent);}
.cn-root .cell.carmar-err{--carmar-state:color-mix(in srgb,#ea4335 65%,transparent);}
.cn-root .cell.carmar-int{--carmar-state:color-mix(in srgb,#f59e0b 65%,transparent);}
.cn-root .cell.carmar-stale{--carmar-state:color-mix(in srgb,#9aa0a6 45%,transparent);}
.cn-root .cell.carmar-running{--carmar-state:var(--cn-accent);}
.cn-root .cell.carmar-running .carmar-editor{
  animation:carmar-runpulse 1.4s ease-in-out infinite;
}
@keyframes carmar-runpulse{
  0%,100%{box-shadow:inset 3px 0 0 color-mix(in srgb,var(--cn-accent) 100%,transparent);}
  50%{box-shadow:inset 3px 0 0 color-mix(in srgb,var(--cn-accent) 35%,transparent);}
}
/* The exec counter echoes the same state, so the cue survives printing. */
.cn-root .carmar-ok .carmar-exec{color:#137333;opacity:.8;}
.cn-root .carmar-err .carmar-exec{color:#c5221f;opacity:.9;}
.cn-root .carmar-int .carmar-exec{color:#b45309;opacity:.9;}
.cn-root .carmar-running .carmar-exec{color:var(--cn-accent);opacity:1;}
.cn-root .carmar-stale .carmar-exec::after{
  content:"\xB7edited";font-size:9px;opacity:.7;margin-left:3px;
  font-family:var(--cn-font);
}

/* \u2500\u2500 "this result is not from this code" \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The one banner in CarmaR that sits ON a result. It earns that: a stale
   output is the notebook mistake that actually costs people \u2014 you edit a
   line, glance at the table under it, and read a number the new code never
   produced. Amber, not red: nothing is broken, the result is simply older
   than the code, and the fix is one click away inside the banner. \u2500\u2500 */
/* A BADGE, not a band. In the flow at the top of the result, this pushed the
   result and every cell below it down ~35px the moment you typed one character
   after a run, and pulled them back up when you undid it. Floated over the
   result's top-right corner it says the same thing and costs no height. */
.cn-root .cell-result{position:relative;}
.cn-root .carmar-staleflag{
  position:absolute;top:6px;right:8px;z-index:2;max-width:calc(100% - 16px);
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  padding:4px 10px;
  border:1px solid #fcd34d;border-left-width:3px;
  border-radius:999px;
  background:#fffbeb;color:#92400e;font-size:var(--cn-fs-xs);
  box-shadow:var(--cn-shadow-sm);
}
.cn-root .carmar-staleflag-icon{font-size:13px;line-height:1;flex:0 0 auto;}
.cn-root .carmar-staleflag-text{flex:1 1 auto;min-width:0;}
.cn-root .carmar-staleflag-run{
  flex:0 0 auto;font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;
  padding:2px 10px;border-radius:999px;
  border:1px solid #b45309;background:transparent;color:#92400e;
}
.cn-root .carmar-staleflag-run:hover{background:#b45309;color:#fff;}
/* Printing a notebook must not print a warning about an editor state \u2014 but a
   stale result IS worth admitting on paper, so it prints as plain text, back
   in the flow where paper has no hover and no click. */
@media print{
  .cn-root .carmar-staleflag{
    position:static;background:none;border-color:#999;color:#333;box-shadow:none;
  }
  .cn-root .carmar-staleflag-run{display:none;}
}

/* \u2500\u2500 Stop \u2014 Run's place, Run's shape, the opposite meaning. \u2500\u2500 */
.cn-root .carmar-stop{
  display:inline-flex;align-items:center;gap:6px;
  font:inherit;font-size:var(--cn-fs-xs);font-weight:600;
  padding:4px 12px;border-radius:999px;border:1px solid transparent;
  background:#dc2626;color:#fff;cursor:pointer;
}
.cn-root .carmar-stop:hover{filter:brightness(1.08);}
.cn-root .carmar-stop-glyph{font-size:.7em;line-height:1;}

/* \u2500\u2500 figure-size chips \u2014 a size is a click. Active chip = current values. \u2500\u2500 */
.cn-root .carmar-dims{flex-wrap:wrap;row-gap:6px;}
.cn-root .carmar-dim-chips{
  flex:1 1 100%;display:flex;align-items:center;gap:4px;flex-wrap:wrap;
}
.cn-root .carmar-chip{
  font:600 10px var(--cn-font);letter-spacing:.2px;cursor:pointer;
  padding:2px 9px;border:1px solid var(--cn-border);border-radius:999px;
  background:var(--cn-control-bg);color:var(--cn-text-muted);white-space:nowrap;
}
.cn-root .carmar-chip:hover{border-color:var(--cn-accent);color:var(--cn-accent-deep);}
.cn-root .carmar-chip.active{
  background:var(--cn-accent-soft);border-color:var(--cn-accent);
  color:var(--cn-accent-deep);
}
.cn-root .carmar-chip-gap{width:10px;flex:0 0 auto;}
/* Vector output has no resolution, so the dpi chips and the dpi box stop
   meaning anything. Dimmed rather than hidden: removing controls the reader
   was just using is more disorienting than greying them. */
.cn-root .carmar-dim-chips.is-vector .carmar-chip:nth-last-child(n+2):nth-child(n+7){opacity:.4;}
.cn-root .carmar-dims input:disabled{opacity:.45;cursor:not-allowed;}

/* \u2500\u2500 plot pager \u2014 RStudio's Plots pane: one figure, \u25C0 2 / 5 \u25B6. \u2500\u2500 */
.cn-root .carmar-plotpager{display:flex;flex-direction:column;gap:6px;}
.cn-root .carmar-plotnav{display:flex;align-items:center;gap:8px;}
.cn-root .carmar-plotnav-btn{
  font:inherit;font-size:11px;line-height:1;cursor:pointer;padding:2px 9px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-plotnav-btn:hover:not(:disabled){border-color:var(--cn-accent);color:var(--cn-accent-deep);}
.cn-root .carmar-plotnav-btn:disabled{opacity:.3;cursor:default;}
.cn-root .carmar-plotnav-count{
  font-family:var(--cn-mono);font-size:10px;color:var(--cn-text-muted);
  font-variant-numeric:tabular-nums;
}
/* \u2500\u2500 table tabs \u2014 several tables from one run pick by number, never stack. \u2500\u2500 */
.cn-root .carmar-tabletabs{display:flex;flex-direction:column;gap:3px;}
.cn-root .carmar-tabletabs-nav{display:flex;align-items:center;gap:4px;}
.cn-root .carmar-tabletab{
  font:600 11px var(--cn-font);cursor:pointer;min-width:26px;
  padding:3px 8px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text-muted);
}
.cn-root .carmar-tabletab:hover{border-color:var(--cn-accent);color:var(--cn-accent-deep);}
.cn-root .carmar-tabletab.active{
  background:var(--cn-accent-soft);border-color:var(--cn-accent);color:var(--cn-accent-deep);
}
.cn-root .carmar-tabletabs-label{
  margin-left:6px;font-family:var(--cn-mono);font-size:10px;color:var(--cn-text-muted);
  font-variant-numeric:tabular-nums;
}
/* \u2500\u2500 table column pager \u2014 wide frames page, they never scroll forever. \u2500\u2500 */
.cn-root .carmar-colnav{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.cn-root .carmar-colnav-range{
  font-family:var(--cn-mono);font-size:10px;color:var(--cn-text-muted);
  font-variant-numeric:tabular-nums;
}

/* \u2500\u2500 folding: the whole summary strip is the target, not just the caret. \u2500\u2500 */
.cn-root .carmar-fold .carmar-caret{font-size:22px;line-height:1;}
.cn-root .carmar-fold{
  padding:3px 12px;display:inline-flex;align-items:center;
  border:1px solid var(--cn-border);background:var(--cn-control-bg);
  color:var(--cn-text-muted);
}
.cn-root .carmar-fold:hover{color:var(--cn-accent-deep);border-color:var(--cn-accent);}
.cn-root .carmar-output-bar{opacity:.85;}
.cn-root .carmar-output-summary{cursor:pointer;font-size:12px;}
.cn-root .carmar-output-summary:hover{color:var(--cn-accent-deep);}
.cn-root .carmar-output-sp{cursor:pointer;align-self:stretch;}
.cn-root .carmar-output-bar.is-folded{opacity:.8;}

/* \u2500\u2500 htmlwidgets \u2014 the Viewer: a sandboxed iframe per widget. \u2500\u2500 */
.cn-root .carmar-widget{
  display:block;width:100%;height:460px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:#fff;box-sizing:border-box;
}

/* \u2500\u2500 the console tab \u2014 scrollback + prompt, mono, quiet. \u2500\u2500 */
.cn-root .carmar-cons{display:flex;flex-direction:column;min-height:320px;max-height:calc(100vh - 190px);}
.cn-root .carmar-cons-scroll{
  flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px 14px;
  font-family:var(--cn-mono);font-size:12.5px;line-height:1.55;
}
.cn-root .carmar-cons-note{font-size:11px;color:#9aa0a6;font-style:italic;margin-bottom:8px;}
.cn-root .carmar-cons-in{display:flex;gap:8px;align-items:baseline;margin-top:6px;}
.cn-root .carmar-cons-chev{color:var(--cn-accent);font-weight:700;flex:0 0 auto;}
.cn-root .carmar-cons-code{font-family:var(--cn-mono);white-space:pre-wrap;word-break:break-word;}
.cn-root .carmar-cons-out{
  margin:2px 0 2px 20px;white-space:pre-wrap;word-break:break-word;
  font-family:var(--cn-mono);font-size:12.5px;line-height:1.55;color:var(--cn-text);
}
.cn-root .carmar-cons-out.is-err{color:#b91c1c;}
.cn-root .carmar-cons-out.is-warn{color:#b45309;}
.cn-root .carmar-cons-out.is-msg{color:#5f6368;}
.cn-root .carmar-cons-plot{display:block;max-width:100%;height:auto;margin:6px 0 6px 20px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);}
/* Inline with the scrollback \u2014 the prompt sits under the last output and
   rides down, exactly like R's own console. */
.cn-root .carmar-cons-prompt{
  display:flex;align-items:baseline;gap:8px;margin-top:6px;
}
.cn-root .carmar-cons-prompt .carmar-cons-chev{font-size:13px;}
.cn-root .carmar-cons-input{
  flex:1 1 auto;min-width:0;border:0;outline:none;background:transparent;
  font-family:var(--cn-mono);font-size:13px;color:var(--cn-text);
}
.cn-root .carmar-cons-input:disabled{opacity:.5;}

/* Contextual command menu: one surface, one recipe shared with the header
   dropdowns \u2014 13px labels on 30px rows, an aligned icon column, kbd hints
   in the dim mono voice. The tokens are the design; nothing ad-hoc. */
.cn-root .carmar-context-menu{
  position:fixed;z-index:1400;min-width:250px;max-width:min(340px,calc(100vw - 16px));
  max-height:calc(100vh - 16px);overflow-y:auto;
  padding:5px;border:1px solid var(--cn-border);border-radius:10px;background:var(--cn-surface);
  box-shadow:0 20px 48px -16px rgba(20,35,52,.34),0 4px 14px -8px rgba(20,35,52,.2);
  animation:carmar-context-in 120ms var(--cn-ease,ease-out) both;
}
.cn-root .carmar-context-menu[hidden]{display:none;}
@keyframes carmar-context-in{from{opacity:0;transform:translateY(-3px) scale(.985)}to{opacity:1;transform:none}}
.cn-root .carmar-context-item{
  width:100%;min-height:30px;display:grid;grid-template-columns:16px minmax(0,1fr) auto;align-items:center;gap:9px;
  padding:5px 10px;border:0;border-radius:var(--cn-radius-sm,6px);background:transparent;color:var(--cn-text);
  font:500 var(--cn-fs,13px)/1.35 var(--cn-font);
  text-align:left;cursor:pointer;
}
.cn-root .carmar-context-ico{display:inline-flex;align-items:center;justify-content:center;color:var(--cn-text-muted);}
.cn-root .carmar-context-ico svg{display:block;}
.cn-root .carmar-context-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-context-item:hover,.cn-root .carmar-context-item:focus{
  outline:0;background:color-mix(in srgb,var(--cn-accent) 10%,var(--cn-surface));color:var(--cn-accent-deep);
}
.cn-root .carmar-context-item:hover .carmar-context-ico,
.cn-root .carmar-context-item:focus .carmar-context-ico{color:var(--cn-accent-deep);}
.cn-root .carmar-context-item:disabled{opacity:.38;cursor:default;background:transparent;color:var(--cn-text-muted);}
.cn-root .carmar-context-item.is-danger{color:var(--cn-danger-text,#a7372e);}
.cn-root .carmar-context-item.is-danger .carmar-context-ico{color:var(--cn-danger-text,#a7372e);opacity:.75;}
.cn-root .carmar-context-item.is-danger:hover,.cn-root .carmar-context-item.is-danger:focus{
  background:var(--cn-danger-soft,#fce9e7);color:var(--cn-danger-text,#98251d);
}
.cn-root .carmar-context-item.is-danger:hover .carmar-context-ico,
.cn-root .carmar-context-item.is-danger:focus .carmar-context-ico{opacity:1;}
.cn-root .carmar-context-item kbd{
  color:var(--cn-text-dim);font:500 var(--cn-fs-sm,11px) var(--cn-mono);white-space:nowrap;background:transparent;border:0;box-shadow:none;padding:0;
}
.cn-root .carmar-context-separator{height:1px;margin:4px 8px;background:var(--cn-border-soft);}
/* A group row opens a fly-out beside the menu (CarmAI on the selection). The
   caret is the only sign; the row itself reads like every other item. */
.cn-root .carmar-context-item.is-submenu.is-open{
  background:color-mix(in srgb,var(--cn-accent) 10%,var(--cn-surface));color:var(--cn-accent-deep);
}
.cn-root .carmar-context-item.is-submenu.is-open .carmar-context-ico{color:var(--cn-accent-deep);}
.cn-root .carmar-context-caret{display:inline-flex;align-items:center;color:var(--cn-text-dim);}
.cn-root .carmar-context-caret svg{display:block;}
.cn-root .carmar-context-item.is-submenu:hover .carmar-context-caret,
.cn-root .carmar-context-item.is-submenu:focus .carmar-context-caret,
.cn-root .carmar-context-item.is-submenu.is-open .carmar-context-caret{color:var(--cn-accent-deep);}
.cn-root .carmar-context-menu.is-submenu{min-width:200px;z-index:1401;}
/* While CarmAI works on a selection the block wears a quiet accent bar \u2014 no
   layout shift, and the toast says what is happening. */
.cn-root .cell.is-ai-selection-busy{box-shadow:inset 3px 0 0 color-mix(in srgb,var(--cn-accent) 55%,transparent);}
@media (prefers-reduced-motion:reduce){.cn-root .carmar-context-menu{animation:none;}}

/* \u2500\u2500 Quick write \u2014 one chunk entrance, wearing the right-click menu itself \u2500\u2500
   Explain / Rewrite \u25BE / Debug folded into a single button (owner, 2026-08-20).
   The dropdown is built from .carmar-context-menu/-item/-ico/-label, so its
   dress IS the context menu's \u2014 these rules add only what that menu has no
   concept of: the section caption, and the entrance button's caret. */
.cn-root .carmar-quickwrite-sec{
  padding:4px 10px 2px;color:var(--cn-text-dim);
  font:600 10px/1.3 var(--cn-mono);letter-spacing:.06em;text-transform:uppercase;
}
.cn-root .carmar-ai-quickwrite-btn{display:inline-flex;align-items:center;gap:5px;}
.cn-root .carmar-ai-quickwrite-caret{opacity:.55;font-size:9px;line-height:1;}

/* \u2500\u2500 find in document \u2500\u2500 */
/* A fixed overlay below the header, top right: it floats over the page and
   never pushes it (zero layout shift), and the current hit wears a
   box-shadow ring for the same reason \u2014 an overlay, not a layout change. */
.cn-root .carmar-find{
  position:fixed;top:64px;right:22px;z-index:1500;min-width:340px;
  display:flex;flex-direction:column;gap:4px;padding:6px 7px;
  background:var(--cn-surface,#fff);border:1px solid var(--cn-border,#d8dee5);
  border-radius:10px;box-shadow:var(--cn-shadow-lg,0 10px 34px rgba(15,23,42,.16));
  animation:carmar-find-in 120ms var(--cn-ease,ease-out);
}
.cn-root .carmar-find[hidden]{display:none;}
@keyframes carmar-find-in{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion:reduce){.cn-root .carmar-find{animation:none;}}
.cn-root .carmar-find-row{display:flex;align-items:center;gap:5px;}
.cn-root .carmar-find-ico{display:inline-flex;color:var(--cn-text-muted);padding-left:2px;}
.cn-root .carmar-find-ico svg{display:block;}
/* The search glyph and the three flags ride INSIDE the field: a widget that
   modifies the query belongs in the box it modifies. Only the field is drawn
   \u2014 flags, steppers and dismiss carry no chrome of their own. */
.cn-root .carmar-find-field{
  position:relative;display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;
  height:26px;padding:0 4px 0 7px;border:1px solid var(--cn-border,#d8dee5);border-radius:7px;
  background:var(--cn-control-bg,#fff);
}
.cn-root .carmar-find-field:focus-within{
  border-color:var(--cn-accent,#4e79a7);box-shadow:var(--cn-focus-ring,0 0 0 3px rgba(78,121,167,.25));
}
.cn-root .carmar-find-field .carmar-find-input{
  flex:1 1 auto;min-width:0;height:100%;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;
}
.cn-root .carmar-find-field .carmar-find-input:focus{border:0;box-shadow:none;}
.cn-root .carmar-find-flags{display:inline-flex;align-items:center;gap:2px;flex:0 0 auto;}
.cn-root .carmar-find-flag{
  min-width:21px;height:20px;padding:0 4px;border:0;border-radius:4px;background:transparent;
  color:var(--cn-text-muted);font:600 10.5px var(--cn-mono,monospace);cursor:pointer;
}
.cn-root .carmar-find-flag:hover,.cn-root .carmar-find-flag:focus-visible{
  outline:0;background:color-mix(in srgb,var(--cn-accent) 12%,transparent);color:var(--cn-accent-deep);
}
.cn-root .carmar-find-flag.is-active{
  background:color-mix(in srgb,var(--cn-accent) 18%,var(--cn-surface));color:var(--cn-accent-deep);
}
/* Scope names the thing everyone assumed and nobody could see: WHERE this
   searches. The notebook is the document, so it is the default. */
.cn-root .carmar-find-scope{
  flex:0 0 auto;height:24px;max-width:110px;padding:0 4px;border:1px solid transparent;border-radius:6px;
  background:transparent;color:var(--cn-text-muted);cursor:pointer;
  font:600 var(--cn-fs-xs,10px) var(--cn-font,system-ui);
}
.cn-root .carmar-find-scope:hover{border-color:var(--cn-border,#d8dee5);color:var(--cn-text,#202124);}
.cn-root .carmar-find-scope:focus-visible{outline:0;border-color:var(--cn-accent,#4e79a7);}
.cn-root .carmar-find-input,.cn-root .carmar-find-replace{
  flex:1;min-width:0;height:26px;padding:0 8px;border:1px solid var(--cn-border,#d8dee5);
  border-radius:7px;background:var(--cn-control-bg,#fff);color:var(--cn-text,#202124);
  font:500 var(--cn-fs,13px)/1.2 var(--cn-font,system-ui);outline:none;
}
.cn-root .carmar-find-input:focus,.cn-root .carmar-find-replace:focus{
  border-color:var(--cn-accent,#4e79a7);box-shadow:var(--cn-focus-ring,0 0 0 3px rgba(78,121,167,.25));
}
.cn-root .carmar-find-count{
  flex:0 0 auto;min-width:56px;max-width:220px;text-align:right;color:var(--cn-text-muted);
  font:500 var(--cn-fs-sm,11px) var(--cn-mono,monospace);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  padding:0 2px;font-variant-numeric:tabular-nums;
}
.cn-root .carmar-find-count.is-error{color:#c5303e;font-style:italic;}
.cn-root .carmar-find-btn{
  display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;
  border:0;border-radius:6px;background:transparent;color:var(--cn-text-muted);cursor:pointer;padding:0;
}
.cn-root .carmar-find-btn svg{display:block;}
.cn-root .carmar-find-btn:hover{background:rgba(0,0,0,.06);color:var(--cn-text,#202124);}
.cn-root .carmar-find-btn:focus-visible{box-shadow:var(--cn-focus-ring,0 0 0 3px rgba(78,121,167,.25));outline:none;}
.cn-root .carmar-find-btn:disabled{opacity:.38;cursor:default;background:transparent;}
.cn-root .carmar-find-close{font:500 15px/1 var(--cn-font,system-ui);}
.cn-root .carmar-find-toggle.is-active{
  background:color-mix(in srgb,var(--cn-accent,#4e79a7) 16%,transparent);color:var(--cn-accent-deep,#31537a);
}
.cn-root .carmar-find-act{
  flex:0 0 auto;height:24px;padding:0 9px;border:1px solid var(--cn-border,#d8dee5);border-radius:7px;
  background:var(--cn-surface,#fff);color:var(--cn-text,#202124);
  font:600 var(--cn-fs-sm,11px) var(--cn-font,system-ui);cursor:pointer;
}
.cn-root .carmar-find-act:hover{border-color:var(--cn-accent,#4e79a7);color:var(--cn-accent-deep,#31537a);}
.cn-root .carmar-find-act:disabled{opacity:.38;cursor:default;}
.cn-root .carmar-block.is-find-hit,.cn-root .cell.is-find-hit{
  box-shadow:0 0 0 2px color-mix(in srgb,var(--cn-accent,#4e79a7) 55%,transparent);border-radius:6px;
}

/* Session-wide console transcript. */
.cn-root .carmar-cons-bar{
  min-height:32px;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:5px 9px;border-bottom:1px solid var(--cn-border);background:var(--cn-surface-2);
}
.cn-root .carmar-cons-summary{color:var(--cn-text-muted);font:600 10px var(--cn-font);}
.cn-root .carmar-cons-clear{
  border:1px solid var(--cn-border);border-radius:6px;background:var(--cn-surface);color:var(--cn-text-muted);
  font:650 9px var(--cn-font);padding:3px 7px;cursor:pointer;
}
.cn-root .carmar-cons-clear:hover{border-color:var(--cn-accent);color:var(--cn-accent-deep);}
.cn-root .carmar-cons-in{display:flex;align-items:baseline;gap:7px;}
.cn-root .carmar-cons-code{min-width:0;flex:1;white-space:pre-wrap;overflow-wrap:anywhere;}
.cn-root .carmar-cons-origin{
  flex:0 0 auto;color:var(--cn-text-muted);font:600 8px var(--cn-font);letter-spacing:.05em;text-transform:uppercase;
}
.cn-root .carmar-cons-result-meta{
  margin:1px 0 6px 19px;color:var(--cn-text-muted);font:500 8px var(--cn-mono);text-transform:lowercase;
}
.cn-root .carmar-cons-result-meta.is-error{color:#b42318;}
.cn-root .carmar-cons-out.is-session{color:var(--cn-text-muted);font-size:9px;font-style:italic;}

/* Searchable R execution history. */
.cn-root .carmar-rhist{min-height:360px;color:var(--cn-text);}
.cn-root .carmar-rhist-head{
  display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:14px 16px 10px;
  border-bottom:1px solid var(--cn-border);background:linear-gradient(135deg,var(--cn-surface),var(--cn-surface-2));
}
.cn-root .carmar-rhist-heading{display:flex;flex-direction:column;gap:2px;min-width:180px;}
.cn-root .carmar-rhist-heading strong{font:700 14px var(--cn-font);}
.cn-root .carmar-rhist-heading span{color:var(--cn-text-muted);font:500 9px var(--cn-font);}
.cn-root .carmar-rhist-controls{display:flex;align-items:center;gap:6px;min-width:0;}
.cn-root .carmar-rhist-search,
.cn-root .carmar-rhist-filter{
  height:28px;border:1px solid var(--cn-border);border-radius:7px;background:var(--cn-surface);color:var(--cn-text);
  font:500 10px var(--cn-font);outline:0;
}
.cn-root .carmar-rhist-search{width:min(250px,30vw);padding:0 9px;}
.cn-root .carmar-rhist-filter{padding:0 6px;}
.cn-root .carmar-rhist-search:focus,.cn-root .carmar-rhist-filter:focus{border-color:var(--cn-accent);}
.cn-root .carmar-rhist-clear{
  height:28px;border:1px solid var(--cn-border);border-radius:7px;background:transparent;color:var(--cn-text-muted);
  font:650 9px var(--cn-font);padding:0 8px;cursor:pointer;white-space:nowrap;
}
.cn-root .carmar-rhist-clear:hover{border-color:#b42318;color:#b42318;}
.cn-root .carmar-rhist-clear:disabled{opacity:.4;cursor:default;}
.cn-root .carmar-rhist-meta{
  padding:5px 16px;color:var(--cn-text-muted);background:var(--cn-surface-2);font:550 8px var(--cn-mono);
}
.cn-root .carmar-rhist-list{padding:5px 8px 24px;}
.cn-root .carmar-rhist-row{
  display:grid;grid-template-columns:132px minmax(0,1fr) auto;align-items:start;gap:10px;
  padding:6px 8px;border-radius:7px;transition:background 120ms ease;
}
.cn-root .carmar-rhist-row:hover{background:var(--cn-surface-2);}
.cn-root .carmar-rhist-stamp{display:flex;align-items:center;gap:6px;min-height:24px;color:var(--cn-text-muted);font:500 8px var(--cn-mono);}
.cn-root .carmar-rhist-status{width:6px;height:6px;border-radius:50%;background:#2f855a;box-shadow:0 0 0 2px color-mix(in srgb,#2f855a 14%,transparent);}
.cn-root .carmar-rhist-row.is-error .carmar-rhist-status{background:#c0392b;box-shadow:0 0 0 2px color-mix(in srgb,#c0392b 14%,transparent);}
.cn-root .carmar-rhist-row.is-interrupted .carmar-rhist-status{background:#b7791f;}
.cn-root .carmar-rhist-row.is-running .carmar-rhist-status{background:var(--cn-accent);animation:carmar-rhist-pulse 1s ease-in-out infinite;}
@keyframes carmar-rhist-pulse{50%{opacity:.35;transform:scale(.72)}}
.cn-root .carmar-rhist-origin{padding:1px 4px;border-radius:4px;background:var(--cn-surface);text-transform:uppercase;letter-spacing:.04em;}
.cn-root .carmar-rhist-duration{margin-left:auto;}
.cn-root .carmar-rhist-code{
  margin:0;max-height:84px;overflow:auto;padding:4px 0;color:var(--cn-text);background:transparent;
  font:500 10px/1.45 var(--cn-mono);white-space:pre-wrap;overflow-wrap:anywhere;
}
.cn-root .carmar-rhist-actions{display:flex;gap:4px;min-height:24px;align-items:center;}
.cn-root .carmar-rhist-actions button{
  border:1px solid var(--cn-border);border-radius:6px;background:var(--cn-surface);color:var(--cn-text-muted);
  font:650 8px var(--cn-font);padding:3px 7px;cursor:pointer;
}
.cn-root .carmar-rhist-actions button:hover{border-color:var(--cn-accent);color:var(--cn-accent-deep);}
.cn-root .carmar-rhist-actions button.is-primary{background:var(--cn-accent);border-color:var(--cn-accent);color:#fff;}
.cn-root .carmar-rhist-actions button:disabled{opacity:.4;cursor:default;}
.cn-root .carmar-rhist-empty{display:flex;min-height:240px;align-items:center;justify-content:center;flex-direction:column;gap:3px;color:var(--cn-text-muted);}
.cn-root .carmar-rhist-empty strong{color:var(--cn-text);font-size:11px;}
.cn-root .carmar-rhist-empty span{font-size:9px;}
@media (max-width:760px){
  .cn-root .carmar-rhist-head{align-items:stretch;flex-direction:column;gap:9px;padding:10px;}
  .cn-root .carmar-rhist-controls{display:grid;grid-template-columns:minmax(0,1fr) auto auto;}
  .cn-root .carmar-rhist-search{width:100%;}
  .cn-root .carmar-rhist-row{grid-template-columns:1fr auto;gap:3px 8px;}
  .cn-root .carmar-rhist-stamp{grid-column:1 / -1;}
  .cn-root .carmar-rhist-code{grid-column:1;}
  .cn-root .carmar-rhist-actions{grid-column:2;}
}
@media (prefers-reduced-motion:reduce){.cn-root .carmar-rhist-row.is-running .carmar-rhist-status{animation:none;}}

/* \u2500\u2500 header menus \u2014 Session \u25BE \xB7 Tools \u25BE \xB7 View \u25BE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   The dropdown chrome is core's (.hdr-export-wrap/.hdr-export-drop): position,
   shadow, hover, the ex-sep rule and the open animation all come from there,
   which is the point of reusing those class names. Only what core's own menus
   never needed is added here \u2014 wider items (these labels are sentences, not
   verbs) and a disabled state, since half of Session \u25BE is meaningless without
   a kernel and saying so is better than acting dead. */
.cn-root .carmar-menu-btn{white-space:nowrap;}
.cn-root .carmar-menu-drop{min-width:252px;}
.cn-root .carmar-menu-drop button:disabled{
  opacity:.38;cursor:default;background:none;
}
.cn-root .carmar-menu-drop button:disabled:hover{background:none;}

/* \u2500\u2500 modal dialogs \u2014 folder chooser, install packages, import dataset \u2500\u2500 */
/* Above EVERYTHING, the floating AI panel (820) and the hover-help popup (800)
   included. At 700 the AI Settings dialog opened BEHIND the very panel whose
   model it configures \u2014 you pressed the model chip and the answer to it was
   hidden underneath. A modal that is not on top is not a modal. */
.cn-root .carmar-modal{
  position:fixed;inset:0;z-index:900;background:rgba(15,23,42,.45);
  display:grid;place-items:center;padding:24px;
}
.cn-root .carmar-modal-panel{
  width:min(460px,94vw);max-height:86vh;display:flex;flex-direction:column;
  box-sizing:border-box;background:var(--cn-surface);
  border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-lg);
}
.cn-root .carmar-modal-panel.is-wide{width:min(620px,94vw);height:min(560px,86vh);}
.cn-root .carmar-modal-head{
  display:flex;align-items:center;gap:10px;padding:14px 16px 10px;
  border-bottom:1px solid var(--cn-border-soft);
}
.cn-root .carmar-modal-title{margin:0;font-size:var(--cn-fs-lg);font-weight:600;flex:1 1 auto;}
.cn-root .carmar-modal-x{
  border:0;background:none;cursor:pointer;font-size:20px;line-height:1;
  color:var(--cn-text-muted);padding:0 4px;
}
.cn-root .carmar-modal-x:hover{color:var(--cn-text);}
.cn-root .carmar-modal-body{
  padding:14px 16px;overflow:auto;flex:1 1 auto;min-height:0;
  display:flex;flex-direction:column;gap:10px;
}
.cn-root .carmar-modal-intro{
  margin:0;font-size:var(--cn-fs-sm);color:var(--cn-text-muted);
  word-break:break-all;
}
.cn-root .carmar-modal-foot{
  display:flex;align-items:center;gap:8px;padding:10px 16px 14px;
  border-top:1px solid var(--cn-border-soft);
}
.cn-root .carmar-modal-note{
  flex:1 1 auto;font-size:var(--cn-fs-xs);color:var(--cn-text-muted);min-width:0;
}
.cn-root .carmar-modal-note.is-err{color:#c5221f;}

/* \u2500\u2500 the agent setup card (Tools \u25B8 Connect Claude Code / Codex\u2026) \u2500\u2500 */
.cn-root .carmar-mcp-step{margin:0;font-size:var(--cn-fs-sm);font-weight:600;}
.cn-root .carmar-mcp-cmd{
  display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-items:center;
  padding:8px 10px;border:1px solid var(--cn-border-soft);border-radius:8px;
  background:var(--cn-control-bg);
}
.cn-root .carmar-mcp-cmd-label{
  grid-column:1 / -1;font-size:var(--cn-fs-xs);font-weight:600;color:var(--cn-text-muted);
}
.cn-root .carmar-mcp-cmd-line{
  font-family:var(--cn-mono, ui-monospace, monospace);font-size:var(--cn-fs-xs);
  overflow-x:auto;white-space:pre;min-width:0;padding:2px 0;user-select:all;
}
.cn-root .carmar-mcp-cmd-copy{
  font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;padding:4px 10px;
  border-radius:999px;border:1px solid var(--cn-border);
  background:var(--cn-surface, #fff);color:var(--cn-text);
}
.cn-root .carmar-mcp-cmd-copy:hover{border-color:var(--cn-accent);color:var(--cn-accent);}
.cn-root .carmar-mcp-status{margin:0;font-size:var(--cn-fs-sm);}
.cn-root .carmar-mcp-fine{margin:0;font-size:var(--cn-fs-xs);color:var(--cn-text-muted);}
.cn-root .carmar-modal-btn{
  font:600 var(--cn-fs-sm) var(--cn-font);cursor:pointer;padding:6px 14px;
  border-radius:999px;border:1px solid var(--cn-border);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-modal-btn.is-primary{
  background:var(--cn-accent,#4e79a7);border-color:transparent;color:#fff;
}
.cn-root .carmar-modal-btn:hover{filter:brightness(1.04);}

/* File readers offer an explicit insertion point at the moment it matters.
   The notebook header keeps the compact automatic convention. */
.cn-root .carmar-placement-control.is-reader{
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  flex:0 0 auto;padding:9px 10px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-canvas);
}
.cn-root .carmar-placement-label{
  color:var(--cn-text-muted);font:600 var(--cn-fs-xs) var(--cn-font);
}
.cn-root .carmar-placement-control.is-reader .carmar-placement-select{
  width:min(260px,65%);min-height:32px;padding:5px 30px 5px 9px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
  font:600 var(--cn-fs-sm) var(--cn-font);cursor:pointer;
}
.cn-root .carmar-placement-control.is-reader .carmar-placement-select:hover,
.cn-root .carmar-placement-control.is-reader .carmar-placement-select:focus{
  border-color:var(--cn-accent);outline:none;box-shadow:var(--cn-focus-ring);
}

/* fields shared by the dialogs */
.cn-root .carmar-fld{display:flex;flex-direction:column;gap:4px;font-size:var(--cn-fs-sm);}
.cn-root .carmar-fld > span{color:var(--cn-text-muted);font-size:var(--cn-fs-xs);}
/* Every input EXCEPT the checkbox. It used to say input[type=text], so the
   password field holding a 164-character OpenAI key \u2014 the longest string
   anyone pastes into this program \u2014 rendered as a raw browser box at whatever
   width Chrome felt like, beside fields that were styled. Same for the number
   fields and the provider select. */
.cn-root .carmar-fld input:not([type=checkbox]),
.cn-root .carmar-fld select{
  font:inherit;padding:6px 9px;border:1px solid var(--cn-border);width:100%;
  box-sizing:border-box;
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-fld input:focus,.cn-root .carmar-fld select:focus{
  outline:none;border-color:var(--cn-accent);box-shadow:var(--cn-focus-ring);
}
.cn-root .carmar-fld-hint{font-size:11px;color:var(--cn-text-muted);line-height:1.4;}
.cn-root .carmar-fld-check{flex-direction:row;align-items:center;gap:8px;}
.cn-root .carmar-fld-check > span{font-size:var(--cn-fs-sm);color:var(--cn-text);}

/* the file/folder browser */
.cn-root .carmar-br-bar{display:flex;align-items:center;gap:8px;}
.cn-root .carmar-br-up{
  flex:0 0 auto;font:inherit;cursor:pointer;padding:5px 10px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-br-path{
  flex:1 1 auto;min-width:0;font-family:var(--cn-mono);font-size:12px;
  padding:6px 9px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-br-list{
  flex:1 1 auto;min-height:120px;overflow:auto;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);
}
.cn-root .carmar-br-row{
  display:flex;align-items:center;gap:8px;padding:5px 10px;cursor:pointer;
  font-size:var(--cn-fs-sm);
}
.cn-root .carmar-br-row:hover{background:var(--cn-canvas);}
.cn-root .carmar-br-row.is-picked{background:color-mix(in srgb,var(--cn-accent) 14%,transparent);}
.cn-root .carmar-br-row.is-dim{opacity:.45;cursor:default;}
.cn-root .carmar-br-row.is-dim:hover{background:none;}
.cn-root .carmar-br-glyph{flex:0 0 auto;font-size:10px;color:var(--cn-text-muted);}
.cn-root .carmar-br-name-cell{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-br-size{flex:0 0 auto;font-size:var(--cn-fs-xs);color:var(--cn-text-muted);}
.cn-root .carmar-br-empty{padding:12px;font-size:var(--cn-fs-sm);color:var(--cn-text-muted);}
.cn-root .carmar-br-name{display:flex;align-items:center;gap:8px;font-size:var(--cn-fs-sm);}
.cn-root .carmar-br-name > span{color:var(--cn-text-muted);font-size:var(--cn-fs-xs);flex:0 0 auto;}
.cn-root .carmar-br-name input{
  flex:1 1 auto;min-width:0;font:inherit;padding:6px 9px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}

/* \u2500\u2500 the script editor tab \u2014 source over console, RStudio's layout \u2500\u2500 */
.cn-root .carmar-script{display:flex;flex-direction:column;gap:0;height:100%;}
.cn-root .carmar-script-bar{
  display:flex;align-items:center;gap:8px;padding:6px 10px;
  border:1px solid var(--cn-border);border-bottom:0;
  border-radius:var(--cn-radius-sm) var(--cn-radius-sm) 0 0;
  background:var(--cn-surface);flex-wrap:wrap;
}
.cn-root .carmar-script-name{
  font-family:var(--cn-mono);font-size:12.5px;font-weight:600;
  margin-right:4px;white-space:nowrap;
}
.cn-root .carmar-script-btn{
  font:inherit;font-size:var(--cn-fs-xs);cursor:pointer;padding:4px 10px;
  border:1px solid var(--cn-border);border-radius:999px;
  background:var(--cn-control-bg);color:var(--cn-text);white-space:nowrap;
}
.cn-root .carmar-script-btn:hover{border-color:var(--cn-accent);}
.cn-root .carmar-script-btn.is-run{
  background:var(--cn-accent);border-color:transparent;color:#fff;font-weight:600;
}
.cn-root .carmar-script-btn.is-source{font-weight:600;}
.cn-root .carmar-script-btn.is-ai{color:var(--cn-accent-deep,#3a6a9f);border-color:#b6c9dc;font-weight:700;}
.cn-root .carmar-script-gap{flex:1 1 auto;}
.cn-root .carmar-script-status{font-size:var(--cn-fs-xs);color:var(--cn-text-muted);}
.cn-root .carmar-script-status.is-err{color:#c5221f;}
/* The editor scrolls INSIDE its pane \u2014 a 900-line script must not push the
   console off the bottom of the page. */
.cn-root .carmar-script-edit{
  border:1px solid var(--cn-border);background:var(--cn-control-bg);
  overflow:hidden;
}
.cn-root .carmar-script-edit .carmar-editor-body{align-items:stretch;}
.cn-root .carmar-script-edit textarea.carmar-code{
  height:44vh;min-height:220px;overflow:auto;resize:vertical;
}
.cn-root .carmar-script-edit .carmar-highlight{overflow:hidden;}
.cn-root .carmar-script-edit:focus-within{border-color:var(--cn-accent);}
/* Inside a script tab the console shares the height with the editor above it,
   so its full-tab min/max (320px / 100vh-190px) would push the page. */
.cn-root .carmar-script-out{
  margin-top:10px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);
}
.cn-root .carmar-script-out .carmar-cons{min-height:180px;max-height:38vh;}

/* \u2500\u2500 the Install button + setup panel \u2500\u2500 */
.cn-root .carmar-install-btn{
  font:600 var(--cn-fs-xs) var(--cn-font);cursor:pointer;white-space:nowrap;
  padding:3px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.25);
  background:rgba(255,255,255,.12);color:#fff;
}
.cn-root .carmar-install-btn:hover{background:rgba(255,255,255,.22);}
.cn-root .carmar-setup-overlay{
  position:fixed;inset:0;z-index:600;background:rgba(15,23,42,.45);
  display:grid;place-items:center;padding:24px;
}
.cn-root .carmar-setup-card{
  width:min(620px,94vw);max-height:86vh;overflow-y:auto;box-sizing:border-box;
  background:var(--cn-surface);border-radius:var(--cn-radius-md);
  box-shadow:var(--cn-shadow-lg);padding:18px 22px 16px;
  font-size:12px;line-height:1.55;color:#202124;
}
.cn-root .carmar-setup-head{display:flex;align-items:center;gap:10px;}
.cn-root .carmar-setup-title{font-size:14px;font-weight:650;flex:1 1 auto;}
.cn-root .carmar-setup-x{
  font-size:18px;line-height:1;border:0;background:transparent;cursor:pointer;
  color:#9aa0a6;padding:2px 6px;border-radius:4px;
}
.cn-root .carmar-setup-x:hover{color:#202124;background:var(--cn-control-bg);}
.cn-root .carmar-setup-status{
  display:flex;align-items:center;gap:8px;margin:10px 0 4px;
  padding:8px 12px;border-radius:var(--cn-radius-sm);
  background:#fef7e0;border:1px solid #fde293;font-weight:500;
}
.cn-root .carmar-setup-status[data-state="ready"]{background:#e6f4ea;border-color:#a8dab5;}
.cn-root .carmar-setup-dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;flex:0 0 auto;}
.cn-root .carmar-setup-status[data-state="ready"] .carmar-setup-dot{background:#34a853;}
.cn-root .carmar-setup-path{margin-top:14px;}
.cn-root .carmar-setup-pathtitle{font-weight:650;margin-bottom:6px;}
.cn-root .carmar-setup-step{display:flex;gap:9px;margin:5px 0;align-items:baseline;}
.cn-root .carmar-setup-n{
  flex:0 0 16px;width:16px;height:16px;border-radius:50%;text-align:center;
  font:600 10px/16px var(--cn-font);background:var(--cn-accent-soft);
  color:var(--cn-accent-deep);
}
.cn-root .carmar-setup-steptext code{
  font-family:var(--cn-mono);font-size:11px;background:var(--cn-control-bg);
  padding:1px 4px;border-radius:3px;
}
.cn-root .carmar-setup-cmd{
  display:flex;align-items:center;gap:8px;margin:4px 0 6px 25px;
}
.cn-root .carmar-setup-code{
  flex:1 1 auto;font-family:var(--cn-mono);font-size:11.5px;
  padding:7px 10px;border-radius:var(--cn-radius-sm);
  background:#16202b;color:#e2e8f0;overflow-x:auto;white-space:nowrap;
}
.cn-root .carmar-setup-copy{
  font:600 10px var(--cn-font);cursor:pointer;padding:5px 11px;flex:0 0 auto;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-setup-copy:hover{border-color:var(--cn-accent);color:var(--cn-accent-deep);}
.cn-root .carmar-setup-probe{
  margin:7px 0 0 25px;font-size:11px;color:#5f6368;font-style:italic;
}
.cn-root .carmar-setup-probe[data-state="ok"]{color:#137333;font-style:normal;}
.cn-root .carmar-setup-probe[data-state="bad"]{color:#c5221f;font-style:normal;}
.cn-root .carmar-setup-note{
  margin:6px 0 0 25px;font-size:11px;color:#137333;
}
.cn-root .carmar-setup-foot{
  margin-top:16px;padding-top:10px;border-top:1px solid var(--cn-border-soft);
  font-size:11px;color:#9aa0a6;
}
.carmar-pkg-bar{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--carmar-line,#e4e7ec)}
.carmar-pkg-search{min-width:0;flex:1;height:28px;padding:0 8px;border:1px solid var(--carmar-line,#dfe3e8);border-radius:6px;background:var(--carmar-surface,#fff);color:inherit;font:inherit;outline:none}
.carmar-pkg-search:focus{border-color:#6b8fc9;box-shadow:0 0 0 2px rgba(63,111,181,.12)}
.carmar-pkg-view{width:82px;height:28px;padding:0 5px;border:1px solid var(--carmar-line,#dfe3e8);border-radius:6px;background:var(--carmar-surface,#fff);color:#4d5765;font:600 10px/1.2 inherit;outline:none}
.carmar-pkg-add{flex:none;width:28px;height:28px;padding:0;border:1px solid var(--carmar-line,#dfe3e8);border-radius:6px;background:var(--carmar-surface,#fff);color:#315f9f;font:700 18px/1 inherit;cursor:pointer}
.carmar-pkg-install{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f6f8fb;border-bottom:1px solid var(--carmar-line,#e4e7ec)}
.carmar-pkg-install[hidden]{display:none}
.carmar-pkg-install-input{min-width:0;flex:1;height:27px;padding:0 8px;border:1px solid #cfd6df;border-radius:5px;background:#fff;font:12px/1 inherit;outline:none}
.carmar-pkg-install-go,.carmar-pkg-install-close{height:27px;padding:0 8px;border:1px solid #cbd3dd;border-radius:5px;background:#fff;color:#354052;font:600 11px/1 inherit;cursor:pointer}
.carmar-pkg-install-go{border-color:#3f70b5;background:#3f70b5;color:#fff}
.carmar-pkg-install-close{width:27px;padding:0;color:#727b87}
.carmar-pkg-memory{flex:none;color:#66707d;font:600 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}
.carmar-pkg-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px 4px;color:#737b86;font-size:10px;font-weight:700;letter-spacing:.045em;text-transform:uppercase}
.carmar-pkg-notice{margin:4px 8px;padding:6px 8px;border-radius:5px;background:#eef6f0;color:#356847;font-size:11px;line-height:1.35}
.carmar-pkg-notice.is-error{background:#fff0ee;color:#9a3e35}
.carmar-pkg-row{display:grid;grid-template-columns:12px minmax(0,1fr) auto 24px;align-items:center;gap:6px;min-height:27px;padding:2px 6px 2px 10px;color:#606974;font-size:12px;outline:none}
.carmar-pkg-row:hover{background:rgba(48,93,156,.055)}
.carmar-pkg-state{color:#adb4bd;font-size:8px;text-align:center}
.carmar-pkg-row.is-loaded .carmar-pkg-state{color:#4778b6}
.carmar-pkg-row.is-attached .carmar-pkg-state{color:#3b7f59}
.carmar-pkg-name{overflow:hidden;color:#253044;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.carmar-pkg-version{color:#858c96;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}
.carmar-pkg-more{width:24px;height:22px;padding:0;border:0;border-radius:4px;background:transparent;color:#7c8490;font:700 11px/1 inherit;cursor:pointer;opacity:.35}
.carmar-pkg-row:hover .carmar-pkg-more,.carmar-pkg-row:focus-within .carmar-pkg-more{background:#e8edf4;opacity:1}
/* The package-row menu wears the same menu recipe as every other surface \u2014
   token colors, 13px rows, the shared radius and shadow. It mounts inside
   .cn-root (lib/sidebar.js) so the tokens actually reach it. */
.cn-root .carmar-pkg-menu{
  position:fixed;z-index:10020;width:224px;padding:5px;
  border:1px solid var(--cn-border);border-radius:10px;background:var(--cn-surface);
  box-shadow:0 20px 48px -16px rgba(20,35,52,.34),0 4px 14px -8px rgba(20,35,52,.2);
  color:var(--cn-text);font-size:var(--cn-fs);
}
.cn-root .carmar-pkg-menu[hidden]{display:none}
.cn-root .carmar-pkg-menu-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 10px 7px;color:var(--cn-text);font-weight:600}
.cn-root .carmar-pkg-menu-head span{color:var(--cn-text-dim);font:var(--cn-fs-xs)/1 var(--cn-mono)}
.cn-root .carmar-pkg-menu-managed{margin:1px 6px 5px;padding:6px 8px;border-radius:var(--cn-radius-sm);background:var(--cn-surface-soft);color:var(--cn-text-muted);font-size:var(--cn-fs-sm)}
.cn-root .carmar-pkg-menu-item{display:block;width:100%;min-height:30px;padding:6px 10px;border:0;border-radius:var(--cn-radius-sm);background:transparent;color:inherit;font:500 var(--cn-fs)/1.35 var(--cn-font);text-align:left;cursor:pointer}
.cn-root .carmar-pkg-menu-item:hover:not(:disabled){background:color-mix(in srgb,var(--cn-accent) 10%,var(--cn-surface));color:var(--cn-accent-deep)}
.cn-root .carmar-pkg-menu-item:disabled{color:var(--cn-text-dim);cursor:not-allowed}
.cn-root .carmar-pkg-menu-reason{margin:4px 8px 5px;color:var(--cn-text-muted);font-size:var(--cn-fs-sm);line-height:1.4}
.cn-root .carmar-pkg-menu-rule{height:1px;margin:4px 8px;background:var(--cn-border-soft)}
.carmar-package-help{padding:12px 12px 18px;color:#2b3443}
.carmar-package-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding-bottom:9px;border-bottom:1px solid #e3e7ec}
.carmar-package-help-head h2{margin:0;color:#20304a;font-size:18px;line-height:1.15}
.carmar-package-help-head p{margin:3px 0 0;color:#6e7681;font-size:11px;line-height:1.35}
.carmar-package-help-version{flex:none;padding:3px 6px;border-radius:4px;background:#edf2f8;color:#426696;font:10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}
.carmar-package-help-description{margin:10px 0 7px;color:#4f5865;font-size:11px;line-height:1.5}
.carmar-package-help-license{color:#858c95;font-size:10px}
.carmar-package-help-label{margin:14px 0 5px;color:#747c87;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.carmar-package-help-topics{border-top:1px solid #e8ebef}
.carmar-package-help-topic{display:block;width:100%;padding:7px 2px;border:0;border-bottom:1px solid #eceef1;background:transparent;text-align:left;cursor:pointer}
.carmar-package-help-topic:hover{background:#f3f7fc}
.carmar-package-help-topic-name{display:block;color:#2f5f9f;font:600 11px/1.25 ui-monospace,SFMono-Regular,Menlo,monospace}
.carmar-package-help-topic-title{display:block;margin-top:2px;color:#707985;font-size:10px;line-height:1.3}

/* \u2500\u2500 the import wizard \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
   Wider and taller than any other modal because it is the only one showing
   four things at once: what was detected, what each column will become, the
   file itself, and the code that comes out. Cutting any of them turns the
   dialog back into the black box it replaces. */
.cn-root .carmar-modal-panel.carmar-import{width:min(1100px,96vw);height:min(920px,94vh);}
/* The body is a column flex. The file preview owns the available height;
   source/options/code remain compact furniture around it. Column controls
   live in the preview headers, so there is no second table to squeeze it. */
.cn-root .carmar-import .carmar-modal-body{
  display:flex;flex-direction:column;gap:10px;overflow:hidden;min-height:0;
}
.cn-root .carmar-import .carmar-imp-head,
.cn-root .carmar-import .carmar-imp-settings,
.cn-root .carmar-import .carmar-imp-warn,
.cn-root .carmar-import .carmar-imp-codehead,
.cn-root .carmar-import .carmar-imp-name,
.cn-root .carmar-import .carmar-placement-control{flex:0 0 auto;}
.cn-root .carmar-imp-head{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;}
.cn-root .carmar-imp-file{
  flex:1 1 auto;min-width:0;font-family:var(--cn-mono);font-size:12px;
  color:var(--cn-text);padding:5px 9px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);
}
.cn-root .carmar-imp-reread{
  flex:0 0 auto;font:inherit;font-size:11px;padding:5px 11px;cursor:pointer;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-imp-reread:hover{background:var(--cn-canvas);}
.cn-root .carmar-imp-badge{
  font-size:11px;color:var(--cn-muted);border:1px solid var(--cn-border);
  border-radius:999px;padding:1px 9px;white-space:nowrap;
}
.cn-root .carmar-imp-settings{
  display:flex;flex-direction:column;overflow:hidden;
  padding:0;border:1px solid var(--cn-border-strong,var(--cn-border));
  border-radius:8px;background:var(--cn-control-bg);
  box-shadow:0 2px 8px color-mix(in srgb,var(--cn-text) 7%,transparent);
}
.cn-root .carmar-imp-settings.is-open{box-shadow:0 4px 14px color-mix(in srgb,var(--cn-text) 10%,transparent);}
.cn-root .carmar-imp-sumrow{
  min-height:42px;display:flex;align-items:center;gap:12px;padding:6px 9px;
  background:linear-gradient(180deg,var(--cn-control-bg),var(--cn-canvas));
}
.cn-root .carmar-imp-settings.is-open .carmar-imp-sumrow{border-bottom:1px solid var(--cn-border);}
.cn-root .carmar-imp-optbtn{
  flex:0 0 auto;font:700 11.5px/1 var(--cn-sans);padding:8px 12px;cursor:pointer;
  border:1px solid color-mix(in srgb,var(--cn-accent) 45%,var(--cn-border));border-radius:6px;
  background:var(--cn-accent-soft);color:var(--cn-accent-deep);
}
.cn-root .carmar-imp-optbtn:hover{background:color-mix(in srgb,var(--cn-accent) 15%,var(--cn-control-bg));}
.cn-root .carmar-imp-optbtn:focus-visible{outline:2px solid var(--cn-accent);outline-offset:2px;}
.cn-root .carmar-imp-sum{font-size:11.5px;color:var(--cn-muted);}
.cn-root .carmar-imp-options-grid{
  display:grid;grid-template-columns:repeat(6,minmax(112px,1fr));gap:9px;
  padding:10px;background:var(--cn-control-bg);
}
.cn-root .carmar-imp-fld{display:flex;flex-direction:column;gap:3px;font-size:10px;
  text-transform:uppercase;letter-spacing:.04em;color:var(--cn-muted);font-weight:700;}
.cn-root .carmar-imp-fld select,.cn-root .carmar-imp-fld input[type=number]{
  box-sizing:border-box;width:100%;min-height:30px;
  font:inherit;font-size:12px;font-weight:400;text-transform:none;letter-spacing:0;
  color:var(--cn-text);padding:4px 6px;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);
}
.cn-root .carmar-imp-fld input[type=checkbox]{align-self:flex-start;width:16px;height:16px;margin:6px 0 0;}
/* The rio suggestion: a sentence, not an interruption. Amber only when the
   file genuinely cannot be read without installing something. */
.cn-root .carmar-imp-advice{
  flex:1 1 260px;min-width:200px;font-size:11px;line-height:1.4;color:var(--cn-muted);
  align-self:center;
}
.cn-root .carmar-imp-advice.is-missing{
  color:var(--cn-text);
  border-left:3px solid color-mix(in srgb,#f59e0b 60%,transparent);padding-left:8px;
}
.cn-root .carmar-imp-install,
.cn-root .carmar-imp-cleanall{
  font:600 11px var(--cn-sans);padding:6px 10px;cursor:pointer;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
}
.cn-root .carmar-imp-cleanall:hover,
.cn-root .carmar-imp-install:hover{background:var(--cn-canvas);}
.cn-root .carmar-imp-options-actions{
  display:flex;justify-content:flex-end;gap:8px;padding:0 10px 10px;background:var(--cn-control-bg);
}
@media(max-width:900px){.cn-root .carmar-imp-options-grid{grid-template-columns:repeat(3,minmax(112px,1fr));}}

/* The ambiguity banner. Amber, not red: nothing is broken \u2014 the FILE is
   genuinely undecidable and a person has to say which reading is right. */
.cn-root .carmar-imp-warn{
  padding:8px 11px;border-radius:var(--cn-radius-sm);font-size:12px;line-height:1.45;
  background:color-mix(in srgb,#f59e0b 16%,transparent);
  border:1px solid color-mix(in srgb,#f59e0b 46%,transparent);color:var(--cn-text);
}
.cn-root .carmar-imp-empty{font-size:12px;color:var(--cn-muted);padding:14px;margin:0;}
.cn-root .carmar-imp-plabel{font:700 10px/1 var(--cn-sans);text-transform:uppercase;
  letter-spacing:.05em;color:var(--cn-muted);padding:9px 11px;
  border-bottom:1px solid var(--cn-border);background:var(--cn-canvas);}
.cn-root .carmar-imp-preview{
  flex:1 1 440px;min-height:220px;overflow:auto;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);
}
.cn-root .carmar-imp-ptable{
  border-collapse:separate;border-spacing:0;min-width:100%;width:max-content;
  font-size:11.5px;font-family:var(--cn-mono);
}
.cn-root .carmar-imp-ptable th,.cn-root .carmar-imp-ptable td{
  border-right:1px solid var(--cn-border);border-bottom:1px solid var(--cn-border);
  white-space:nowrap;text-align:left;
}
.cn-root .carmar-imp-ptable th:last-child,.cn-root .carmar-imp-ptable td:last-child{border-right:0;}
.cn-root .carmar-imp-ptable td{
  height:30px;padding:5px 10px;max-width:260px;overflow:hidden;text-overflow:ellipsis;
  color:var(--cn-text);background:var(--cn-control-bg);
}
.cn-root .carmar-imp-ptable tbody tr:nth-child(even) td{
  background:color-mix(in srgb,var(--cn-canvas) 48%,var(--cn-control-bg));
}
.cn-root .carmar-imp-ptable td.is-skipped{opacity:.38;text-decoration:line-through;}
.cn-root .carmar-imp-colhead{
  position:sticky;top:0;z-index:2;min-width:160px;max-width:260px;padding:0;
  background:var(--cn-canvas);color:var(--cn-text);font-family:var(--cn-sans);
}
.cn-root .carmar-imp-colhead.is-ambiguous{
  background:color-mix(in srgb,#f59e0b 18%,var(--cn-canvas));
  box-shadow:inset 0 3px 0 color-mix(in srgb,#f59e0b 72%,transparent);
}
.cn-root .carmar-imp-colhead.is-skipped{opacity:.48;}
.cn-root .carmar-imp-colhead.is-broken{padding:10px;color:#b45309;font-size:11px;}
.cn-root .carmar-imp-colbtn{
  display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;width:100%;
  padding:9px 10px 8px;text-align:left;cursor:pointer;border:0;background:transparent;
  color:inherit;font:inherit;
}
.cn-root .carmar-imp-colbtn:hover{background:color-mix(in srgb,var(--cn-accent) 8%,transparent);}
.cn-root .carmar-imp-colbtn:focus-visible{outline:2px solid var(--cn-accent);outline-offset:-2px;}
.cn-root .carmar-imp-hname{font-size:12px;font-weight:750;overflow:hidden;text-overflow:ellipsis;}
.cn-root .carmar-imp-caret{align-self:center;color:var(--cn-muted);font-size:10px;}
.cn-root .carmar-imp-hreading{
  grid-column:1 / -1;font-size:10.5px;font-weight:500;color:var(--cn-muted);
  overflow:hidden;text-overflow:ellipsis;
}
.cn-root .carmar-imp-norows{padding:18px!important;color:var(--cn-muted)!important;text-align:center!important;}

/* Column settings are root-level fixed popups created by menu-pop.js. They
   contain a compact form, not another grid or a permanent row of controls. */
.cn-root .carmar-imp-colmenu{
  width:min(310px,calc(100vw - 16px));max-height:min(620px,calc(100vh - 16px));
  overflow:auto;padding:10px;gap:8px;
}
.cn-root .carmar-imp-menutitle{
  padding:1px 2px 7px;border-bottom:1px solid var(--cn-border);
  font:700 12px/1.2 var(--cn-sans);color:var(--cn-text);
}
.cn-root .carmar-imp-menufield{
  display:flex;flex-direction:column;gap:4px;font:700 10px/1.2 var(--cn-sans);
  text-transform:uppercase;letter-spacing:.045em;color:var(--cn-muted);
}
.cn-root .carmar-imp-menufield input,.cn-root .carmar-imp-menufield select{
  box-sizing:border-box;width:100%;min-width:0;padding:6px 8px;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-control-bg);color:var(--cn-text);
  font:400 12px/1.25 var(--cn-sans);text-transform:none;letter-spacing:0;
}
.cn-root .carmar-imp-menufield input{font-family:var(--cn-mono);}
.cn-root .carmar-imp-was,.cn-root .carmar-imp-miss,.cn-root .carmar-imp-note,
.cn-root .carmar-imp-words{display:block;font-size:10.5px;color:var(--cn-muted);}
.cn-root .carmar-imp-words{margin-top:-4px;font-family:var(--cn-mono);letter-spacing:.02em;}
.cn-root .carmar-imp-note{
  padding:7px 8px;border-radius:var(--cn-radius-sm);line-height:1.35;color:#b45309;
  background:color-mix(in srgb,#f59e0b 10%,transparent);cursor:help;
}
.cn-root .carmar-imp-swap{
  align-self:flex-start;font:inherit;font-size:11px;padding:5px 8px;cursor:pointer;
  border:1px solid color-mix(in srgb,#f59e0b 50%,transparent);
  border-radius:var(--cn-radius-sm);background:transparent;color:var(--cn-text);
}
.cn-root .carmar-imp-swap:hover{background:color-mix(in srgb,#f59e0b 10%,transparent);}
.cn-root .carmar-imp-ex{
  display:flex;flex-direction:column;gap:3px;min-width:0;padding-top:2px;
  font:700 10px/1.2 var(--cn-sans);text-transform:uppercase;letter-spacing:.045em;color:var(--cn-muted);
}
.cn-root .carmar-imp-ex code{
  display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font:400 10.5px/1.35 var(--cn-mono);text-transform:none;letter-spacing:0;color:var(--cn-text);
}
.cn-root .carmar-imp-skipfield{
  display:flex;align-items:center;gap:8px;margin:2px -2px -2px;padding:8px 4px 2px;
  border-top:1px solid var(--cn-border);font-size:12px;color:var(--cn-text);cursor:pointer;
}
.cn-root .carmar-imp-skipfield input{margin:0;}
.cn-root .carmar-imp-codehead{display:flex;align-items:center;gap:10px;
  font:700 10px/1 var(--cn-sans);text-transform:uppercase;letter-spacing:.05em;color:var(--cn-muted);}
.cn-root .carmar-imp-plan{text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;}
.cn-root .carmar-imp-copy{margin-left:auto;font:inherit;font-size:10px;text-transform:uppercase;
  letter-spacing:.05em;padding:3px 9px;cursor:pointer;border:1px solid var(--cn-border);
  border-radius:var(--cn-radius-sm);background:var(--cn-control-bg);color:var(--cn-text);}
.cn-root .carmar-imp-code{
  margin:0;padding:9px 12px;flex:0 1 120px;min-height:82px;max-height:150px;overflow:auto;
  font-family:var(--cn-mono);font-size:11.5px;line-height:1.55;white-space:pre;
  border:1px solid var(--cn-border);border-radius:var(--cn-radius-sm);
  background:var(--cn-canvas);color:var(--cn-text);
}
.cn-root .carmar-imp-name{max-width:280px;}

/* \u2500\u2500 AI workspace \u2014 one timeline, cell-anchored review \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* padding for open panels is computed by ai-shell.js relayoutSides(); the
   workspace no longer reserves a fixed strip just for being open. */
.cn-root .carmar-aiw{
  position:fixed;z-index:825;inset:0 0 0 auto;width:var(--carmar-agent-w,480px);
  display:flex;flex-direction:column;min-width:360px;max-width:65vw;
  border-left:1px solid var(--cn-border);background:#fff;
  color:var(--cn-text);box-shadow:-8px 0 24px rgba(28,31,35,.12);
  font-family:var(--cn-font);
}
.cn-root .carmar-aiw[hidden],.cn-root .carmar-aiw.is-offscreen{display:none;}

/* head \u2014 a pale teal band, wrapping before it ellipsizes three things at once */
.cn-root .carmar-aiw-head{position:relative;display:flex;align-items:center;gap:7px;min-height:40px;
  padding:6px 41px 6px 10px;border-bottom:1px solid #dde7f1;background:var(--cn-accent-soft,#eef3f8);flex-wrap:wrap;}
.cn-root .carmar-aiw-close{flex:0 0 auto;width:24px;height:24px;border:1px solid #b6c9dc;
  border-radius:999px;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
  font:700 13px/1 var(--cn-font);cursor:pointer;position:absolute;right:10px;top:8px;z-index:1;}
.cn-root .carmar-aiw-close:hover{background:#e0f5f5;}
.cn-root .carmar-aiw-title{font-size:12px;font-weight:800;color:var(--cn-accent-deep,#3a6a9f);white-space:nowrap;}
.cn-root .carmar-aiw-target{border:0;background:transparent;padding:0;cursor:pointer;
  font-size:10.5px;color:var(--cn-accent-deep,#3a6a9f);max-width:150px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;}
.cn-root .carmar-aiw-target:hover{text-decoration:underline;}
.cn-root .carmar-aiw-spacer{flex:1 1 auto;}
.cn-root .carmar-aiw-r{flex:0 0 auto;font:700 9.5px var(--cn-font);padding:3px 8px;
  border-radius:999px;border:1px solid var(--cn-border);color:var(--cn-text-muted);
  background:#fff;white-space:nowrap;}
.cn-root .carmar-aiw-r[data-state="ready"]{color:#1d6f34;border-color:#bfe3c8;background:#effaf1;}
.cn-root .carmar-aiw-r[data-state="connecting"]{color:#8a6d1a;border-color:#ecdcae;background:#fdf7e4;}
.cn-root .carmar-aiw-history{flex:0 0 auto;height:24px;padding:0 9px;border:1px solid #cbd8e6;
  border-radius:999px;background:#fff;color:var(--cn-accent-deep,#3a6a9f);font:700 10px/1 var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-history:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-aiw-histmenu{min-width:250px;max-width:330px;padding:5px;display:flex;
  flex-direction:column;gap:2px;}
.cn-root .carmar-aiw-histempty{padding:7px 9px;font-size:10.5px;color:var(--cn-text-muted);}
.cn-root .carmar-aiw-histrow{display:flex;align-items:baseline;gap:7px;width:100%;
  border:0;background:transparent;padding:5px 7px;border-radius:6px;cursor:pointer;
  text-align:left;font:11px var(--cn-font);color:var(--cn-text);}
.cn-root .carmar-aiw-histrow:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-aiw-histverb{flex:0 0 auto;font-weight:750;font-size:9.5px;
  text-transform:uppercase;letter-spacing:.05em;color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-histverb.is-undone{color:#1d6f34;}
.cn-root .carmar-aiw-histtitle{min-width:0;flex:1 1 auto;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-aiw-histago{flex:0 0 auto;font-size:9.5px;color:var(--cn-text-muted);}
.cn-root .carmar-aiw-model,.cn-root .carmar-aiw-threads{font:600 10px var(--cn-font);
  padding:3px 8px;border:1px solid #cbd8e6;border-radius:999px;
  background:#fff;color:var(--cn-accent-deep,#3a6a9f);cursor:pointer;max-width:150px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-aiw-model:hover,.cn-root .carmar-aiw-threads:hover{background:var(--cn-accent-soft,#eef3f8);}

/* timeline \u2014 content hugs the composer; the void lives above, out of the way */
.cn-root .carmar-aiw-scroll{flex:1 1 auto;min-height:0;overflow:auto;
  overscroll-behavior:contain;scrollbar-gutter:stable;
  display:flex;flex-direction:column;gap:9px;padding:10px 12px;background:#fff;}
.cn-root .carmar-aiw-headroom{margin-top:auto;flex:0 0 0;}

/* the idle dossier */
.cn-root .carmar-aiw-empty{align-self:stretch;display:flex;flex-direction:column;gap:9px;
  color:var(--cn-text-muted);font-size:11.5px;line-height:1.45;align-items:flex-start;
  padding-bottom:4px;}
.cn-root .carmar-aiw-ctx{align-self:stretch;display:flex;flex-direction:column;gap:6px;
  border:1px solid #cbd8e6;border-left:3px solid var(--cn-accent,#4e79a7);border-radius:8px;
  background:#fff;box-shadow:0 1px 3px rgba(28,31,35,.07);padding:11px 13px;text-align:left;}
.cn-root .carmar-aiw-ctx[data-state="error"]{border-left-color:#c5221f;}
.cn-root .carmar-aiw-ctx[data-state="no-kernel"]{border-left-color:#b08a1c;}
.cn-root .carmar-aiw-ctx-eyebrow{font:700 9.5px var(--cn-font);letter-spacing:.08em;
  text-transform:uppercase;color:var(--cn-accent,#4e79a7);}
.cn-root .carmar-aiw-ctx-code{font:600 12px/1.4 var(--cn-mono);color:var(--cn-text);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-aiw-ctx-err{margin:2px 0;padding:6px 9px;border-radius:6px;
  background:#fff0ee;border:1px solid #f3d1ce;color:#8d211c;font:11px/1.5 var(--cn-mono);}
.cn-root .carmar-aiw-ctx-row{font-size:11px;color:var(--cn-text);display:flex;
  align-items:baseline;gap:6px;flex-wrap:wrap;}
.cn-root .carmar-aiw-ctx-row.is-ok{color:#1d6f34;font-weight:600;}
.cn-root .carmar-aiw-ctx-label{font:700 9.5px var(--cn-font);letter-spacing:.06em;
  text-transform:uppercase;color:var(--cn-text-muted);flex:0 0 auto;}
.cn-root .carmar-aiw-obj{font:11px var(--cn-mono);padding:1px 6px;border-radius:5px;
  background:#f6f8fa;border:1px solid var(--cn-border-soft);color:var(--cn-text);}
.cn-root .carmar-aiw-ctx-row.is-kernel{color:#7a6117;font-size:10.5px;}
.cn-root .carmar-aiw-starters{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-start;}
.cn-root .carmar-aiw-starter{border:1px solid #cbd8e6;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
  font:600 11px var(--cn-font);padding:5px 12px;border-radius:999px;cursor:pointer;}
.cn-root .carmar-aiw-starter:hover{background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;}
.cn-root .carmar-aiw-starter.is-primary{background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;font-weight:700;}

/* turns */
.cn-root .carmar-aiw-turn{font-size:12.5px;line-height:1.55;padding:8px 10px;border-radius:9px;}
.cn-root .carmar-aiw-turn.is-user{align-self:flex-end;max-width:88%;background:var(--cn-accent-soft,#eef3f8);color:#065c5c;}
.cn-root .carmar-aiw-turn.is-ai{align-self:stretch;border:1px solid #dde7f1;background:#fff;}
.cn-root .carmar-aiw-turn.is-ai::before{content:"CarmAI";display:block;
  font:700 9.5px var(--cn-font);letter-spacing:.06em;text-transform:uppercase;
  color:var(--cn-accent,#4e79a7);margin-bottom:3px;}
.cn-root .carmar-aiw-turn.is-ai.is-final{border-left:3px solid var(--cn-accent,#4e79a7);background:#f7fafd;
  border-color:#c6efef;}
.cn-root .carmar-aiw-turn p{margin:.35em 0;}
.cn-root .carmar-aiw-turn pre{overflow:auto;padding:8px;background:var(--cn-canvas);border-radius:5px;}
.cn-root .carmar-aiw-codebar{display:flex;gap:5px;margin:2px 0 4px;flex-wrap:wrap;}
.cn-root .carmar-aiw-codebtn{border:1px solid #cbd8e6;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
  font:600 10px var(--cn-font);padding:3px 9px;border-radius:999px;cursor:pointer;}
.cn-root .carmar-aiw-codebtn:hover{background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;}

/* narrated steps on a rail */
.cn-root .carmar-aiw-steps{display:flex;flex-direction:column;gap:7px;position:relative;
  padding:4px 2px 4px 22px;}
.cn-root .carmar-aiw-steps::before{content:"";position:absolute;left:8px;top:10px;bottom:10px;
  width:2px;border-radius:2px;background:#c6efef;}
.cn-root .carmar-aiw-step{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;
  font-size:11.5px;line-height:1.45;color:var(--cn-text);position:relative;}
.cn-root .carmar-aiw-steps .carmar-aiw-step-mark{position:absolute;left:-21px;top:0;
  width:15px;height:15px;border-radius:50%;background:#fff;border:1.5px solid #bfe3c8;
  color:#1d6f34;font:700 9px/13px var(--cn-font);text-align:center;flex:none;}
.cn-root .carmar-aiw-step.is-error{color:#8d211c;}
.cn-root .carmar-aiw-steps .carmar-aiw-step.is-error .carmar-aiw-step-mark{
  border-color:#efc0bc;color:#c5221f;}
.cn-root .carmar-aiw-step.is-warn{color:#7a6117;}
.cn-root .carmar-aiw-steps .carmar-aiw-step.is-warn .carmar-aiw-step-mark{
  border-color:#ecdcae;color:#b08a1c;}
.cn-root .carmar-aiw-step.is-skipped,.cn-root .carmar-aiw-step.is-pending{color:var(--cn-text-muted);}
.cn-root .carmar-aiw-steps .carmar-aiw-step.is-pending .carmar-aiw-step-mark,
.cn-root .carmar-aiw-steps .carmar-aiw-step.is-skipped .carmar-aiw-step-mark{
  border-color:#b6c9dc;color:var(--cn-accent,#4e79a7);}
.cn-root .carmar-aiw-steps .carmar-aiw-step.is-pending .carmar-aiw-step-mark{
  animation:carmar-aiw-pulse 1.2s ease infinite;}
@keyframes carmar-aiw-pulse{50%{box-shadow:0 0 0 4px rgba(78,121,167,.15);}}
.cn-root .carmar-aiw-step-text{min-width:0;flex:1 1 auto;}
.cn-root .carmar-aiw-step>.carmar-aiw-detail{flex-basis:100%;}
.cn-root .carmar-aiw-diag{flex:0 0 auto;}
.cn-root .carmar-aiw-detail>summary{cursor:pointer;font-size:9px;letter-spacing:.05em;
  text-transform:uppercase;color:#6f9d9d;list-style-position:inside;}
.cn-root .carmar-aiw-detail>summary:hover{color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-step-pre{max-height:180px;overflow:auto;margin:4px 0 2px;padding:7px;
  border:1px solid var(--cn-border-soft);border-radius:5px;background:var(--cn-canvas);
  font:10px/1.45 var(--cn-mono);white-space:pre-wrap;}

/* a run ENDS \u2014 it does not fade out */
.cn-root .carmar-aiw-done{display:flex;align-items:center;gap:8px;text-align:left;
  font:700 10.5px var(--cn-font);color:#1c6b32;padding:6px 0 2px;}
.cn-root .carmar-aiw-done::before{content:"\u2713";width:15px;height:15px;border-radius:50%;
  background:#e8f5eb;color:#1c6b32;font:700 9px/15px var(--cn-font);text-align:center;flex:none;}
.cn-root .carmar-aiw-done::after{content:"";flex:1;height:1px;background:#c6efef;}
.cn-root .carmar-aiw-restore{align-self:flex-start;padding:5px 12px;
  border:1px solid #cbd8e6;border-radius:999px;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
  font:700 10.5px var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-restore:hover{background:var(--cn-accent-soft,#eef3f8);border-color:#b6c9dc;}
.cn-root .carmar-aiw-restore::before{content:"\u21A9 ";}
.cn-root .carmar-aiw-limit{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:10px 11px;border:1px solid #e0c777;border-radius:9px;background:#fff9e8;color:#634f12;}
.cn-root .carmar-aiw-limit-copy{display:flex;min-width:0;flex-direction:column;gap:2px;
  font:500 10.5px/1.4 var(--cn-font);}
.cn-root .carmar-aiw-limit-copy strong{font-size:11.5px;}
.cn-root .carmar-aiw-limit-more{flex:none;padding:6px 11px;border:1px solid #c9a83e;border-radius:999px;
  background:#fff;color:#6b5310;font:750 10px var(--cn-font);cursor:pointer;white-space:nowrap;}
.cn-root .carmar-aiw-limit-more:hover{background:#fff2c7;}
.cn-root .carmar-aiw-limit-more:disabled{opacity:.55;cursor:wait;}
.cn-root .carmar-aiw-diag{margin-top:2px;}
.cn-root .carmar-aiw-diag>summary{font-size:9px;color:#6f9d9d;}

/* cards */
.cn-root .carmar-aiw-card{border:1px solid var(--cn-border);border-radius:9px;
  padding:9px 11px;background:var(--cn-surface);font-size:11.5px;line-height:1.5;}
.cn-root .carmar-aiw-card.is-note{border-color:#ecdcae;background:#fdf7e4;color:#6d5713;}
.cn-root .carmar-aiw-card.is-problem{border-color:#efc0bc;background:#fff0ee;color:#8d211c;}
.cn-root .carmar-aiw-card.is-approval,.cn-root .carmar-aiw-card.is-review{
  border-color:#b8ecec;border-left:3px solid var(--cn-accent,#4e79a7);background:#f0fdfd;}

/* approvals */
.cn-root .carmar-aiw-approval-title{font-size:12px;font-weight:800;color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-approval-sub{margin-top:4px;font-size:11.5px;color:var(--cn-text);}
.cn-root .carmar-aiw-approval-dest{margin-top:4px;font-size:10px;color:var(--cn-text-muted);}
.cn-root .carmar-aiw-approval-code{max-height:200px;overflow:auto;margin:7px 0 0;padding:8px;
  border:1px solid #b8ecec;border-radius:5px;background:#fff;
  font:11px/1.5 var(--cn-mono);white-space:pre-wrap;}
.cn-root .carmar-aiw-approval-always{display:flex;align-items:center;gap:5px;
  margin-right:auto;font-size:10.5px;color:var(--cn-text-muted);cursor:pointer;}
.cn-root .carmar-aiw-approval-always input{accent-color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-approval-actions,.cn-root .carmar-aiw-review-actions{
  display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-top:9px;flex-wrap:wrap;}
.cn-root .carmar-aiw-approval-actions button,.cn-root .carmar-aiw-review-actions button{
  padding:5px 11px;border:1px solid var(--cn-border);border-radius:999px;
  font:700 10.5px var(--cn-font);cursor:pointer;background:#fff;color:var(--cn-text);}
.cn-root .carmar-aiw-approval-actions .is-primary,.cn-root .carmar-aiw-review-actions .is-primary{
  background:var(--cn-accent-deep,#3a6a9f);border-color:var(--cn-accent-deep,#3a6a9f);color:#fff;}
.cn-root .carmar-aiw-review-actions .is-secondary{border-color:#14b8a6;color:var(--cn-accent-deep,#3a6a9f);}

/* review */
.cn-root .carmar-aiw-review-head{position:sticky;top:-10px;z-index:3;
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  margin:-9px -11px 0;padding:9px 11px 8px;background:#f0fdfd;
  border-bottom:1px solid #b8ecec;}
.cn-root .carmar-aiw-review-head .carmar-aiw-review-actions{margin:0 0 0 auto;}
.cn-root .carmar-aiw-review-title{font-size:12px;font-weight:800;color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-change{padding:7px 0;border-top:1px solid #c6efef;}
.cn-root .carmar-aiw-change-head{display:flex;align-items:center;gap:8px;}
.cn-root .carmar-aiw-change-label{border:0;background:transparent;padding:0;cursor:pointer;
  font:750 11.5px var(--cn-font);color:var(--cn-text);}
.cn-root .carmar-aiw-change-label:hover{color:var(--cn-accent-deep,#3a6a9f);text-decoration:underline;}
.cn-root .carmar-aiw-change-why{font-size:10.5px;color:var(--cn-text-muted);margin-top:2px;}
.cn-root .carmar-aiw-accept{display:inline-flex;margin-left:auto;border:1px solid var(--cn-border);
  border-radius:999px;overflow:hidden;}
.cn-root .carmar-aiw-accept button{border:0;background:#fff;color:var(--cn-text-muted);
  font:700 10.5px var(--cn-font);padding:4px 11px;cursor:pointer;}
.cn-root .carmar-aiw-accept-yes.is-on{background:#e8f5eb;color:#185c2a;}
.cn-root .carmar-aiw-accept-no.is-on{background:#fdeceb;color:#8d211c;}
.cn-root .carmar-aiw-diff{max-height:200px;overflow:auto;margin:6px 0 0;padding:7px;
  border:1px solid var(--cn-border);border-radius:5px;background:#fff;
  font:11px/1.45 var(--cn-mono);white-space:pre-wrap;}
.cn-root .carmar-aiw-diff span{display:block;min-height:1.45em;}
.cn-root .carmar-aiw-diff .is-add{background:#e8f5eb;color:#185c2a;}
.cn-root .carmar-aiw-diff .is-remove{background:#fdeceb;color:#8d211c;}

/* diff cards anchored in notebook chunks */
.cn-root .cell.carmar-aiw-pending{outline:2px solid #b6c9dc;outline-offset:2px;}
.cn-root .carmar-aiw-celldiff{margin:6px 10px;padding:8px 10px;border:1px solid #b8ecec;
  border-left:3px solid var(--cn-accent,#4e79a7);border-radius:8px;background:#f0fdfd;font-size:11px;}
.cn-root .carmar-aiw-celldiff-head{display:flex;align-items:center;gap:8px;color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-celldiff-why{margin-top:3px;font-size:10.5px;color:var(--cn-text-muted);}
.cn-root .carmar-aiw-review-actions.is-cell{padding-top:7px;border-top:1px solid #c6efef;}
.cn-root .carmar-aiw-review-actions.is-cell button{padding:4px 9px;font-size:10px;}

/* composer \u2014 the second pale teal band */
.cn-root .carmar-aiw-composer{display:flex;flex-direction:column;gap:6px;padding:8px 10px 10px;
  border-top:1px solid #dde7f1;background:#f7fafd;}
.cn-root .carmar-aiw-composer[hidden]{display:none!important;}
.cn-root .carmar-aiw-ctxrow{display:flex;align-items:flex-start;gap:5px;}
.cn-root .carmar-aiw-addchunk{flex:0 0 auto;border:1px dashed #b6c9dc;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
  font:600 10px var(--cn-font);padding:3px 9px;border-radius:999px;cursor:pointer;}
.cn-root .carmar-aiw-addchunk:hover{background:var(--cn-accent-soft,#eef3f8);border-style:solid;}
.cn-root.carmar-aiw-picking .cell-stack .cell{outline:2px dashed var(--cn-accent,#4e79a7);outline-offset:2px;cursor:copy;}
.cn-root .carmar-aiw-edge{position:absolute;left:0;top:0;bottom:0;width:5px;cursor:col-resize;z-index:1;}
.cn-root .carmar-aiw-edge:hover{background:rgba(78,121,167,.18);}
.cn-root .carmar-aiw-chips{display:flex;gap:5px;flex-wrap:wrap;max-height:58px;overflow:auto;flex:1 1 auto;}
.cn-root .carmar-aiw-chips:empty{display:none;}
.cn-root .carmar-aiw-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;
  border:1px solid #b8ecec;border-radius:999px;background:#fff;color:var(--cn-accent-deep,#3a6a9f);font-size:10px;}
.cn-root .carmar-aiw-chip.is-error{border-color:#efc0bc;background:#fff0ee;color:#9d201b;}
.cn-root .carmar-aiw-chip-size{color:var(--cn-text-muted);}
.cn-root .carmar-aiw-chip-label,.cn-root .carmar-aiw-chip-x{border:0;padding:0;background:transparent;
  color:inherit;font:inherit;cursor:pointer;}
.cn-root .carmar-aiw-chip-label{max-width:165px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-aiw-chip-x{font-size:12px;line-height:1;}
.cn-root .carmar-aiw-preview{border:1px solid var(--cn-border);border-radius:7px;
  background:#fff;max-height:200px;overflow:auto;}
.cn-root .carmar-aiw-preview[hidden]{display:none;}
.cn-root .carmar-aiw-preview-head{position:sticky;top:0;display:flex;align-items:center;gap:6px;
  padding:5px 7px;background:var(--cn-surface);border-bottom:1px solid var(--cn-border);
  font-size:10px;font-weight:700;}
.cn-root .carmar-aiw-preview-head button{margin-left:auto;border:0;background:transparent;
  color:var(--cn-accent-deep,#3a6a9f);font:600 10px var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-preview-head button+button{margin-left:0;}
.cn-root .carmar-aiw-preview pre{margin:0;padding:7px;white-space:pre-wrap;font:10px/1.4 var(--cn-mono);}
.cn-root .carmar-aiw-preview-image{display:block;max-width:calc(100% - 14px);max-height:150px;
  object-fit:contain;margin:0 7px 7px;border:1px solid var(--cn-border-soft);}
.cn-root .carmar-aiw-input{width:100%;min-height:60px;max-height:180px;resize:vertical;
  box-sizing:border-box;padding:8px 9px;border:1px solid #cbd8e6;border-radius:7px;
  background:#fff;color:var(--cn-text);font:12px/1.45 var(--cn-font);}
.cn-root .carmar-aiw-input:focus{outline:none;border-color:var(--cn-accent,#4e79a7);
  box-shadow:0 0 0 3px rgba(78,121,167,.14);}
.cn-root .carmar-aiw-foot{display:flex;align-items:center;gap:8px;}
.cn-root .carmar-aiw-modes{display:inline-flex;border:1px solid #cbd8e6;
  border-radius:999px;overflow:hidden;flex:0 0 auto;background:#fff;}
.cn-root .carmar-aiw-mode{border:0;background:transparent;color:var(--cn-accent-deep,#3a6a9f);
  font:700 10px var(--cn-font);padding:4px 10px;cursor:pointer;}
.cn-root .carmar-aiw-mode.active{background:var(--cn-accent,#4e79a7);color:#fff;}
.cn-root .carmar-aiw-mode:disabled:not(.active){opacity:.42;cursor:not-allowed;}
.cn-root .carmar-aiw-note{font-size:9.5px;color:var(--cn-text-muted);min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cn-root .carmar-aiw-send{padding:6px 14px;border:0;border-radius:999px;background:var(--cn-accent-deep,#3a6a9f);
  color:#fff;font:750 11px var(--cn-font);cursor:pointer;flex:0 0 auto;}
.cn-root .carmar-aiw-send:hover{background:#2f5782;}
.cn-root .carmar-aiw-send.is-stop{background:#c5221f;}
@media(max-width:760px){
  .cn-root .carmar-aiw{width:100vw;max-width:none;min-width:0;}
}
@media print{.cn-root .carmar-aiw,.cn-root .carmar-aiw-celldiff,
  .cn-root .carmar-ai-shell{display:none!important}}

/* \u2500\u2500 the shared dockable shell: one form, both AI surfaces \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* The shell reuses chunkAI's .carmar-ai-panel chrome; these rules only add
   the body slot and neutralise the workspace pane's old fixed positioning
   now that the shell owns placement. */
/* placement: three explicit buttons, current one filled */
.cn-root .carmar-aiw-places{display:inline-flex;border:1px solid #cbd8e6;
  border-radius:999px;overflow:hidden;flex:0 0 auto;background:#fff;}
.cn-root .carmar-aiw-place{border:0;background:transparent;
  color:var(--cn-accent-deep,#3a6a9f);font:700 10px var(--cn-font);
  padding:4px 9px;cursor:pointer;}
.cn-root .carmar-aiw-place:hover:not(.is-active){background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-aiw-place.is-active{background:var(--cn-accent,#4e79a7);color:#fff;}
.cn-root .carmar-aiw-flip{flex:0 0 auto;width:24px;height:24px;
  border:1px solid #cbd8e6;border-radius:999px;background:#fff;
  color:var(--cn-accent-deep,#3a6a9f);font:700 11px/1 var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-flip:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-aiw-expand{flex:0 0 auto;height:24px;padding:0 9px;
  border:1px solid #cbd8e6;border-radius:999px;background:#fff;
  color:var(--cn-accent-deep,#3a6a9f);font:700 10px/1 var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-expand:hover{background:var(--cn-accent-soft,#eef3f8);}

/* Docked in the chunk the panel is in FLOW, so it must hug its content: the
   headroom that pushes a conversation to the bottom of a tall floating window
   is just a void between the header and the composer here. */
.cn-root .carmar-ai-shell:not(.is-float):not(.is-side) .carmar-aiw-scroll{
  flex:0 1 auto;min-height:0;max-height:46vh;}
.cn-root .carmar-ai-shell:not(.is-float):not(.is-side) .carmar-aiw-headroom{display:none;}

/* the panel itself goes off-screen with the notebook tab */
.cn-root .carmar-ai-shell.is-offscreen{display:none!important;}

/* ONE panel (owner, 2026-08-12). chunkAI's window is sidelined, not deleted:
   lib/ai-cell.js still mounts and keeps all its state, and removing this one
   rule brings its window back exactly as it was. Its per-chunk buttons are
   re-routed to the shared panel by lib/ai-code-button.js. */
.cn-root .carmar-ai-panel:not(.carmar-ai-shell){display:none!important;}

.cn-root .carmar-ai-shell{min-width:0;}
/* the bar you can see is the bar you drag */
.cn-root .carmar-ai-shell.is-float .carmar-ai-draghandle{cursor:grab;}
.cn-root .carmar-ai-shell.is-float .carmar-ai-draghandle:active{cursor:grabbing;}
/* .carmar-ai-panel sets display:flex, which outranks the UA's [hidden] rule \u2014
   without this a closed panel stays laid out and silently eats clicks meant
   for what is underneath it. */
.cn-root .carmar-ai-shell[hidden]{display:none;}
.cn-root .carmar-ai-shell .carmar-ai-shell-body{display:flex;flex-direction:column;
  min-height:0;flex:1 1 auto;overflow:hidden;}
.cn-root .carmar-ai-shell .carmar-aiw{position:static;inset:auto;width:100%;
  max-width:none;min-width:0;min-height:0;height:100%;overflow:hidden;
  flex:1 1 auto;border-left:0;box-shadow:none;background:transparent;
  /* The standalone pane is a fixed z-index:825 surface. Inside the shell it is
     a FLEX ITEM, and z-index applies to flex items even unpositioned \u2014 so that
     825 painted the pane over the shell's own resize edges and swallowed every
     drag. The shell owns stacking here. */
  z-index:auto;}
.cn-root .carmar-ai-shell.is-side{top:0;bottom:0;height:auto;margin:0;
  border-radius:0;position:fixed;z-index:825;}
.cn-root .carmar-ai-shell.is-float{width:640px;max-width:92vw;height:auto;
  max-height:82vh;}
.cn-root .carmar-ai-shell:not(.is-float):not(.is-side){max-height:70vh;margin-top:10px;}
/* The document makes room for a side-docked panel; the total is computed in
   ai-shell.js. Printing and narrow windows reserve nothing \u2014 those resets are
   restated HERE because media queries add no specificity, so the earlier
   copies at the top of this sheet would lose to these rules. */
.cn-root.has-ai-left{padding-left:var(--carmar-ai-total-left,var(--carmar-ai-side-w,0));}
.cn-root.has-ai-right{padding-right:var(--carmar-ai-total-right,var(--carmar-ai-side-w,0));}
@media print{
  .cn-root.has-ai-left{padding-left:0;}
  .cn-root.has-ai-right{padding-right:0;}
}
@media(max-width:760px){
  .cn-root.has-ai-left{padding-left:0;}
  .cn-root.has-ai-right{padding-right:0;}
}

.cn-root .carmar-aiw-convbtn{flex:0 0 auto;width:24px;height:24px;
  border:1px solid #cbd8e6;border-radius:999px;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
  font:700 12px/1 var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-convbtn:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-aiw-convbtn.is-new{width:auto;padding:0 9px;font-size:10px;white-space:nowrap;}
.cn-root .carmar-aiw-convbtn.is-history{width:auto;padding:0 9px;font-size:10px;}
/* the idle card's code: one line, folded, expandable in place */
.cn-root .carmar-aiw-ctx-fold{display:flex;align-items:center;gap:6px;width:100%;
  border:0;background:transparent;padding:2px 0;cursor:pointer;text-align:left;
  min-width:0;color:var(--cn-text);}
.cn-root .carmar-aiw-ctx-fold:disabled{cursor:default;}
.cn-root .carmar-aiw-ctx-caret{flex:0 0 auto;color:#8a93a1;font-size:9px;}
.cn-root .carmar-aiw-ctx-fold:disabled .carmar-aiw-ctx-caret{visibility:hidden;}
.cn-root .carmar-aiw-ctx-fold .carmar-aiw-ctx-code{white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;min-width:0;flex:1 1 auto;}
.cn-root .carmar-aiw-ctx-more{flex:0 0 auto;font:600 9.5px var(--cn-font);
  color:#8a93a1;}
.cn-root .carmar-aiw-ctx-full{margin:4px 0 0;padding:6px 8px;border-radius:6px;
  background:#f2f6fa;font:11px/1.5 var(--cn-mono,ui-monospace,Menlo,monospace);
  white-space:pre;overflow:auto;max-height:190px;}

/* all-conversations menu: both systems in one list */
.cn-root .carmar-aiw-convmenu{min-width:300px;max-width:380px;max-height:340px;
  overflow-y:auto;}
.cn-root .carmar-aiw-convrow{display:flex;align-items:stretch;gap:2px;}
.cn-root .carmar-aiw-mitem.is-conv{flex:1 1 auto;min-width:0;}
.cn-root .carmar-aiw-mitem.is-conv .carmar-aiw-mitem-label{white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;max-width:100%;}
.cn-root .carmar-aiw-convline{display:flex;align-items:center;gap:6px;min-width:0;}
.cn-root .carmar-aiw-convkind{flex:0 0 auto;padding:0 6px;border-radius:999px;
  font:700 8.5px var(--cn-font);text-transform:uppercase;letter-spacing:.04em;}
.cn-root .carmar-aiw-convkind.is-chunk{background:#dcf2e3;color:#1a7f37;}
.cn-root .carmar-aiw-convkind.is-agent{background:#dfeaf4;color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-convdel{flex:0 0 auto;border:0;background:transparent;
  color:#9aa3b0;font:700 13px var(--cn-font);cursor:pointer;padding:0 6px;
  border-radius:6px;}
.cn-root .carmar-aiw-convdel:hover{background:#ffebe9;color:#c5221f;}
.cn-root .carmar-aiw-histempty{padding:10px 12px;font:11.5px/1.5 var(--cn-font);color:#7a8390;
  max-width:260px;min-width:200px;}
.cn-root .carmar-aiw-allhistory{flex:0 0 auto;margin-top:4px;padding:8px 10px;border:0;
  border-top:1px solid #dde7f1;background:transparent;color:var(--cn-accent-deep,#3a6a9f);
  font:750 10.5px var(--cn-font);text-align:left;cursor:pointer;}
.cn-root .carmar-aiw-allhistory:hover{background:var(--cn-accent-soft,#eef3f8);}

/* Full conversation library \u2014 additive to the compact History popup. */
.cn-root .carmar-modal-panel.carmar-aiw-history-page{
  width:min(1100px,96vw);height:min(900px,94vh);max-height:94vh;}
.cn-root .carmar-aiw-history-page .carmar-modal-body{padding:0;gap:0;background:#f7f9fc;}
.cn-root .carmar-aiw-library-tools{display:flex;align-items:center;gap:12px;padding:14px 18px;
  border-bottom:1px solid #dde7f1;background:#fff;}
.cn-root .carmar-aiw-library-search{flex:1 1 auto;min-width:0;height:36px;padding:0 12px;
  border:1px solid #cbd8e6;border-radius:8px;background:#fff;color:var(--cn-text);
  font:12px var(--cn-font);outline:none;}
.cn-root .carmar-aiw-library-search:focus{border-color:var(--cn-accent,#4e79a7);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--cn-accent,#4e79a7) 18%,transparent);}
.cn-root .carmar-aiw-library-count{flex:0 0 auto;color:var(--cn-text-muted);
  font:650 10.5px var(--cn-font);white-space:nowrap;}
.cn-root .carmar-aiw-library{display:flex;flex-direction:column;gap:8px;padding:14px 18px 22px;}
.cn-root .carmar-aiw-library-row{display:grid;grid-template-columns:minmax(0,1fr) auto;
  align-items:stretch;border:1px solid #dde7f1;border-radius:9px;background:#fff;
  box-shadow:0 1px 2px rgba(28,31,35,.04);overflow:hidden;}
.cn-root .carmar-aiw-library-row:hover{border-color:#b9cce0;}
.cn-root .carmar-aiw-library-open{display:flex;flex-direction:column;align-items:flex-start;
  gap:7px;min-width:0;padding:13px 15px;border:0;background:transparent;text-align:left;
  color:var(--cn-text);cursor:pointer;}
.cn-root .carmar-aiw-library-title{display:block;max-width:100%;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;font:750 12px var(--cn-font);}
.cn-root .carmar-aiw-library-meta{display:flex;align-items:center;gap:7px 12px;min-width:0;
  flex-wrap:wrap;color:var(--cn-text-muted);font:10px var(--cn-font);}
.cn-root .carmar-aiw-library-status{padding:1px 6px;border-radius:999px;background:#edf2f7;
  color:#52606d;font-weight:700;}
.cn-root .carmar-aiw-library-delete{align-self:stretch;padding:0 16px;border:0;
  border-left:1px solid #edf0f4;background:transparent;color:#9a3a37;
  font:700 10px var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-library-delete:hover{background:#fff0ee;color:#c5221f;}
.cn-root .carmar-aiw-library-empty{padding:56px 20px;text-align:center;color:var(--cn-text-muted);
  font:12px var(--cn-font);}
@media(max-width:620px){
  .cn-root .carmar-aiw-library-tools{align-items:stretch;flex-direction:column;}
  .cn-root .carmar-aiw-library-count{align-self:flex-end;}
  .cn-root .carmar-aiw-library-row{grid-template-columns:minmax(0,1fr);}
  .cn-root .carmar-aiw-library-delete{padding:9px 14px;border-left:0;border-top:1px solid #edf0f4;}
}

/* \u2500\u2500 chunkAI \u21C4 CursedAI coexistence geometry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* Both surfaces may be open at once (single-owner rule retired). When the
   agent pane holds the right edge, a side-docked chunk panel shifts left of
   it and the document pads for BOTH. Float-mode chunk panels are draggable
   and need nothing. */


/* an unnamed chunk invites a name instead of displaying an internal id */
.cn-root .carmar-chunk-name-button[data-auto-name]{opacity:.5;font-style:italic;}

/* \u2500\u2500 permanent chunk numbers (7, 7A) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root .carmar-chunk-num{display:inline-flex;align-items:center;flex:0 0 auto;
  margin-right:6px;padding:1px 6px;border-radius:5px;border:1px solid #e2e5ea;
  background:#f5f6f8;color:#57606a;font:650 10px/1.5 var(--cn-mono,ui-monospace,Menlo,monospace);
  letter-spacing:.02em;cursor:default;user-select:none;}
@media print{.cn-root .carmar-chunk-num{display:none!important}}

/* \u2500\u2500 the Send and Answer rows: chunkAI's explicit controls, in the pane \u2500\u2500\u2500\u2500 */
.cn-root .carmar-aiw-sendrow,.cn-root .carmar-aiw-stylerow{display:flex;
  align-items:center;flex-wrap:wrap;gap:4px 10px;padding:1px 2px;}
.cn-root .carmar-aiw-send-label{font:700 9.5px var(--cn-font);color:#8a93a1;
  text-transform:uppercase;letter-spacing:.05em;flex:0 0 auto;}
.cn-root .carmar-aiw-sendopt{display:inline-flex;align-items:center;gap:4px;
  font:600 10.5px var(--cn-font);color:#454c56;cursor:pointer;user-select:none;}
.cn-root .carmar-aiw-styleseg[hidden],
.cn-root .carmar-aiw-stylerow .carmar-aiw-sendopt[hidden]{display:none!important;}
.cn-root .carmar-aiw-sendopt input{margin:0;accent-color:var(--cn-accent,#4e79a7);}
.cn-root .carmar-aiw-sendopt.is-empty{opacity:.45;cursor:default;}
.cn-root .carmar-aiw-sendsize{color:#8a93a1;font-weight:500;font-size:9.5px;}
.cn-root .carmar-aiw-scope,.cn-root .carmar-aiw-styleseg{display:inline-flex;
  border:1px solid #cbd8e6;border-radius:999px;overflow:hidden;background:#fff;}
.cn-root .carmar-aiw-scopebtn,.cn-root .carmar-aiw-stylebtn{border:0;
  background:transparent;color:var(--cn-accent-deep,#3a6a9f);font:650 10px var(--cn-font);
  padding:2px 9px;cursor:pointer;}
.cn-root .carmar-aiw-scopebtn.is-active,.cn-root .carmar-aiw-stylebtn.is-active{
  background:var(--cn-accent,#4e79a7);color:#fff;}
.cn-root .carmar-aiw-scopebtn:disabled{opacity:.4;cursor:not-allowed;}
.cn-root .carmar-aiw-destination{margin-left:0;flex:0 0 auto;}

/* \u2500\u2500 Interpret menu + answer keep bar in the pane \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.cn-root .carmar-aiw-interpret{border:1px solid #cbd8e6;background:#fff;
  color:var(--cn-accent-deep,#3a6a9f);border-radius:999px;padding:4px 10px;font:700 10px var(--cn-font);
  cursor:pointer;flex:0 0 auto;}
.cn-root .carmar-aiw-interpret:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-aiw-intmenu{min-width:280px;max-width:340px;}
.cn-root .carmar-aiw-mitem{display:flex;flex-direction:column;align-items:flex-start;
  gap:1px;width:100%;border:0;background:transparent;border-radius:6px;
  padding:6px 8px;cursor:pointer;text-align:left;}
.cn-root .carmar-aiw-mitem:hover{background:var(--cn-accent-soft,#eef3f8);}
.cn-root .carmar-aiw-mitem.is-active{background:#dfeaf4;}
.cn-root .carmar-aiw-mitem-label{font:650 11px var(--cn-font);color:#24292f;}
.cn-root .carmar-aiw-mitem.is-active .carmar-aiw-mitem-label{color:var(--cn-accent-deep,#3a6a9f);}
.cn-root .carmar-aiw-mitem-hint{font:10px var(--cn-font);color:#7a8390;}
.cn-root .carmar-aiw-msep{font:700 9px var(--cn-font);color:#8a93a1;
  text-transform:uppercase;letter-spacing:.06em;padding:8px 8px 2px;
  border-top:1px solid #dde7f1;margin-top:4px;}
.cn-root .carmar-aiw-keepbar{display:flex;justify-content:flex-end;margin-top:4px;}
.cn-root .carmar-aiw-turnmeta{font:9.5px var(--cn-font);color:#9aa3b0;margin-top:3px;}
.cn-root .carmar-aiw-tdelete{border:0;background:transparent;font-size:12px;
  cursor:pointer;opacity:.55;flex:0 0 auto;padding:2px;}
.cn-root .carmar-aiw-tdelete:hover{opacity:1;}
.cn-root .carmar-aiw-keepbtn{border:1px solid #cbd8e6;background:#fff;color:var(--cn-accent-deep,#3a6a9f);
  border-radius:6px;padding:3px 9px;font:650 10px var(--cn-font);cursor:pointer;}
.cn-root .carmar-aiw-keepbtn:hover{background:var(--cn-accent-soft,#eef3f8);}

/* \u2500\u2500 the @ mention popup (fixed on body, above the composer) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.carmar-aiw-mention-pop{position:fixed;z-index:940;display:flex;flex-direction:column;
  padding:4px;border:1px solid #cbd8e6;border-radius:9px;background:#fff;
  box-shadow:0 10px 28px rgba(31,35,40,.16);max-height:280px;overflow-y:auto;}
.carmar-aiw-mrow{display:flex;align-items:center;gap:7px;width:100%;border:0;
  border-radius:6px;background:transparent;padding:5px 7px;cursor:pointer;
  text-align:left;font:12px var(--cn-font,system-ui);color:#24292f;min-width:0;}
.carmar-aiw-mrow.is-active{background:var(--cn-accent-soft,#eef3f8);}
.carmar-aiw-mkind{flex:0 0 auto;padding:1px 6px;border-radius:999px;
  font:700 9px/1.6 var(--cn-font,system-ui);letter-spacing:.03em;text-transform:uppercase;}
.carmar-aiw-mkind.is-chunk{background:#dfeaf4;color:var(--cn-accent-deep,#3a6a9f);}
.carmar-aiw-mkind.is-object{background:#dcf2e3;color:#1a7f37;}
.carmar-aiw-mkind.is-context{background:#e7ebf0;color:#57606a;}
.carmar-aiw-mlabel{font-weight:650;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;min-width:0;}
.carmar-aiw-mdetail{margin-left:auto;flex:0 1 auto;color:#7a8390;font-size:10.5px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:8px;}

/* No sparkle glyph on AI surfaces (owner, 2026-08-12). */
.cn-root .carmar-ai-spark{display:none;}
`;

  // publish/published-runtime.js
  var DEFAULT_PORT = 4747;
  var CONNECT_TIMEOUT_MS = 2e4;
  var RETRY_MS = 500;
  var PUBLISHED_CSS = `
.cn-root.carmar-published-root{min-height:0;background:transparent;color:inherit;font-size:inherit;margin:.65rem 0 1rem;display:block;}
.carmar-published-root .cell.carmar-code-cell{margin:0;width:100%;grid-column:auto;background:var(--cn-surface);border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);box-shadow:var(--cn-shadow-sm);overflow:hidden;}
.carmar-published-root .cell-form{padding:10px;}
.carmar-published-root .cell-result{padding:0 10px 10px;}
.carmar-published-root .carmar-original-source{display:none!important;}
.cn-root.carmar-published-session-root{min-height:0;background:transparent;margin:1rem 0;position:static;}
.carmar-published-session{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--cn-border);border-radius:var(--cn-radius-md);background:var(--cn-surface);box-shadow:var(--cn-shadow-sm);}
.carmar-published-session .carmar-runtime-state{margin:0;min-width:190px;}
.carmar-published-session-copy{flex:1 1 250px;color:var(--cn-text-muted);font-size:var(--cn-fs-sm);}
.carmar-published-session-actions{display:flex;align-items:center;gap:7px;}
.carmar-published-session .carmar-run.is-secondary{background:var(--cn-control-bg);border-color:var(--cn-border);color:var(--cn-text);}
.carmar-published-session .carmar-runtime-dot{background:#8994a6;box-shadow:0 0 0 3px rgba(137,148,166,.14);animation:none;}
.carmar-published-session[data-state="connecting"] .carmar-runtime-dot{background:var(--cn-accent);box-shadow:0 0 0 3px rgba(78,121,167,.14);animation:carmar-runtime-pulse 1.4s ease-in-out infinite;}
.carmar-published-session[data-state="ready"] .carmar-runtime-state{border-color:#b9dfc8;background:#f2fbf5;}
.carmar-published-session[data-state="ready"] .carmar-runtime-dot{background:#1a7f37;box-shadow:0 0 0 3px rgba(26,127,55,.13);animation:none;}
.carmar-published-session[data-state="error"] .carmar-runtime-state{border-color:var(--cn-danger-border);background:var(--cn-danger-bg);}
.carmar-published-session[data-state="error"] .carmar-runtime-dot{background:var(--cn-danger-text);box-shadow:0 0 0 3px rgba(197,34,31,.12);}
@media print{.carmar-published-session-root,.carmar-published-root .carmar-editor-foot{display:none!important}.carmar-published-root .carmar-original-source{display:block!important}}
`;
  function element(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  var sleep = (win, ms) => new Promise((resolve) => win.setTimeout(resolve, ms));
  function numberMeta(doc, name, fallback) {
    const value = Number(doc.querySelector(`meta[name="${name}"]`)?.content || "");
    return Number.isInteger(value) && value > 0 && value < 65536 ? value : fallback;
  }
  function publishedConfig(doc = document) {
    return {
      port: numberMeta(doc, "carmar-port", DEFAULT_PORT),
      label: doc.querySelector('meta[name="carmar-label"]')?.content || "Open CarmaR"
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
  function carmarLaunchUrl(win, config) {
    const origin = win.location.origin;
    if (!/^https?:\/\//.test(origin)) return "";
    return `carmar://connect?origin=${encodeURIComponent(origin)}&port=${config.port}`;
  }
  function launchCarmaR(win, config) {
    const url = carmarLaunchUrl(win, config);
    if (!url) throw new Error("This book must be opened from an http(s) address.");
    let frame = win.document.getElementById("carmar-published-launch");
    if (!frame) {
      frame = win.document.createElement("iframe");
      frame.id = "carmar-published-launch";
      frame.hidden = true;
      frame.setAttribute("aria-hidden", "true");
      win.document.body.appendChild(frame);
    }
    frame.src = url;
  }
  function createPublishedSession(win, config, onStatus = () => {
  }) {
    const socketUrl = `ws://127.0.0.1:${config.port}/ws`;
    let kernel = null;
    let connecting = null;
    const status = (state, text) => onStatus(state, text);
    async function attempt() {
      if (kernel?.status === "ready") return kernel;
      kernel?.close();
      kernel = createRKernel({
        url: socketUrl,
        onStatus: (state) => {
          if (state === "ready") status("ready", kernel?.info?.r || "R ready");
        }
      });
      await kernel.connect();
      return kernel;
    }
    async function ready({ launch = false } = {}) {
      if (kernel?.status === "ready") return kernel;
      if (connecting) return connecting;
      if (launch) {
        launchCarmaR(win, config);
        status("connecting", "Opening CarmaR and connecting to this book\u2026");
      } else {
        status("connecting", "Looking for CarmaR on this computer\u2026");
      }
      connecting = (async () => {
        const deadline = Date.now() + (launch ? CONNECT_TIMEOUT_MS : 1);
        let lastError = null;
        do {
          try {
            return await attempt();
          } catch (error) {
            lastError = error;
            if (Date.now() >= deadline) break;
            await sleep(win, RETRY_MS);
          }
        } while (Date.now() < deadline);
        status("error", launch ? "CarmaR did not connect. Install or update the CarmaR app, then try again." : "CarmaR is not connected.");
        throw lastError || new Error("Could not connect to CarmaR.");
      })().finally(() => {
        connecting = null;
      });
      return connecting;
    }
    return {
      ready,
      async run(source, dims) {
        const active = await ready({ launch: true });
        return active.exec(source, { dims: dims || null });
      },
      cancel() {
        kernel?.cancel();
      },
      get connected() {
        return kernel?.status === "ready";
      },
      get info() {
        return kernel?.info || null;
      }
    };
  }
  function installStyles(doc) {
    if (doc.getElementById("carmar-published-styles")) return;
    const style = doc.createElement("style");
    style.id = "carmar-published-styles";
    style.textContent = `${SHELL_CSS}
${CARMAR_CSS}
${PUBLISHED_CSS}`;
    doc.head.appendChild(style);
  }
  function wrapAsCarmaRCell(doc, cell) {
    const root = element(doc, "div", "cn-root carmar-published-root");
    cell.before(root);
    root.appendChild(cell);
    cell.classList.add("carmar-code-cell");
    cell.dataset.carmarPublished = "true";
    return root;
  }
  function resultContext(cell, editor) {
    return {
      cell,
      table: (data, mount, opts = {}) => renderTable(data, mount, opts),
      gotoLine: (line) => {
        editor.focus();
        const textarea = editor.el.querySelector("textarea");
        if (!textarea) return;
        const lines = textarea.value.split("\n");
        const at = Math.max(0, Number(line) - 1);
        const pos = lines.slice(0, at).reduce((n, value) => n + value.length + 1, 0);
        textarea.setSelectionRange(pos, pos + (lines[at] || "").length);
      }
    };
  }
  function mountCell(doc, code, session, execution) {
    const cell = code.closest(".cell");
    const source = code.closest("div.sourceCode") || code.closest("pre") || code.parentElement;
    if (!cell || !source) return null;
    wrapAsCarmaRCell(doc, cell);
    if (!cell.id) cell.id = `carmar-published-cell-${execution.cells + 1}`;
    execution.cells += 1;
    source.classList.add("carmar-original-source");
    cell.querySelectorAll(":scope > .cell-output").forEach((node) => {
      node.hidden = true;
    });
    const form = element(doc, "div", "cell-form");
    const editorMount = element(doc, "div", "carmar-published-editor-mount");
    const output = element(doc, "div", "cell-result");
    form.appendChild(editorMount);
    cell.append(form, output);
    let hasRun = false;
    let editor = null;
    const chip = () => chipFor(cell);
    const clearState = () => cell.classList.remove(
      "carmar-running",
      "carmar-ok",
      "carmar-err",
      "carmar-int",
      "carmar-warned"
    );
    const runCell = async () => {
      const selected = editor.takeRunSelection();
      const sourceText = (selected || editor.getValue()).trim();
      if (!sourceText) return null;
      clearState();
      cell.classList.add("carmar-running");
      editor.setBusy(true);
      editor.setStatus("Connecting\u2026");
      chip()?.running();
      try {
        const result = await session.run(sourceText, editor.getDims());
        const exec = ++execution.value;
        cell._carmarRanSource = sourceText;
        renderOutput(result, output, resultContext(cell, editor));
        hasRun = true;
        cell.classList.remove("carmar-running", "carmar-stale");
        const state = result.status === "ok" ? "carmar-ok" : result.status === "interrupted" ? "carmar-int" : "carmar-err";
        cell.classList.add(state);
        if ((result.messages || []).some((message) => message.kind === "warning")) {
          cell.classList.add("carmar-warned");
        }
        editor.setExec(exec);
        editor.setStatus("");
        chip()?.done(result.status, exec);
        return result;
      } catch (error) {
        cell.classList.remove("carmar-running");
        cell.classList.add("carmar-err");
        const result = { status: "error", stdout: "", stderr: "", messages: [], plots: [], tables: [], views: [], widgets: [], message: String(error?.message || error) };
        renderOutput(result, output, resultContext(cell, editor));
        editor.setStatus("CarmaR is not connected");
        chip()?.done("error");
        throw error;
      } finally {
        editor.setBusy(false);
      }
    };
    editor = mountCodeEditor(editorMount, {
      value: code.textContent || "",
      onRun: () => {
        runCell().catch(() => {
        });
      },
      onStop: () => session.cancel(),
      onChange: () => {
        if (hasRun) cell.classList.add("carmar-stale");
      }
    });
    return { run: runCell, cell, editor };
  }
  function mountSessionBar(doc, firstRoot, config, sessionRef) {
    const root = element(doc, "div", "cn-root carmar-published-session-root");
    const bar = element(doc, "aside", "carmar-published-session");
    bar.dataset.state = "disconnected";
    const state = element(doc, "div", "carmar-runtime-state");
    const dot = element(doc, "span", "carmar-runtime-dot");
    const stateCopy = element(doc, "div", "carmar-runtime-statecopy");
    const title = element(doc, "strong", "", "CarmaR not connected");
    const detail = element(doc, "span", "", "Runs use R and packages on this computer.");
    stateCopy.append(title, detail);
    state.append(dot, stateCopy);
    const copy = element(doc, "span", "carmar-published-session-copy", "Open CarmaR once; every chunk in this book shares the same R session.");
    const actions = element(doc, "span", "carmar-published-session-actions");
    const connect = element(doc, "button", "carmar-run", config.label);
    connect.type = "button";
    const runAll = element(doc, "button", "carmar-run is-secondary", "Run all");
    runAll.type = "button";
    runAll.hidden = true;
    actions.append(connect, runAll);
    bar.append(state, copy, actions);
    root.appendChild(bar);
    const titleBlock = doc.querySelector("#title-block-header");
    if (titleBlock?.parentElement) titleBlock.after(root);
    else firstRoot.before(root);
    const setStatus = (next, text) => {
      bar.dataset.state = next;
      title.textContent = next === "ready" ? "CarmaR connected" : next === "connecting" ? "Connecting to CarmaR" : "CarmaR not connected";
      detail.textContent = text;
      connect.hidden = next === "ready";
      runAll.hidden = next !== "ready";
    };
    sessionRef.setStatus = setStatus;
    return { root, bar, connect, runAll, setStatus };
  }
  async function probeIfAlreadyAllowed(win, session) {
    try {
      if (win.navigator.permissions?.query) {
        const permission = await win.navigator.permissions.query({ name: "local-network-access" });
        if (permission.state !== "granted") return;
      }
      await session.ready();
    } catch {
    }
  }
  function mountPublishedCarmaR(doc = document, win = window) {
    const blocks = rCodeBlocks(doc);
    if (!blocks.length) return null;
    installStyles(doc);
    const config = publishedConfig(doc);
    const execution = { value: 0, cells: 0 };
    const sessionRef = { setStatus: () => {
    } };
    const session = createPublishedSession(
      win,
      config,
      (state, text) => sessionRef.setStatus(state, text)
    );
    const cells = blocks.map((code) => mountCell(doc, code, session, execution)).filter(Boolean);
    const ui = mountSessionBar(doc, cells[0].cell.parentElement, config, sessionRef);
    ui.connect.addEventListener("click", () => {
      ui.connect.disabled = true;
      session.ready({ launch: true }).catch(() => {
      }).finally(() => {
        ui.connect.disabled = false;
      });
    });
    ui.runAll.addEventListener("click", async () => {
      ui.runAll.disabled = true;
      try {
        for (const cell of cells) await cell.run();
      } finally {
        ui.runAll.disabled = false;
      }
    });
    doc.addEventListener("carmar:run-above", async (event) => {
      const index = cells.findIndex((entry) => entry.cell.id === event.detail?.cellId);
      if (index < 0) return;
      const target = cells[index].cell.id;
      for (let i = 0; i < index; i += 1) {
        doc.dispatchEvent(new win.CustomEvent(
          "carmar:running-above",
          { detail: { cellId: target, done: i, total: index } }
        ));
        await cells[i].run();
      }
      doc.dispatchEvent(new win.CustomEvent(
        "carmar:ran-above",
        { detail: { cellId: target, count: index } }
      ));
    });
    probeIfAlreadyAllowed(win, session);
    return { session, cells, launcher: ui.bar };
  }

  // publish/published-entry.js
  var start = () => mountPublishedCarmaR(document, window);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
