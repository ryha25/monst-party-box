import { supabaseConfig } from './supabase-config.js';

export function createReferenceIconLoader() {
  const cache = new Map();
  return async (ids, token) => {
    if (!token) return new Map();
    const unique = [...new Set(ids.filter(Boolean))];
    const missing = unique.filter(id => !cache.has(id));
    for (let i = 0; i < missing.length; i += 100) {
      const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/get_reference_icons`, {
        method: 'POST',
        headers: { apikey: supabaseConfig.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_ids: missing.slice(i, i + 100) })
      });
      if (!response.ok) throw new Error(`基準アイコンを取得できませんでした (${response.status})`);
      for (const row of await response.json()) {
        if (/^[A-Za-z0-9+/=]+$/.test(row.image_base64)) cache.set(row.character_id, `data:image/jpeg;base64,${row.image_base64}`);
      }
    }
    return new Map(unique.filter(id => cache.has(id)).map(id => [id, cache.get(id)]));
  };
}
