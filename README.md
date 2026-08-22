# CarmaR runnable-book proof of concept

A static Quarto chapter whose visible R chunks run through the reader's local
CarmaR/R session and return output inline.

Live site: <https://mohsaqr.github.io/carmar-runnable-book-poc/>

In R, install and start the local published-book engine with one command:

```r
source("https://mohsaqr.github.io/carmar-runnable-book-poc/install.R")
```

The launcher detects and cleanly replaces a stale pre-pairing CarmaR process,
which prevents the local `/pair` page from returning `not found` after an
upgrade.

The reusable publishing implementation is maintained on the
[`feature/quarto-run-on-computer`](https://github.com/mohsaqr/CarmaR/tree/feature/quarto-run-on-computer)
branch of CarmaR.

## Build

```sh
quarto render
```

The generated `docs/` directory is deployed with GitHub Pages.
