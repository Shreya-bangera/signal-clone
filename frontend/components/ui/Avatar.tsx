'use client';
import { User } from '@/lib/types';

interface Props {
  user?: User | null;
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
}

const COLORS = [
  'bg-blue-500','bg-green-500','bg-purple-500','bg-pink-500',
  'bg-yellow-500','bg-red-500','bg-indigo-500','bg-teal-500',
];

function colorFromName(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ user, name, src, size = 40, className = '' }: Props) {
  const displayName = user?.display_name || name || '?';
  const avatarSrc = src ?? user?.avatar_url;
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const color = colorFromName(displayName);

  return (
    <div
      className={`relative flex-shrink-0 rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {avatarSrc ? (
        <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${color} text-white font-semibold`}
          style={{ fontSize: size * 0.38 }}>
          {initials}
        </div>
      )}
    </div>
  );
}
