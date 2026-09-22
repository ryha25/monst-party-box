import { supabaseConfig } from "./supabase-config.js";

export async function loadRemoteCharacters() {
  const response = await fetch(`${supabaseConfig.url}/rest/v1/characters?select=id,name,form,attribute,attack_type&order=name.asc`, {
    headers: {
      apikey: supabaseConfig.publishableKey,
      Authorization: `Bearer ${supabaseConfig.publishableKey}`
    }
  });
  if (!response.ok) throw new Error(`Character catalogue request failed (${response.status})`);
  const rows = await response.json();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    form: row.form || "未設定",
    attribute: row.attribute || "未設定",
    type: row.attack_type || "未設定"
  }));
}
