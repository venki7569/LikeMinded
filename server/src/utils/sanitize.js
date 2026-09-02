const TAG_STRIP = /<\/?[^>]+>/g;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Strips HTML tags and control characters from free-text fields. */
export function sanitizePlainText(value, { maxLength } = {}) {
  if (value == null) return '';
  let text = String(value).replace(TAG_STRIP, ' ').replace(CONTROL_CHARS, '');
  text = text.replace(/\s+/g, ' ').trim();
  if (maxLength) text = text.slice(0, maxLength);
  return text;
}

export function uniqueNormalizedTags(list, { maxItems = 20, maxLength = 40 } = {}) {
  const seen = new Set();
  const tags = [];
  for (const raw of list ?? []) {
    const tag = sanitizePlainText(raw, { maxLength }).toLowerCase();
    if (tag.length < 2 || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= maxItems) break;
  }
  return tags;
}

const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:', 'file:']);

/**
 * Accepts empty string or an http(s) URL without credentials. `publicId` stays
 * empty for these remote URLs so Cloudinary signed uploads can occupy the same
 * `{ url, publicId }` shape later without an API change.
 */
export function assertHttpUrl(value, { field = 'url', allowEmpty = true } = {}) {
  if (!value) {
    if (allowEmpty) return '';
    throw new Error(`${field} is required`);
  }

  const trimmed = String(value).trim();
  if (trimmed.length > 2048) throw new Error(`${field} is too long`);

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }

  if (BLOCKED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`${field} uses a disallowed protocol`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`${field} must use http or https`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${field} must not contain credentials`);
  }
  return parsed.toString();
}

export function isAllowedHttpUrl(value) {
  try {
    assertHttpUrl(value, { allowEmpty: true });
    return true;
  } catch {
    return false;
  }
}

export default sanitizePlainText;
