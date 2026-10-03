import Avatar from './Avatar.jsx';

export default function AvatarRoll({ members, total, max = 5, onMemberClick, onOverflowClick }) {
  const visible = members.slice(0, max);
  const overflow = (total ?? members.length) - visible.length;

  if (visible.length === 0) return null;

  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <button
          key={m.id || m.username}
          onClick={() => onMemberClick?.(m.username)}
          title={m.displayName || m.username}
          className="relative rounded-full ring-2 ring-ink transition-transform hover:scale-110 hover:ring-brass"
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }}
        >
          <Avatar username={m.username} avatarUrl={m.avatarUrl} size={28} />
        </button>
      ))}
      {overflow > 0 && (
        <button
          onClick={onOverflowClick}
          className="relative flex items-center justify-center rounded-full bg-panel text-[10px] font-semibold text-muted ring-2 ring-ink hover:ring-brass hover:text-parchment"
          style={{ marginLeft: -8, zIndex: 0, width: 28, height: 28 }}
        >
          +{overflow}
        </button>
      )}
    </div>
  );
}
