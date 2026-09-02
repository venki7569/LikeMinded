import { describe, expect, it } from 'vitest';
import { durationFromNow, parseDuration } from '../../src/utils/duration.js';

describe('parseDuration', () => {
  it.each([
    ['500ms', 500],
    ['30s', 30_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['30d', 2_592_000_000],
  ])('converts %s to %i ms', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it('passes numbers through unchanged', () => {
    expect(parseDuration(1234)).toBe(1234);
  });

  it('accepts whitespace and uppercase units', () => {
    expect(parseDuration(' 2 H ')).toBe(7_200_000);
  });

  it.each(['', 'soon', '10y', '-5m', '5 minutes'])('rejects %s', (input) => {
    expect(() => parseDuration(input)).toThrow(/Invalid duration/);
  });
});

describe('durationFromNow', () => {
  it('returns a future date offset by the duration', () => {
    const before = Date.now();
    const result = durationFromNow('1h');
    expect(result.getTime()).toBeGreaterThanOrEqual(before + 3_600_000);
  });
});
