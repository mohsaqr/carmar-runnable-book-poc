# CarmaR runnable-book proof of concept

A static Quarto chapter whose visible R chunks run through the reader's local
CarmaR/R session and return output inline.

Live site: <https://mohsaqr.github.io/carmar-runnable-book-poc/>

Install the current CarmaR app once, then use **Run on my computer** on the
published page. The app starts/authorizes the local kernel through `carmar://`;
the page connects directly and renders CarmaR's own editors, outputs and
exports. There is no extension or helper window.

The reusable publishing implementation is maintained on the
[`feature/quarto-run-on-computer`](https://github.com/mohsaqr/CarmaR/tree/feature/quarto-run-on-computer)
branch of CarmaR.

## Build

```sh
quarto render
```

The generated `docs/` directory is deployed with GitHub Pages.
