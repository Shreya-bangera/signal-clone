'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/ws';
import { Message, Conversation } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { Avatar } from '@/components/ui/Avatar';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Phone, Video, Search, Smile, Paperclip,
  Send, X, ArrowDown, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const EMOJIS = ['😊','😂','❤️','👍','🎉','🔥','😍','🤔','😢','😮','🙏','✨','💪','😎','🥰','😅'];

interface Props {
  conversation: Conversation;
  onInfoClick?: () => void;
}

function DateDivider({ date }: { date: string }) {
  const d = new Date(date);
  let label = format(d, 'MMMM d, yyyy');
  if (isToday(d)) label = 'Today';
  else if (isYesterday(d)) label = 'Yesterday';
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-gray-700/50" />
      <span className="text-xs text-gray-400 bg-[#0d1117] px-2">{label}</span>
      <div className="flex-1 h-px bg-gray-700/50" />
    </div>
  );
}

export function ChatPane({ conversation, onInfoClick }: Props) {
  const { user, messages, setMessages, addMessage, typingUsers, onlineUsers, theme } = useStore();
  const isDark = theme === 'dark';
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const convMessages = messages[conversation.id] || [];

  const otherUser = !conversation.is_group
    ? conversation.members.find((m) => m.user.id !== user?.id)?.user
    : null;

  const typingSet = typingUsers[conversation.id];
  const typingList = typingSet ? [...typingSet].filter((id) => id !== user?.id) : [];

  const scrollToBottom = useCallback((smooth = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Load messages on mount / conversation change
  useEffect(() => {
    setHasMore(true);
    api.getMessages(conversation.id, 0, 50).then((msgs) => {
      setMessages(conversation.id, msgs);
      setTimeout(() => scrollToBottom(), 50);
    });
  }, [conversation.id]);

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const isNearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (isNearBottom) scrollToBottom(true);
  }, [convMessages.length]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleScroll = async () => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
    setShowScrollBtn(!nearBottom);

    // Load more on scroll to top
    if (list.scrollTop < 80 && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      const prevHeight = list.scrollHeight;
      try {
        const older = await api.getMessages(conversation.id, convMessages.length, 50);
        if (older.length < 50) setHasMore(false);
        if (older.length > 0) {
          useStore.getState().prependMessages(conversation.id, older);
          setTimeout(() => {
            list.scrollTop = list.scrollHeight - prevHeight;
          }, 10);
        }
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content && !replyTo) return;
    setInput('');
    setReplyTo(null);
    setShowEmoji(false);
    try {
      await api.sendMessage(conversation.id, {
        content,
        reply_to_id: replyTo?.id,
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    handleTyping();
  };

  const handleTyping = () => {
    wsClient.send({ type: 'typing', conversation_id: conversation.id, is_typing: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      wsClient.send({ type: 'typing', conversation_id: conversation.id, is_typing: false });
    }, 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      await api.uploadFile(conversation.id, file);
    } catch {
      toast.error('File upload failed');
    }
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of convMessages) {
    const date = msg.created_at.split('T')[0];
    if (!grouped.length || grouped[grouped.length - 1].date !== date) {
      grouped.push({ date, messages: [msg] });
    } else {
      grouped[grouped.length - 1].messages.push(msg);
    }
  }

  const isOnline = otherUser ? (onlineUsers.has(otherUser.id) || otherUser.is_online) : false;

  const headerName = conversation.is_group
    ? conversation.name
    : otherUser?.display_name || 'Unknown';

  const headerSub = conversation.is_group
    ? `${conversation.members.length} members`
    : isOnline
      ? 'online'
      : otherUser?.last_seen
        ? `last seen ${format(new Date(otherUser.last_seen), 'MMM d, HH:mm')}`
        : '';

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface-alt)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
        <button onClick={onInfoClick} className="flex items-center gap-3 flex-1 hover:bg-gray-700/30 rounded-lg p-1 -m-1 transition-colors">
          <div className="relative">
            {conversation.is_group ? (
              <Avatar name={conversation.name || 'Group'} src={conversation.avatar_url} size={40} />
            ) : (
              <Avatar user={otherUser} size={40} />
            )}
            {!conversation.is_group && isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#202c33]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{headerName}</div>
            {typingList.length > 0 ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--accent)' }}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                </span>
                {conversation.is_group
                  ? `${conversation.members.find(m => m.user.id === typingList[0])?.user.display_name || 'Someone'} is typing...`
                  : 'typing...'}
              </div>
            ) : (
              <div className="flex items-center gap-2 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{headerSub}</span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ borderColor: 'rgba(37, 99, 235, 0.18)', backgroundColor: 'rgba(37, 99, 235, 0.09)', color: 'var(--accent)' }}>
                  Secure chat
                </span>
              </div>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors text-gray-400 hover:text-white" title="Video call (coming soon)">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors text-gray-400 hover:text-white" title="Voice call (coming soon)">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors text-gray-400 hover:text-white">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface-alt)' }}>
        {isLoadingMore && (
          <div className="py-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        )}
        {grouped.map(({ date, messages: dayMsgs }) => (
          <div key={date} className="animate-[fadeIn_180ms_ease-out]">
            <DateDivider date={date + 'T00:00:00'} />
            {dayMsgs.map((msg, idx) => {
              const prev = idx > 0 ? dayMsgs[idx - 1] : null;
              const showAvatar = !prev || prev.sender_id !== msg.sender_id;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user?.id}
                  showAvatar={showAvatar}
                  isGroup={conversation.is_group}
                  onReply={setReplyTo}
                />
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 p-2 bg-[#202c33] rounded-full shadow-lg text-white hover:bg-gray-700 transition-colors border border-gray-700">
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-3 border-t px-4 py-2" style={{ backgroundColor: isDark ? '#f1f5f9' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
          <div className="flex-1 border-l-2 border-green-400 pl-3">
            <div className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{replyTo.sender.display_name}</div>
            <div className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{replyTo.content || (replyTo.file_name ? `📎 ${replyTo.file_name}` : '')}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 pb-2" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface)' }}>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { setInput((i) => i + e); setShowEmoji(false); }}
                className="text-2xl hover:scale-125 transition-transform">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t px-4 py-2 text-[11px]" style={{ backgroundColor: isDark ? '#f1f5f9' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)', color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
          Messages are protected with mock end-to-end encryption
        </span>
        <span>{input.trim() ? 'Press Enter to send' : 'Use emoji, attachments, or quick replies'}</span>
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 border-t px-4 py-3" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
        <button onClick={() => setShowEmoji(!showEmoji)}
          className="flex-shrink-0 rounded-full p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <Smile className="w-5 h-5" />
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 rounded-full p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
          <Paperclip className="w-5 h-5" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          rows={1}
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors max-h-32 overflow-y-auto"
          style={{ backgroundColor: isDark ? '#f1f5f9' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)', color: 'var(--text-primary)', lineHeight: '1.4' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="flex-shrink-0 rounded-full p-2.5 text-white transition-all disabled:cursor-not-allowed disabled:opacity-30"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
