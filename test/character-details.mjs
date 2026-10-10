import assert from 'node:assert/strict';
import { createCharacterDetailsLoader, detailFields, totalStat } from '../src/character-details.js';
assert.equal(totalStat(9689,2460),12149);
assert.equal(totalStat(247.83,24.7),272.53);
assert.equal(totalStat(null,100),null);
assert.equal(totalStat('',100),null);
assert.equal(totalStat(0,0),0);
const fields=new Map(detailFields({id:'monst-929',name:'ウリエル',form:'進化前',attribute:'光',type:'貫通'}, {base:{hp:9689},plus:{hp:2460}}));
assert.equal(fields.get('図鑑No.'),'929');
assert.equal(fields.get('HP（タス最大）'),'12149');
assert.equal(fields.get('攻撃力（タス最大）'),'未登録');
const original=globalThis.fetch;
try {
 let calls=0;
 globalThis.fetch=async url=>{calls++;assert.equal(new URL(url).searchParams.get('id'),'eq.monst-929');return {ok:true,json:async()=>[{metadata:{details:{rarity:5}}}]};};
 const load=createCharacterDetailsLoader();
 assert.deepEqual(await load('monst-929'),{rarity:5});
 await load('monst-929');assert.equal(calls,1);
 assert.deepEqual(await load('manual-test'),{});assert.equal(calls,1);
 globalThis.fetch=async()=>({ok:false,status:503});
 await assert.rejects(load('monst-930'),/503/);
 console.log('Character details: correct totals, missing values, caching, manual and error cases passed');
} finally {globalThis.fetch=original;}
