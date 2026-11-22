// ============================================================
// DOKAN — approve-seller (Supabase Edge Function)
//
// Called by the admin panel when an admin approves a seller
// application. It:
//   1. checks the caller is a signed-in admin,
//   2. creates a seller account with a login ID like
//      "rahim4821@dokan.com" and a random 6–10 digit password,
//   3. emails those login details to the applicant with Resend,
//   4. marks the application approved.
//
// Secrets needed (set with `supabase secrets set`):
//   RESEND_API_KEY  – from resend.com
//   FROM_EMAIL      – e.g. "Dokan <noreply@yourdomain.com>" (a domain verified in Resend)
//   SITE_URL        – optional, used for the login link in the email
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function randomDigits(n: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => String(b % 10)).join("");
}

// Random password of 6 to 10 digits.
function randomPassword(): string {
  const len = 6 + (crypto.getRandomValues(new Uint8Array(1))[0] % 5);
  return randomDigits(len);
}

// "Rahim Uddin" -> "rahimuddin"
function slugify(name: string): string {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "").slice(0, 12);
  return s || "seller";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in as an admin first." }, 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Only admins may approve.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "Your sign-in has expired. Sign in again." }, 401);
  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (me?.role !== "admin") return json({ error: "Only admins can approve sellers." }, 403);

  // 2. Load the application.
  const body = await req.json().catch(() => ({}));
  const { data: app, error: appErr } = await admin
    .from("seller_applications")
    .select("*")
    .eq("id", body.applicationId ?? "")
    .maybeSingle();
  if (appErr || !app) return json({ error: "Application not found." }, 404);
  if (app.status !== "pending") return json({ error: `This application is already ${app.status}.` }, 409);

  // 3. Create the seller account. Retry with a new number if the ID is taken.
  const password = randomPassword();
  let email = "";
  let created: { id: string } | null = null;
  let lastError = "";
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    email = `${slugify(app.full_name)}${randomDigits(4)}@dokan.com`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: app.full_name },
    });
    if (data?.user) {
      created = data.user;
    } else {
      lastError = error?.message ?? "unknown error";
      if (!/already|exists|registered/i.test(lastError)) break;
    }
  }
  if (!created) return json({ error: "Could not create the account: " + lastError }, 500);

  await admin.from("profiles").update({ role: "seller" }).eq("id", created.id);

  // 4. Email the login details to the applicant.
  const from = Deno.env.get("FROM_EMAIL") || "Dokan <onboarding@resend.dev>";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const siteUrl = Deno.env.get("SITE_URL") || "https://dokan-ruddy.vercel.app";
  let emailSent = false;
  let emailError = "";

  if (!resendKey) {
    emailError = "RESEND_API_KEY is not set on the Edge Function";
  } else {
    const text = [
      `Hi ${app.full_name},`,
      "",
      `Your seller account for ${app.shop_name} on Dokan is ready.`,
      "",
      `Username (login email): ${email}`,
      `Password: ${password}`,
      "",
      `Sign in at ${siteUrl}/login.html, then open "My shop" to add your products.`,
      "Please keep these details safe.",
    ].join("\n");
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [app.email],
          subject: "Your Dokan seller account",
          text,
        }),
      });
      if (res.ok) emailSent = true;
      else emailError = `Resend said ${res.status}: ${await res.text()}`;
    } catch (err) {
      emailError = String(err);
    }
  }

  // 5. Record the decision.
  await admin
    .from("seller_applications")
    .update({
      status: "approved",
      seller_id: created.id,
      login_email: email,
      decided_at: new Date().toISOString(),
    })
    .eq("id", app.id);

  // If the email didn't go out, the admin gets the password once so they can pass it on.
  return json({
    ok: true,
    email,
    emailSent,
    emailError: emailSent ? undefined : emailError,
    password: emailSent ? undefined : password,
  });
});
