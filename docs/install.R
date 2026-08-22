required <- c("httpuv", "jsonlite", "processx")
missing <- required[!vapply(required, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) install.packages(missing)

package_url <- paste0(
  "https://mohsaqr.github.io/carmar-runnable-book-poc/",
  "carmar_0.50.39.tar.gz"
)
install.packages(package_url, repos = NULL, type = "source")
carmar::run_published()
message("CarmaR is installed and ready for published R chunks.")
