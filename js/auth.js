/* ============================================================
   DOKAN — auth.js
   Customer sign-up / sign-in / sign-out via Supabase Auth, plus
   route guards for pages that need a signed-in visitor.
   ============================================================ */

async function signup({ name, email, password }) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  // If the project requires email confirmation there is no session yet.
  if (!data.session) {
    return {
      ok: true,
      needsConfirmation: true,
      message: "Check your email to confirm your account, then sign in.",
    };
  }
  await refreshCurrentUser();
  return { ok: true, user: SessionDB.currentUser() };
}

async function login({ email, password }) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    const unconfirmed = /not confirmed/i.test(error.message);
    return {
      ok: false,
      message: unconfirmed
        ? "Please confirm your email first — check your inbox."
        : "Incorrect email or password.",
    };
  }
  await refreshCurrentUser();
  return { ok: true, user: SessionDB.currentUser() };
}

/* Starts Google sign-in. The browser leaves the site, Google sends the
   visitor back to redirectPath, and Supabase restores the session there.
   The Google client ID and secret are set in the Supabase dashboard,
   not in this code. */
async function signInWithGoogle(redirectPath) {
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL(redirectPath || "index.html", window.location.href).href },
  });
  if (error) throw error;
}

async function logout() {
  await sb.auth.signOut();
  cache.currentUser = null;
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

/* Call at the top of seller.html */
function requireSeller() {
  const user = SessionDB.currentUser();
  if (!user || user.role !== "seller") {
    window.location.href = "login.html?redirect=seller.html";
    return null;
  }
  return user;
}
