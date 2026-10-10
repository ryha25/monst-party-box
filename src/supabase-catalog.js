import { supabaseConfig } from "./supabase-config.js";

export async function loadRemoteCharacters() {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
  const response = await fetch(`${supabaseConfig.url}/rest/v1/characters?select=id,name,form,attribute,attack_type,base:metadata->details->base,plus:metadata->details->plus,aliases:metadata->search_aliases&order=id.asc&limit=${pageSize}&offset=${offset}`, {
    headers: {
      apikey: supabaseConfig.publishableKey,
      Authorization: `Bearer ${supabaseConfig.publishableKey}`
    }
  });
  if (!response.ok) throw new Error(`Character catalogue request failed (${response.status})`);
  const page = await response.json();
  rows.push(...page);
  if (page.length < pageSize) break;
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    form: row.form || "未設定",
    attribute: row.attribute || "未設定",
    type: row.attack_type || "未設定",
    stats: { base: row.base || {}, plus: row.plus || {} },
    aliases: row.aliases || ''
  })).sort((a,b) => Number(a.id.replace('monst-','')) - Number(b.id.replace('monst-','')));
}
