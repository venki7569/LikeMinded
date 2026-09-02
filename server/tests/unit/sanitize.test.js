import { describe, expect, it } from 'vitest';
import { assertHttpUrl, sanitizePlainText, uniqueNormalizedTags } from '../../src/utils/sanitize.js';

describe('sanitizePlainText', () => {
  it('strips tags and collapses whitespace', () => {
    expect(sanitizePlainText('  Hello <script>alert(1)</script> world  ')).toBe('Hello alert(1) world');
  });

  it('honours maxLength after sanitizing', () => {
    expect(sanitizePlainText('abcdefghij', { maxLength: 4 })).toBe('abcd');
  });
});

describe('uniqueNormalizedTags', () => {
  it('lowercases, trims, de-duplicates and caps the list', () => {
    expect(
      uniqueNormalizedTags(['React', ' react ', 'NLP', 'x', 'node', 'go'], { maxItems: 3, maxLength: 40 })
    ).toEqual(['react', 'nlp', 'node']);
  });
});

describe('assertHttpUrl', () => {
  it('allows empty values and https URLs', () => {
    expect(assertHttpUrl('')).toBe('');
    expect(assertHttpUrl('https://cdn.example.com/me.png')).toMatch(/^https:\/\//);
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'not a url', 'ftp://files.example.com'])(
    'rejects %s',
    (value) => {
      expect(() => assertHttpUrl(value)).toThrow();
    }
  );

  it('rejects URLs that embed credentials', () => {
    expect(() => assertHttpUrl('https://user:pass@cdn.example.com/x.png')).toThrow(/credentials/);
  });
});
