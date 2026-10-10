export function colourDifference(left, right) {
  if (!left?.length || left.length !== right?.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < left.length; i++) sum += Math.abs(left[i] - right[i]);
  return sum / left.length;
}

export function rankColourMatches(pixels, matches, references) {
  return matches.map(match => ({ ...match, colourError: match.source === 'personal' && !references.has(match.characterId) && match.distance <= 6 ? 0 : colourDifference(pixels, references.get(match.characterId)) }))
    .filter(match => match.colourError <= 45)
    .sort((a, b) => a.colourError - b.colourError || a.distance - b.distance)
    .slice(0, 3);
}
