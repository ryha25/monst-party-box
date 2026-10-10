export function emptyState() { return { accounts: { main: [], sub: [] } }; }

export function characterNumber(character) {
  const match = character?.id?.match(/^monst-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function sortBoxItems(items, mode = 'number') {
  const attributeOrder = { 火: 0, 水: 1, 木: 2, 光: 3, 闇: 4 };
  const number = item => characterNumber(item.character) ?? Number.MAX_SAFE_INTEGER;
  return [...items].sort((left, right) => {
    if (mode === 'attribute') {
      const difference = (attributeOrder[left.character?.attribute] ?? 5) - (attributeOrder[right.character?.attribute] ?? 5);
      if (difference) return difference;
    }
    return number(left) - number(right) || (left.character?.name || '').localeCompare(right.character?.name || '', 'ja');
  });
}

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
  const left = width * 0.056;
  const top = height * 0.30625;
  const pitch = width * 0.181;
  const side = width * 0.148;
  return Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: Math.round(left + column * pitch),
      y: Math.round(top + row * pitch),
      width: Math.round(side),
      height: Math.round(side)
    };
  });
}

// Keep just the character artwork. The lower edge is deliberately excluded:
// lock, level and luck badges change from one player screenshot to another.
export function iconArtworkRegion(card) {
  return {
    x: Math.round(card.x + card.width * 0.16),
    y: Math.round(card.y + card.height * 0.20),
    width: Math.round(card.width * 0.70),
    height: Math.round(card.height * 0.64)
  };
}

export function detectBoxGridRegions(width, height, rgba) {
  const regions = boxGridRegions(width, height);
  let run = 0;
  for (let y = Math.round(height * .28); y < Math.min(height, Math.round(height * .43)); y++) {
    let coloured = 0;
    for (let col = 0; col < 5; col++) {
      const x = Math.round(width * (.063 + .181 * col));
      const offset = (y * width + x) * 4;
      const max = Math.max(rgba[offset], rgba[offset+1], rgba[offset+2]);
      const min = Math.min(rgba[offset], rgba[offset+1], rgba[offset+2]);
      if (max > 100 && max - min > 60) coloured++;
    }
    run = coloured >= 3 ? run + 1 : 0;
    if (run >= 4) {
      const top = y - 3;
      return regions.map(r => ({ ...r, y: r.y + top - regions[0].y })).filter(r => r.y + r.height < height * .9);
    }
  }
  return regions.filter(r => r.y + r.height < height * .9);
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
