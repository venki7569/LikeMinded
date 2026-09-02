import { describe, expect, it } from 'vitest';
import { orderedPair, otherUserId, pairKey } from '../../src/utils/pair.js';

describe('pair helpers', () => {
  it('orders ids so A-B and B-A share a key', () => {
    const a = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const b = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    expect(pairKey(a, b)).toBe(pairKey(b, a));
    expect(orderedPair(b, a)).toEqual({ userLow: a, userHigh: b, pairKey: `${a}:${b}` });
    expect(String(otherUserId(a, a, b))).toBe(b);
  });
});
