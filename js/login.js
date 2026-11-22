/* ============================================================
   DOKAN — login.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  renderHeader({ showSearch: false });
  renderFooter();

  if (SessionDB.currentUser()) {
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("formError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const result = login({ email, password });
    if (!result.ok) {
      errorBox.textContent = result.message;
      errorBox.style.display = "block";
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || "index.html";
    window.location.href = redirect;
  });
});
