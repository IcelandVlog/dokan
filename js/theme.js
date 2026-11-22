/* ============================================================
   DOKAN — theme.js
   Handles dark / light mode, persisted in localStorage.
   ============================================================ */

function applyTheme(theme, persist = true) {
  document.documentElement.setAttribute("data-theme", theme);
  if (persist) storageSet(DB_KEYS.THEME, theme);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  // Whatever the user last clicked wins. Only ever fall back to
  // "light" when nothing has been saved yet — no OS-preference
  // guessing, so a refresh can never silently flip the mode.
  const saved = storageGet(DB_KEYS.THEME);
  const theme = saved === "dark" || saved === "light" ? saved : "light";
  applyTheme(theme, /* persist */ !saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

initTheme();
