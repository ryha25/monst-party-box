import assert from "node:assert/strict";
import { emptyState, findCharacters, mergeCandidates, recognizeFromFiles, saveCandidates } from "../src/box-service.js";

const catalog = [{ id: "lucifer", name: "ルシファー" }, { id: "mana", name: "マナ" }];
const cases = [
  ["same character candidates are combined as a quantity", () => assert.deepEqual(mergeCandidates([{ ...catalog[0], quantity: 1 }, { ...catalog[0], quantity: 2 }]).map(({ id, quantity }) => ({ id, quantity })), [{ id: "lucifer", quantity: 3 }])],
  ["saving a second import increases quantity without a duplicate row", () => { let state = saveCandidates(emptyState(), "main", [{ ...catalog[0], quantity: 1 }]); state = saveCandidates(state, "main", [{ ...catalog[0], quantity: 2 }]); assert.deepEqual(state.accounts.main, [{ characterId: "lucifer", quantity: 3 }]); }],
  ["main and sub boxes remain separated", () => { let state = saveCandidates(emptyState(), "main", [{ ...catalog[0], quantity: 1 }]); state = saveCandidates(state, "sub", [{ ...catalog[1], quantity: 1 }]); assert.equal(state.accounts.main[0].characterId, "lucifer"); assert.equal(state.accounts.sub[0].characterId, "mana"); }],
  ["character search supports partial Japanese names", () => assert.deepEqual(findCharacters("ルシ", catalog).map((character) => character.id), ["lucifer"])],
  ["local screenshot candidate detection leaves no network dependency", () => assert.deepEqual(recognizeFromFiles([{ name: "box_ルシファー_01.png" }], catalog).map((character) => character.id), ["lucifer"])]
];

for (const [label, fn] of cases) {
  fn();
  console.log(`✓ ${label}`);
}
console.log(`\n${cases.length} tests passed`);
