import { getAvatarColor, getAvatarInitials } from '../utils/avatar.js';

export default function Avatar({ username, avatarUrl, size = 32, className = '' }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        title={username}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
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
