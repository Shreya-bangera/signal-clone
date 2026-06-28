'use client';
import { Conversation, User } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { CheckCheck, Check, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function formatLastTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MM/dd/yy');
}

export function ConversationItem({ conversation, isActive, onClick }: Props) {
  const { user, onlineUsers, theme } = useStore();
  const isDark = theme === 'dark';

  const otherUser = !conversation.is_group
    ? conversation.members.find((m) => m.user.id !== user?.id)?.user
    : null;

  const displayName = conversation.is_group
    ? conversation.name
    : otherUser?.display_name || 'Unknown';

  const avatarSrc = conversation.is_group ? conversation.avatar_url : otherUser?.avatar_url;
  const avatarUser = !conversation.is_group ? otherUser : undefined;

  const lastMsg = conversation.last_message;
  const isOwn = lastMsg?.sender_id === user?.id;
  const isOnline = otherUser ? (onlineUsers.has(otherUser.id) || otherUser.is_online) : false;

  let preview = '';
  if (lastMsg) {
    if (lastMsg.is_deleted) preview = 'This message was deleted';
    else if (lastMsg.message_type === 'image') preview = '📷 Photo';
    else if (lastMsg.message_type === 'file') preview = `📎 ${lastMsg.file_name || 'File'}`;
    else preview = lastMsg.content || '';
  }

  if (conversation.is_group && lastMsg && !isOwn) {
    const senderName = lastMsg.sender.display_name.split(' ')[0];
    preview = `${senderName}: ${preview}`;
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 border-b px-4 py-3 transition-colors"
      style={{
        backgroundColor: isActive ? (isDark ? '#e5ecf4' : 'var(--accent-soft)') : 'transparent',
        borderColor: isDark ? '#e2e8f0' : 'var(--border)',
      }}
    >
      {/* Avatar with online dot */}
      <div className="relative flex-shrink-0">
        {conversation.is_group ? (
          <Avatar name={conversation.name || 'G'} src={avatarSrc} size={48} />
        ) : (
          <Avatar user={avatarUser} size={48} />
        )}
        {!conversation.is_group && isOnline && (
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#111b21]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{displayName}</span>
          {lastMsg && (
            <span className="flex-shrink-0 text-xs" style={{ color: conversation.unread_count > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
              {formatLastTime(lastMsg.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {isOwn && lastMsg && (
              lastMsg.status === 'read'
                ? <CheckCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                : lastMsg.status === 'delivered'
                  ? <CheckCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  : <Check className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{preview}</span>
          </div>
          {conversation.unread_count > 0 && (
            <span className="ml-1 flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--accent)' }}>
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
