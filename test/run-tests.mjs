import assert from "node:assert/strict";
import { boxGridRegions, createManualCharacter, emptyState, findCharacters, iconArtworkRegion, isLikelyColorIcon, mergeCandidates, recognizeFromFiles, saveCandidates } from "../src/box-service.js";

const catalog = [{ id: "lucifer", name: "ルシファー" }, { id: "mana", name: "マナ" }];
const cases = [
  ["same character candidates are combined as a quantity", () => assert.deepEqual(mergeCandidates([{ ...catalog[0], quantity: 1 }, { ...catalog[0], quantity: 2 }]).map(({ id, quantity }) => ({ id, quantity })), [{ id: "lucifer", quantity: 3 }])],
  ["saving a second import increases quantity without a duplicate row", () => { let state = saveCandidates(emptyState(), "main", [{ ...catalog[0], quantity: 1 }]); state = saveCandidates(state, "main", [{ ...catalog[0], quantity: 2 }]); assert.deepEqual(state.accounts.main, [{ characterId: "lucifer", quantity: 3 }]); }],
  ["main and sub boxes remain separated", () => { let state = saveCandidates(emptyState(), "main", [{ ...catalog[0], quantity: 1 }]); state = saveCandidates(state, "sub", [{ ...catalog[1], quantity: 1 }]); assert.equal(state.accounts.main[0].characterId, "lucifer"); assert.equal(state.accounts.sub[0].characterId, "mana"); }],
  ["character search supports partial Japanese names", () => assert.deepEqual(findCharacters("ルシ", catalog).map((character) => character.id), ["lucifer"])],
  ["local screenshot candidate detection leaves no network dependency", () => assert.deepEqual(recognizeFromFiles([{ name: "box_ルシファー_01.png" }], catalog).map((character) => character.id), ["lucifer"])],
  ["BOX screenshots are split into square icon regions", () => { const regions = boxGridRegions(590, 1280); assert.equal(regions.length, 35); assert.ok(regions.every((region) => region.x >= 0 && region.y >= 0 && region.width > 0 && region.height > 0 && Math.abs(region.width - region.height) < 12)); }],
  ["icon crop excludes the frame and bottom status overlays", () => { const card = boxGridRegions(590, 1280)[0]; const artwork = iconArtworkRegion(card); assert.ok(artwork.x > card.x && artwork.y > card.y); assert.ok(artwork.width < card.width && artwork.height < card.height); }],
  ["greyed-out picture-book icons are ignored", () => { const grey = new Uint8ClampedArray(4 * 120).fill(120); const colourful = new Uint8ClampedArray(4 * 120); for (let index = 0; index < colourful.length; index += 4) { colourful[index] = 210; colourful[index + 1] = 80; colourful[index + 2] = 50; colourful[index + 3] = 255; } assert.equal(isLikelyColorIcon(grey), false); assert.equal(isLikelyColorIcon(colourful), true); }],
  ["unknown names become stable manual character records", () => assert.deepEqual(createManualCharacter("テストキャラ"), { id: "manual-%E3%83%86%E3%82%B9%E3%83%88%E3%82%AD%E3%83%A3%E3%83%A9", name: "テストキャラ", form: "手動登録", attribute: "?", type: "?", isManual: true })]
];

for (const [label, fn] of cases) {
  fn();
  console.log(`✓ ${label}`);
}
console.log(`\n${cases.length} tests passed`);
