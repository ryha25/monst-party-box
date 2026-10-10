import assert from 'node:assert/strict';
import { createReferenceIconLoader } from '../src/reference-icons.js';
const originalFetch = globalThis.fetch;
try {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/rpc/get_reference_icons'));
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const ids = JSON.parse(options.body).character_ids;
    assert.ok(ids.length <= 100);
    return { ok: true, json: async () => ids.map(id => ({ character_id: id, image_base64: '/9j/AA==' })) };
  };
  const load = createReferenceIconLoader();
  assert.equal((await load(['monst-929'], null)).size, 0);
  assert.equal(calls, 0);
  const result = await load(['monst-929', 'monst-929'], 'test-token');
  assert.equal(result.get('monst-929'), 'data:image/jpeg;base64,/9j/AA==');
  await load(['monst-929'], 'test-token');
  assert.equal(calls, 1);
  await load(Array.from({ length: 201 }, (_, i) => `id-${i}`), 'test-token');
  assert.equal(calls, 4);
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  await assert.rejects(load(['missing'], 'test-token'), /401/);
  console.log('Reference icon display loader: auth, caching, batching and errors passed');
} finally { globalThis.fetch = originalFetch; }
