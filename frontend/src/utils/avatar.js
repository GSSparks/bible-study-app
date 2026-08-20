/** Deterministically derives a background color and initials from a
 * username — same username always produces the same avatar, so every
 * user gets a distinct, stable "generated" avatar without needing to
 * upload a photo or call out to an external avatar service.
 */

const PALETTE = [
  '#C89B3C', // brass
  '#3F7168', // verdigris
  '#96721C', // pageAccent
  '#a3382f', // red-letter red
  '#5B7C99',
  '#7C5B99',
  '#4A7C59',
  '#99745B',
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // force a 32-bit int
  }
  return Math.abs(hash);
}

export function getAvatarColor(username) {
  const hash = hashString(username || '');
  return PALETTE[hash % PALETTE.length];
}

export function getAvatarInitials(username) {
  if (!username) return '?';
  // Up to two "word" initials, splitting on common separators
  // (john.doe, john_doe, john-doe, "john doe") — falls back to the
  // first two characters for a single unbroken username.
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}