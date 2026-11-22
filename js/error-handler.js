/* ============================================================
   DOKAN — error-handler.js
   Load this FIRST on every page. If anything throws, show it
   on screen instead of leaving a blank page with no clue why.
   ============================================================ */
(function () {
  function showError(message) {
    var bar = document.getElementById("dokanFatalError");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "dokanFatalError";
      bar.style.cssText =
        "background:#3a1210;color:#ffd9d3;padding:14px 18px;font:600 13px/1.5 monospace;white-space:pre-wrap;border-bottom:3px solid #C0533E;";
      document.documentElement.insertBefore(bar, document.body || document.documentElement.firstChild);
    }
    bar.textContent = "Dokan hit an error: " + message + "\nOpen the browser DevTools console (F12) for details, and make sure you're loading this page through a local server rather than double-clicking the file.";
  }

  window.addEventListener("error", function (e) {
    showError(e.message);
  });
  window.addEventListener("unhandledrejection", function (e) {
    showError(e.reason && e.reason.message ? e.reason.message : String(e.reason));
  });
})();
