/* ============================================================
   DOKAN — auth.js
   ============================================================ */

function signup({ name, email, password }) {
  if (UsersDB.findByEmail(email)) {
    return { ok: false, message: "An account with this email already exists." };
  }
  const user = UsersDB.add({ name, email, password });
  SessionDB.set(user.email);
  return { ok: true, user };
}

function login({ email, password }) {
  const user = UsersDB.findByEmail(email);
  if (!user || user.password !== password) {
    return { ok: false, message: "Incorrect email or password." };
  }
  SessionDB.set(user.email);
  return { ok: true, user };
}

function logout() {
  SessionDB.clear();
  window.location.href = "index.html";
}

/* Call at the top of pages that require a signed-in visitor.
   Sends the visitor to login.html and remembers where to send
   them back to afterwards. */
function requireAuth(redirectTo) {
  const user = SessionDB.currentUser();
  if (!user) {
    const target = redirectTo || window.location.pathname.split("/").pop();
    window.location.href = "login.html?redirect=" + encodeURIComponent(target);
    return null;
  }
  return user;
}

/* Call at the top of admin.html */
function requireAdmin() {
  const user = SessionDB.currentUser();
  if (!user || user.role !== "admin") {
    window.location.href = "login.html?redirect=admin.html";
    return null;
  }
  return user;
}
