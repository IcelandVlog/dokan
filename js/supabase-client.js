/* ============================================================
   DOKAN — supabase-client.js
   The single Supabase client the whole site uses. Load it after
   the Supabase CDN script and before db.js.

   The publishable key is designed to live in the browser. What it
   can actually read or write is decided by the row-level security
   policies in supabase/schema.sql, not by keeping this key secret.
   ============================================================ */

const SUPABASE_URL = "https://tgbjbtiodsethxtlcysg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7C-oJvcXN5tgAwS3G4bTqw_jCnE2uXX";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
