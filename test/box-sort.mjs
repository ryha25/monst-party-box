import assert from 'node:assert/strict';
import { characterNumber, sortBoxItems } from '../src/box-service.js';
const rows = [
 {character:{id:'monst-1000',attribute:'火',name:'火1000'},quantity:2},
 {character:{id:'monst-9',attribute:'闇',name:'闇9'},quantity:1},
 {character:{id:'monst-99',attribute:'水',name:'水99'},quantity:3},
 {character:{id:'monst-20',attribute:'火',name:'火20'},quantity:1},
 {character:{id:'manual-a',attribute:'?',name:'手動'},quantity:4},
 {character:{id:'monst-40',attribute:'木',name:'木40'},quantity:1},
 {character:{id:'monst-30',attribute:'光',name:'光30'},quantity:1}
];
const snapshot=structuredClone(rows);
assert.deepEqual(sortBoxItems(rows).map(x=>x.character.id),['monst-9','monst-20','monst-30','monst-40','monst-99','monst-1000','manual-a']);
assert.deepEqual(sortBoxItems(rows,'attribute').map(x=>x.character.id),['monst-20','monst-1000','monst-99','monst-40','monst-30','monst-9','manual-a']);
assert.deepEqual(rows,snapshot);
assert.equal(characterNumber({id:'monst-738'}),738);
assert.equal(characterNumber({id:'manual-test'}),null);
assert.deepEqual(sortBoxItems([]),[]);
console.log('Numeric number order, attribute order, unknowns and non-mutating sorting passed');
