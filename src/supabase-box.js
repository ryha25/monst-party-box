import { headers } from "./supabase-auth.js";
import { supabaseConfig } from "./supabase-config.js";

async function request(path, session, options = {}) {
  const response = await fetch(`${supabaseConfig.url}/rest/v1/${path}`, { ...options, headers: { ...headers(session.access_token), ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`同期に失敗しました (${response.status})`);
  return response.status === 204 ? null : response.json();
}

export async function ensureAccounts(session, user) {
  let accounts = await request(`accounts?user_id=eq.${user.id}&select=id,slot`, session);
  const slots = new Set(accounts.map((account) => account.slot));
  const missing = ["main", "sub"].filter((slot) => !slots.has(slot));
  if (missing.length) {
    accounts = await request("accounts?select=id,slot", session, {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify(missing.map((slot) => ({ user_id: user.id, slot, display_name: slot === "main" ? "メイン" : "サブ" })))
    });
    const current = await request(`accounts?user_id=eq.${user.id}&select=id,slot`, session);
    return current;
  }
  return accounts;
}

export async function loadBox(session, user) {
  const accounts = await ensureAccounts(session, user);
  const state = { accounts: { main: [], sub: [] } };
  for (const account of accounts) {
    const entries = await request(`account_characters?account_id=eq.${account.id}&select=character_id,quantity`, session);
    state.accounts[account.slot] = entries.map((entry) => ({ characterId: entry.character_id, quantity: entry.quantity }));
  }
  return { state, accounts };
}

export async function saveBox(session, accounts, state) {
  for (const account of accounts) {
    const entries = state.accounts[account.slot].filter((entry) => !entry.characterId.startsWith("manual-"));
    if (!entries.length) continue;
    await request("account_characters?on_conflict=account_id,character_id", session, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(entries.map((entry) => ({ account_id: account.id, character_id: entry.characterId, quantity: entry.quantity })))
    });
  }
}
