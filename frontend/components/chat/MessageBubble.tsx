'use client';
import { Message, User } from '@/lib/types';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Trash2, Reply, Smile } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
  if (status === 'sent') return <Check className="w-3.5 h-3.5 text-gray-400" />;
  return <Check className="w-3.5 h-3.5 text-gray-300" />;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return format(d, 'HH:mm');
}

interface Props {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isGroup: boolean;
  onReply: (msg: Message) => void;
}

export function MessageBubble({ message, isOwn, showAvatar, isGroup, onReply }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const { user, theme } = useStore();
  const isDark = theme === 'dark';
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleReact = async (emoji: string) => {
    await api.reactToMessage(message.conversation_id, message.id, emoji);
    setShowEmoji(false);
  };

  const handleDelete = async () => {
    await api.deleteMessage(message.conversation_id, message.id);
  };

  if (message.is_deleted) {
    return (
      <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {showAvatar && !isOwn && <div className="w-8 h-8" />}
        <div className="rounded-2xl px-3 py-1.5 text-sm italic" style={{ backgroundColor: isDark ? '#e2e8f0' : 'var(--surface-muted)', color: 'var(--text-muted)' }}>
          This message was deleted
        </div>
      </div>
    );
  }

  // Group reactions
  const reactionMap: Record<string, number> = {};
  for (const r of message.reactions) {
    reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1;
  }
  const myReactions = new Set(message.reactions.filter(r => r.user_id === user?.id).map(r => r.emoji));

  return (
    <div
      className={`flex items-end gap-2 mb-1 group ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmoji(false); }}
    >
      {/* Avatar */}
      {isGroup && !isOwn && (
        showAvatar
          ? <Avatar user={message.sender} size={28} />
          : <div className="w-7" />
      )}

      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name in group */}
        {isGroup && !isOwn && showAvatar && (
          <span className="text-xs font-medium mb-0.5 ml-3" style={{ color: stringToColor(message.sender.display_name) }}>
            {message.sender.display_name}
          </span>
        )}

        {/* Reply preview */}
        {message.reply_to && !message.reply_to.is_deleted && (
          <div className="mb-1 flex max-w-full cursor-pointer items-start gap-1 rounded-lg border-l-2 px-3 py-1 text-xs" style={{ backgroundColor: 'rgba(37, 99, 235, 0.08)', borderColor: 'var(--accent)', color: 'var(--text-secondary)' }}>
            <div>
              <div className="font-medium" style={{ color: 'var(--accent)' }}>{message.reply_to.sender.display_name}</div>
              <div className="truncate max-w-xs">{message.reply_to.content || (message.reply_to.file_name ? `📎 ${message.reply_to.file_name}` : '')}</div>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          <div className={`relative rounded-2xl px-3 py-2 text-sm leading-relaxed break-words shadow-sm ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
            style={{
              backgroundColor: isOwn ? (isDark ? '#2563eb' : 'var(--accent)') : (isDark ? '#ffffff' : 'var(--surface)'),
              color: isOwn ? '#fff' : 'var(--text-primary)',
            }}
          >
            {/* Image */}
            {message.message_type === 'image' && message.file_url && (
              <img
                src={`${BASE}${message.file_url}`}
                alt="attachment"
                className="max-w-xs rounded-lg mb-1 cursor-pointer"
                onClick={() => window.open(`${BASE}${message.file_url}`, '_blank')}
              />
            )}
            {/* File */}
            {message.message_type === 'file' && message.file_url && (
              <a href={`${BASE}${message.file_url}`} target="_blank" rel="noreferrer"
                className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-black/10" style={{ backgroundColor: 'rgba(15, 23, 42, 0.08)' }}>
                <span className="text-2xl">📎</span>
                <span className="text-xs text-blue-300 underline">{message.file_name || 'File'}</span>
              </a>
            )}
            {/* Text */}
            {message.content && <span>{message.content}</span>}

            {/* Time + status */}
            <span className="ml-2 mt-1 flex items-center gap-0.5 text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
              {formatTime(message.created_at)}
              {isOwn && <StatusIcon status={message.status} />}
            </span>
          </div>

          {/* Reactions */}
          {Object.keys(reactionMap).length > 0 && (
            <div className={`flex gap-1 mt-0.5 flex-wrap ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactionMap).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border
                    ${myReactions.has(emoji) ? 'border-blue-500/40' : 'border-slate-300/70'}
                    hover:bg-blue-500/30 transition-colors`}
                >
                  {emoji} {count > 1 && <span className="text-gray-400">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
          <button onClick={() => setShowEmoji(!showEmoji)}
            className="rounded-full p-1 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <Smile className="w-4 h-4" />
          </button>
          <button onClick={() => onReply(message)}
            className="rounded-full p-1 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <Reply className="w-4 h-4" />
          </button>
          {isOwn && (
            <button onClick={handleDelete}
              className="rounded-full p-1 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {showEmoji && (
            <div className="absolute z-50 flex gap-1 rounded-full border px-2 py-1 shadow-xl" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => handleReact(e)}
                  className="text-lg hover:scale-125 transition-transform">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function stringToColor(str: string) {
  const colors = ['#25d366','#53bdeb','#7bc67e','#fcb8b8','#ffc46b','#a29bfe','#fd79a8'];
  let hash = 0;
  for (const c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
