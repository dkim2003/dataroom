// Storage path safety utilities.
// Every user-controlled string that reaches supabase.storage.upload/remove/download/list
// must pass through one of these checks. This prevents path traversal (..),
// null-byte injection, control-character smuggling, and cross-prefix escape
// (e.g. an "internal" folder name like "../general/x" writing to general/).

// A single path segment — no separators, no traversal, no control chars, not empty.
export function isSafeSegment(s) {
  if (typeof s !== 'string') return false
  // Normalize Unicode to NFC to prevent lookalike character bypasses
  // (e.g. fullwidth solidus U+FF0F normalizing to /)
  s = s.normalize('NFC')
  if (s.length === 0 || s.length > 255) return false
  if (s === '.' || s === '..') return false
  if (s.includes('/') || s.includes('\\')) return false
  // Reject null bytes and all C0/DEL control chars.
  if (/[\u0000-\u001f\u007f]/.test(s)) return false
  // Reject Unicode characters that could normalize to path separators or
  // traversal sequences on certain filesystems/storage backends.
  // Fullwidth solidus (U+FF0F), fullwidth reverse solidus (U+FF3C),
  // fraction slash (U+2044), division slash (U+2215).
  if (/[\uff0f\uff3c\u2044\u2215]/.test(s)) return false
  return true
}

// A slash-separated relative path where every segment is safe.
// Rejects leading/trailing slash and empty segments ("a//b").
export function isSafeRelativePath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 1024) return false
  if (p.startsWith('/') || p.endsWith('/')) return false
  const segs = p.split('/')
  return segs.every(isSafeSegment)
}

// A storage path whose first segment is in the allowed prefix list.
// Example: isSafeStoragePath('general/01_X/file.pdf', ['general','restricted','internal']) === true
export function isSafeStoragePath(p, allowedPrefixes) {
  if (!isSafeRelativePath(p)) return false
  return allowedPrefixes.includes(p.split('/')[0])
}

// Returns the first segment of a path, or null if the path is invalid.
export function topLevelPrefix(p) {
  if (typeof p !== 'string' || !p) return null
  return p.split('/')[0] || null
}

// HTML-escape a string before interpolating it into an HTML template
// (e.g. an email body). Prevents stored HTML/script injection.
export function escapeHtml(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
