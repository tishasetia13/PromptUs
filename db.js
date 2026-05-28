// db.js
// Talks to Supabase directly from the extension using the REST API.
// Exports: syncUser() and incrementUsage()
//
// ⚠️  Replace the two placeholder values below with your actual Supabase credentials
//     before loading the extension. The anon key is safe to commit — it's public.

const SUPABASE_URL      = "https://gfgbaogqvmxmkbrisryk.supabase.co";       // e.g. https://xyzxyz.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ2Jhb2dxdm14bWticmlzcnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTMxOTYsImV4cCI6MjA5NTUyOTE5Nn0.8nRimeONJqocAP20pBUPJGmRR4R5fnO_b2KNO4ZEp3Q";  // found in Project Settings → API

// Shared headers for every Supabase REST request
const BASE_HEADERS = {
  "Content-Type":  "application/json",
  "apikey":        SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * syncUser(googleId, email, name)
 *
 * Checks if a row for this Google ID already exists in the `users` table.
 *   - If YES  → returns the existing row (with usage_count, is_pro, etc.)
 *   - If NO   → inserts a new row and returns it
 *
 * Call this right after a successful Google Sign-In.
 */
export async function syncUser(googleId, email, name) {
  // 1. Look for an existing user with this google_id
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?google_id=eq.${encodeURIComponent(googleId)}&select=*`,
    { headers: BASE_HEADERS }
  );

  if (!checkRes.ok) throw new Error("Supabase lookup failed");

  const existing = await checkRes.json();

  // 2a. User already exists — return their data as-is
  if (existing.length > 0) {
    return existing[0];
  }

  // 2b. New user — insert a row and return the created record
  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method:  "POST",
    headers: { ...BASE_HEADERS, "Prefer": "return=representation" },
    body:    JSON.stringify({ google_id: googleId, email, name }),
  });

  if (!createRes.ok) throw new Error("Supabase user creation failed");

  const created = await createRes.json();
  return created[0];
}

/**
 * incrementUsage(googleId)
 *
 * Adds 1 to usage_count for this user in Supabase,
 * then returns the NEW usage_count value.
 *
 * Call this just before generating a prompt.
 */
export async function incrementUsage(googleId) {
  // 1. Fetch the current usage_count
  const getRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?google_id=eq.${encodeURIComponent(googleId)}&select=usage_count`,
    { headers: BASE_HEADERS }
  );

  if (!getRes.ok) throw new Error("Supabase fetch failed");

  const users = await getRes.json();
  if (!users.length) throw new Error("User not found in Supabase");

  const newCount = users[0].usage_count + 1;

  // 2. Write the incremented value back
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?google_id=eq.${encodeURIComponent(googleId)}`,
    {
      method:  "PATCH",
      headers: { ...BASE_HEADERS, "Prefer": "return=minimal" },
      body:    JSON.stringify({ usage_count: newCount }),
    }
  );

  if (!patchRes.ok) throw new Error("Supabase update failed");

  return newCount;
}
