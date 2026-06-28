'use client';
import { useState } from 'react';
import { Conversation, User } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { X, Crown, UserMinus, UserPlus, Search, Edit2, Check, ShieldCheck, BellRing, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export function ConversationInfo({ conversation, onClose }: Props) {
  const { user, refreshConversation, theme } = useStore();
  const isDark = theme === 'dark';
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversation.name || '');
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [disappearing, setDisappearing] = useState(false);

  const otherUser = !conversation.is_group
    ? conversation.members.find((m) => m.user.id !== user?.id)?.user
    : null;

  const isAdmin = conversation.members.find(m => m.user.id === user?.id)?.is_admin;

  const handleSearchMembers = async (q: string) => {
    setMemberSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const results = await api.searchUsers(q).catch(() => []);
    setSearchResults(results.filter(u => !conversation.members.find(m => m.user.id === u.id)));
  };

  const handleAddMember = async (u: User) => {
    try {
      await api.addMember(conversation.id, u.id);
      await refreshConversation(conversation.id);
      setMemberSearch(''); setSearchResults([]);
      toast.success(`${u.display_name} added`);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.removeMember(conversation.id, userId);
      await refreshConversation(conversation.id);
      toast.success('Member removed');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdateName = async () => {
    if (!groupName.trim()) return;
    try {
      await api.updateGroup(conversation.id, { name: groupName });
      await refreshConversation(conversation.id);
      setEditingName(false);
      toast.success('Group name updated');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex h-full w-[340px] flex-col border-l transition-colors" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface)' }}>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{conversation.is_group ? 'Group Info' : 'Contact Info'}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile header */}
        <div className="flex flex-col items-center gap-3 px-4 py-8" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface)' }}>
          {conversation.is_group ? (
            <Avatar name={conversation.name || 'G'} src={conversation.avatar_url} size={80} />
          ) : (
            <Avatar user={otherUser} size={80} />
          )}
          {conversation.is_group && editingName ? (
            <div className="flex items-center gap-2">
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
                className="bg-[#2a3942] text-white rounded px-3 py-1 text-sm outline-none border border-[#00a884]"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()} />
              <button onClick={handleUpdateName} className="text-[#00a884]"><Check className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{conversation.is_group ? conversation.name : otherUser?.display_name}</h2>
              {conversation.is_group && isAdmin && (
                <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-white">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {conversation.is_group
              ? `${conversation.members.length} members`
              : otherUser?.phone}
          </p>
          {!conversation.is_group && otherUser?.about && (
            <p className="text-sm text-gray-300 text-center">{otherUser.about}</p>
          )}
          {conversation.is_group && conversation.description && (
            <p className="text-sm text-gray-300 text-center">{conversation.description}</p>
          )}
        </div>

        {/* DM info */}
        {!conversation.is_group && otherUser && (
          <div className="p-4 flex flex-col gap-1">
            <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface-alt)' }}>
              <div className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>About</div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{otherUser.about || 'Hey there! I am using Signal.'}</div>
            </div>
            <div className="bg-[#202c33] rounded-xl p-4 mt-2">
              <div className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>Phone</div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{otherUser.phone}</div>
            </div>
            {otherUser.username && (
              <div className="bg-[#202c33] rounded-xl p-4 mt-2">
                <div className="text-xs text-gray-500 mb-1">Username</div>
                <div className="text-sm text-white">@{otherUser.username}</div>
              </div>
            )}
          </div>
        )}

        {/* Group members */}
        {conversation.is_group && (
          <div className="p-4">
            <div className="mb-3 px-1 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{conversation.members.length} Members</div>

            {isAdmin && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2" style={{ backgroundColor: isDark ? '#f1f5f9' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
                <Search className="w-4 h-4 text-gray-500" />
                <input value={memberSearch} onChange={(e) => handleSearchMembers(e.target.value)}
                  placeholder="Add member..."
                  className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
            )}

            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-2 py-2 hover:bg-[#1d2b34] cursor-pointer rounded-lg">
                <Avatar user={u} size={36} />
                <div className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{u.display_name}</div>
                <button onClick={() => handleAddMember(u)} className="text-[#00a884] hover:text-[#00c19e]">
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))}

            {conversation.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[#1d2b34]">
                <Avatar user={member.user} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {member.user.id === user?.id ? 'You' : member.user.display_name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{member.user.phone}</div>
                </div>
                {member.is_admin && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                )}
                {isAdmin && member.user.id !== user?.id && (
                  <button onClick={() => handleRemoveMember(member.user.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors ml-1">
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Placeholders */}
        <div className="p-4 flex flex-col gap-3">
          <div className="rounded-2xl border p-4" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-[#00a884]" />
              Privacy & notifications
            </div>
            <div className="mt-3 space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <button onClick={() => setNotificationsMuted((v) => !v)} className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
                <span className="flex items-center gap-2"><BellRing className="w-4 h-4" />Mute notifications</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${notificationsMuted ? 'bg-[#00a884] text-white' : 'bg-gray-700 text-gray-300'}`}>{notificationsMuted ? 'On' : 'Off'}</span>
              </button>
              <button onClick={() => setReadReceipts((v) => !v)} className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
                <span className="flex items-center gap-2"><EyeOff className="w-4 h-4" />Read receipts</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${readReceipts ? 'bg-[#00a884] text-white' : 'bg-gray-700 text-gray-300'}`}>{readReceipts ? 'Enabled' : 'Hidden'}</span>
              </button>
              <button onClick={() => setDisappearing((v) => !v)} className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Disappearing messages</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${disappearing ? 'bg-[#00a884] text-white' : 'bg-gray-700 text-gray-300'}`}>{disappearing ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
          <div className="rounded-2xl border p-3 text-sm" style={{ backgroundColor: 'rgba(37, 99, 235, 0.09)', borderColor: 'rgba(37, 99, 235, 0.18)', color: 'var(--accent)' }}>
            <div className="font-medium">Secure by default</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>This view is intentionally styled to feel like Signal’s privacy-first controls.</div>
          </div>
          {conversation.is_group && (
            <div className="rounded-2xl border p-4 opacity-70" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
              <div className="text-sm text-white">🔗 Invite Link</div>
              <div className="text-xs text-gray-500 mt-0.5">Coming soon</div>
            </div>
          )}
          <div className="rounded-xl p-4 cursor-pointer transition-colors" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
            onClick={() => toast('Coming soon', { icon: '🚧' })}>
            <div className="text-sm text-red-400">
              {conversation.is_group ? '🚪 Leave Group' : '🚫 Block Contact'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
