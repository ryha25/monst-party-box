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
