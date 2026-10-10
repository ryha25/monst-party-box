import assert from 'node:assert/strict';
import { loadRemoteCharacters } from '../src/supabase-catalog.js';

const originalFetch = globalThis.fetch;
const calls = [];
try {
  globalThis.fetch = async (url) => {
    const offset = Number(new URL(url).searchParams.get('offset'));
    calls.push(offset);
    const count = offset < 1000 ? 500 : 1;
    return { ok: true, json: async () => Array.from({ length: count }, (_, i) => ({ id: `monst-${offset + i}`, name: `名前${offset + i}` })) };
  };
  const rows = await loadRemoteCharacters();
  assert.equal(rows.length, 1001);
  assert.deepEqual(calls, [0, 500, 1000]);
  assert.equal(new Set(rows.map(row => row.id)).size, 1001);
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(loadRemoteCharacters, /503/);
  console.log('Catalogue pagination and error handling passed');
} finally {
  globalThis.fetch = originalFetch;
}
