/**
 * Sentiment Analyzer Module
 * Analyzes polarity of posts and comments (positive, neutral, negative).
 */

const POSITIVE_WORDS = new Set([
  'great', 'awesome', 'amazing', 'love', 'excellent', 'fantastic', 'happy',
  'excited', 'proud', 'congrats', 'congratulations', 'inspiring', 'wonderful',
  'good', 'best', 'superb', 'celebrating', 'win', 'achievement', 'thrilled',
  'helpful', 'valuable', 'enjoy', 'creative', 'success', 'collaborate', 'innovative'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'sad',
  'angry', 'fail', 'disappointed', 'annoying', 'boring', 'broken',
  'useless', 'garbage', 'trash', 'pain', 'sucks', 'unhappy', 'frustrated'
]);

export function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { sentiment: 'neutral', score: 0 };
  }

  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  let score = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) score += 1;
    if (NEGATIVE_WORDS.has(word)) score -= 1;
  }

  if (score > 0) {
    return { sentiment: 'positive', score: Math.min(1, score * 0.25) };
  }
  if (score < 0) {
    return { sentiment: 'negative', score: Math.max(-1, score * 0.25) };
  }

  return { sentiment: 'neutral', score: 0 };
}

export default analyzeSentiment;
