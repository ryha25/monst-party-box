export function emptyState() { return { accounts: { main: [], sub: [] } }; }

export function normalize(text = "") { return text.toLocaleLowerCase("ja-JP").replace(/[\s　・・_\-]/g, ""); }

export function findCharacters(query, catalog) {
  const needle = normalize(query);
  if (!needle) return [];
  return catalog.filter((character) => normalize(character.name).includes(needle));
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
export function boxGridRegions(width, height, columns = 5, rows = 6) {
  const left = width * 0.05;
  const top = height * 0.305;
  const gridWidth = width * 0.89;
  const gridHeight = height * 0.57;
  const cellWidth = gridWidth / columns;
  const cellHeight = gridHeight / rows;
  const insetX = cellWidth * 0.035;
  const insetY = cellHeight * 0.035;
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
