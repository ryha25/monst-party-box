import { supabaseConfig } from "./supabase-config.js";

const sessionKey = "monst-party-box-supabase-session";

function headers(token) {
  return { apikey: supabaseConfig.publishableKey, Authorization: `Bearer ${token || supabaseConfig.publishableKey}`, "Content-Type": "application/json" };
}

export function getStoredSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) || "null"); } catch { return null; }
}

function storeSession(session) { localStorage.setItem(sessionKey, JSON.stringify(session)); }

export function clearSession() { localStorage.removeItem(sessionKey); }

export async function signIn(email, password) {
  const response = await fetch(`${supabaseConfig.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(), body: JSON.stringify({ email, password }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error_description || body.msg || "ログインに失敗しました");
  storeSession(body);
  return body;
}

export async function signUp(email, password) {
  const response = await fetch(`${supabaseConfig.url}/auth/v1/signup`, { method: "POST", headers: headers(), body: JSON.stringify({ email, password }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.msg || "アカウント作成に失敗しました");
  if (body.access_token) storeSession(body);
  return body;
}

export async function getUser(session) {
  if (!session?.access_token) return null;
  const response = await fetch(`${supabaseConfig.url}/auth/v1/user`, { headers: headers(session.access_token) });
  if (!response.ok) { clearSession(); return null; }
  return response.json();
}

export { headers };
