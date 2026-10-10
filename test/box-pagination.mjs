import assert from 'node:assert/strict';
import { loadBox } from '../src/supabase-box.js';
const original = globalThis.fetch;
const calls = [];
try {
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/accounts')) return { ok:true, status:200, json:async()=>[{id:'main-account',slot:'main'},{id:'sub-account',slot:'sub'}] };
    const account = parsed.searchParams.get('account_id');
    const offset = Number(parsed.searchParams.get('offset'));
    calls.push([account, offset]);
    const count = account === 'eq.main-account' ? Math.min(500, 1961-offset) : 1;
    return { ok:true, status:200, json:async()=>Array.from({length:count},(_,i)=>({character_id:`${account}-${offset+i}`,quantity:offset+i===0?3:1})) };
  };
  const result = await loadBox({access_token:'test'}, {id:'owner'});
  assert.equal(result.state.accounts.main.length,1961);
  assert.equal(result.state.accounts.main[0].quantity,3);
  assert.equal(result.state.accounts.sub.length,1);
  assert.deepEqual(calls.filter(c=>c[0]==='eq.main-account').map(c=>c[1]),[0,500,1000,1500]);
  console.log('All 1961 main BOX records loaded; quantities and sub separation preserved');
} finally { globalThis.fetch=original; }
