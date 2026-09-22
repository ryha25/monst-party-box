export function emptyState() { return { accounts: { main: [], sub: [] } }; }

export function normalize(text = "") { return text.toLocaleLowerCase("ja-JP").replace(/[\s　・・_\-]/g, ""); }

export function findCharacters(query, catalog) {
  const needle = normalize(query);
  if (!needle) return [];
  return catalog.filter((character) => normalize(character.name).includes(needle));
}

export function createManualCharacter(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("キャラ名を入力してください");
  return {
    id: `manual-${encodeURIComponent(normalize(trimmed))}`,
    name: trimmed,
    form: "手動登録",
    attribute: "?",
    type: "?",
    isManual: true
  };
}

// Browser-only fallback: screenshots are not sent anywhere. Names included in filenames
// are matched to the local catalogue; unmatched screenshots are intentionally left for review.
export function recognizeFromFiles(files, catalog) {
  const names = files.map((file) => normalize(file.name)).join(" ");
  return catalog.filter((character) => names.includes(normalize(character.name))).map((character) => ({ ...character, quantity: 1, source: "filename" }));
}

export function mergeCandidates(candidates) {
  const merged = new Map();
  for (const candidate of candidates) {
    const existing = merged.get(candidate.id);
    merged.set(candidate.id, existing ? { ...existing, quantity: existing.quantity + Number(candidate.quantity || 1) } : { ...candidate, quantity: Number(candidate.quantity || 1) });
  }
  return [...merged.values()];
}

export function saveCandidates(state, account, candidates) {
  const next = structuredClone(state);
  const existing = new Map(next.accounts[account].map((item) => [item.characterId, item]));
  for (const candidate of mergeCandidates(candidates)) {
    const record = existing.get(candidate.id);
    if (record) record.quantity += candidate.quantity;
    else existing.set(candidate.id, { characterId: candidate.id, quantity: candidate.quantity });
  }
  next.accounts[account] = [...existing.values()];
  return next;
}

// Standard phone BOX screenshots show five icon columns. Keeping crop geometry
// independent lets an unresolved icon be named manually today and matched by a
// future image catalogue without changing the review flow.
export function boxGridRegions(width, height, columns = 5, rows = 7) {
  // BOX cards are square. Deriving both axes from the horizontal pitch avoids
  // stretching a card when the screenshot contains a variable-height bottom UI.
  const left = width * 0.053;
  const top = height * 0.305;
  const cellWidth = (width * 0.89) / columns;
  const cellHeight = cellWidth;
  const insetX = cellWidth * 0.08;
  const insetY = cellHeight * 0.055;
  return Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: Math.round(left + column * cellWidth + insetX),
      y: Math.round(top + row * cellHeight + insetY),
      width: Math.round(cellWidth - insetX * 2),
      height: Math.round(cellHeight - insetY * 2)
    };
  });
}

// Keep just the character artwork. The lower edge is deliberately excluded:
// lock, level and luck badges change from one player screenshot to another.
export function iconArtworkRegion(card) {
  return {
    x: Math.round(card.x + card.width * 0.15),
    y: Math.round(card.y + card.height * 0.12),
    width: Math.round(card.width * 0.70),
    height: Math.round(card.height * 0.68)
  };
}

// Unobtained monsters in the picture book are rendered nearly monochrome.
// This works on the inner art only, so a colourful card frame cannot cause a
// greyed-out character to be imported by mistake.
export function isLikelyColorIcon(rgbaPixels) {
  let meaningful = 0;
  let colourful = 0;
  for (let index = 0; index < rgbaPixels.length; index += 4) {
    const red = rgbaPixels[index]; const green = rgbaPixels[index + 1]; const blue = rgbaPixels[index + 2];
    const maximum = Math.max(red, green, blue); const minimum = Math.min(red, green, blue);
    if (maximum < 42 || maximum > 245) continue;
    meaningful += 1;
    if (maximum - minimum >= 38) colourful += 1;
  }
  return meaningful > 100 && colourful / meaningful >= 0.18;
}
