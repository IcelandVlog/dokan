/* ============================================================
   DOKAN — login.js
   ============================================================ */

whenReady(() => {
  renderHeader({ showSearch: false });
  renderFooter();

  if (SessionDB.currentUser()) {
    window.location.href = "index.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("formError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const result = await login({ email, password });
    if (!result.ok) {
      errorBox.textContent = result.message;
      errorBox.style.display = "block";
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || "index.html";
    window.location.href = redirect;
  });

  document.getElementById("googleBtn").addEventListener("click", async () => {
    const params = new URLSearchParams(window.location.search);
    try {
      await signInWithGoogle(params.get("redirect") || "index.html");
    } catch (err) {
      errorBox.textContent = "Google sign-in isn't available right now: " + err.message;
      errorBox.style.display = "block";
    }
  });
});
