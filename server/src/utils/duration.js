const UNIT_TO_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Converts a duration string such as `15m`, `12h`, or `30d` into milliseconds.
 * Accepts the same shorthand as `jsonwebtoken`'s `expiresIn` so a single env
 * value can drive both the JWT and its database expiry record.
 */
export function parseDuration(value) {
  if (typeof value === 'number') return value;

  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(String(value).trim());
  if (!match) {
    throw new Error(`Invalid duration: "${value}". Use formats like 500ms, 30s, 15m, 12h, 30d.`);
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit.toLowerCase()];
}

export function durationFromNow(value) {
  return new Date(Date.now() + parseDuration(value));
}

export default parseDuration;
