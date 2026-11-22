/* ============================================================
   DOKAN — signup.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  renderHeader({ showSearch: false });
  renderFooter();

  if (SessionDB.currentUser()) {
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("signupForm");
  const errorBox = document.getElementById("formError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirm").value;

    if (password !== confirm) {
      errorBox.textContent = "Passwords don't match.";
      errorBox.style.display = "block";
      return;
    }
    if (password.length < 6) {
      errorBox.textContent = "Password should be at least 6 characters.";
      errorBox.style.display = "block";
      return;
    }

    const result = signup({ name, email, password });
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
