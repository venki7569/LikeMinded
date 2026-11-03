/**
 * Toxicity & Profanity Content Moderation Filter
 * Detects abusive, harassing, hateful, or threatening language.
 */

const TOXIC_PATTERNS = [
  /\b(kill\s+yourself|kys)\b/i,
  /\b(hate\s+all\s+\w+s)\b/i,
  /\b(death\s+threat|i\s+will\s+kill\s+you)\b/i,
  /\b(terrorist|nazi\s+sympathizer)\b/i,
  /\b(f[*u]ck\s+you|b[*i]tch|a[*s]shole|c[*u]nt|wh[*o]re)\b/i,
];

export function checkToxicity(text) {
  if (!text || typeof text !== 'string') {
    return { isToxic: false, score: 0, reason: null };
  }

  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isToxic: true,
        score: 0.95,
        reason: 'Content violates community guidelines regarding harassment or abusive language.',
      };
    }
  }

  return { isToxic: false, score: 0.05, reason: null };
}

export default checkToxicity;
