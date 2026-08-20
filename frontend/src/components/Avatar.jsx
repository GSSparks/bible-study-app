import { getAvatarColor, getAvatarInitials } from '../utils/avatar.js';

/** A small, deterministic, generated avatar — a colored circle with
 * initials, derived from the username so it's stable across sessions
 * without needing an uploaded photo. Deliberately a plain div, not a
 * button — the current use (clicking to open the account menu) wraps
 * it in one, but this same component is meant to show up in
 * non-clickable contexts later too (a friends list, group member
 * list, wall posts). */
export default function Avatar({ username, size = 32, className = '' }) {
  const color = getAvatarColor(username);
  const initials = getAvatarInitials(username);
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-medium text-ink ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
      title={username}
    >
      {initials}
    </div>
  );
}