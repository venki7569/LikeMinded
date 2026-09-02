/**
 * Canonical pair helpers so A→B and B→A resolve to the same document.
 */
export function pairKey(idA, idB) {
  const a = String(idA);
  const b = String(idB);
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function orderedPair(idA, idB) {
  const a = String(idA);
  const b = String(idB);
  return a < b
    ? { userLow: idA, userHigh: idB, pairKey: `${a}:${b}` }
    : { userLow: idB, userHigh: idA, pairKey: `${b}:${a}` };
}

export function otherUserId(userId, userLow, userHigh) {
  return String(userLow) === String(userId) ? userHigh : userLow;
}

export default pairKey;
