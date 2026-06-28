'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { ConversationItem } from './ConversationItem';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { User, Conversation } from '@/lib/types';
import {
  MessageSquare, Users, Phone, Settings, Search, X,
  PenSquare, ChevronLeft, UserPlus, UsersRound, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'chats' | 'contacts' | 'newContact' | 'newGroup';

interface Props {
  onSelectConv: (conv: Conversation) => void;
  activeConvId: string | null;
}

export function Sidebar({ onSelectConv, activeConvId }: Props) {
  const { user, conversations, setConversations, upsertConversation, theme } = useStore();
  const isDark = theme === 'dark';
  const [view, setView] = useState<View>('chats');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [contacts, setContacts] = useState<{ id: string; contact: User; nickname: string | null }[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [newNick, setNewNick] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<User[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.getConversations().then(setConversations);
    api.getContacts().then(setContacts);
  }, []);

  // Search users/convs
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const results = await api.searchUsers(search).catch(() => []);
      setSearchResults(results);
    }, 300);
  }, [search]);

  // Member search for group
  useEffect(() => {
    if (!memberSearch.trim()) { setMemberResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const results = await api.searchUsers(memberSearch).catch(() => []);
      setMemberResults(results);
    }, 300);
  }, [memberSearch]);

  const filteredConvs = search.trim()
    ? conversations.filter((c) => {
        const name = c.is_group ? c.name : c.members.find(m => m.user.id !== user?.id)?.user.display_name;
        return name?.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  const handleAddContact = async () => {
    try {
      const c = await api.addContact(newPhone, newNick || undefined);
      setContacts((prev) => [...prev, c]);
      setNewPhone(''); setNewNick('');
      toast.success('Contact added!');
      setView('contacts');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) {
      toast.error('Add a name and at least one member');
      return;
    }
    try {
      const conv = await api.createGroup(groupName, groupMembers.map(m => m.id), groupDesc || undefined);
      upsertConversation(conv);
      setGroupName(''); setGroupDesc(''); setGroupMembers([]);
      setView('chats');
      onSelectConv(conv);
      toast.success('Group created!');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleOpenDM = async (targetUser: User) => {
    try {
      const conv = await api.getDM(targetUser.id);
      upsertConversation(conv);
      onSelectConv(conv);
      setView('chats');
      setSearch('');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex flex-col h-full w-[380px] flex-shrink-0 border-r transition-colors" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface)' }}>
        {view !== 'chats' ? (
          <button onClick={() => { setView('chats'); setSearch(''); }} className="text-gray-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={() => setShowSettings(!showSettings)} className="flex-shrink-0">
            <Avatar user={user} size={36} />
          </button>
        )}
        <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {view === 'chats' ? 'Signal' : view === 'contacts' ? 'Contacts' : view === 'newContact' ? 'New Contact' : 'New Group'}
        </span>
        <div className="flex items-center gap-1">
          {view === 'chats' && (
            <>
              <button onClick={() => setView('newGroup')} className="rounded-full p-2 transition-colors" style={{ color: 'var(--text-muted)' }} title="New group">
                <UsersRound className="w-5 h-5" />
              </button>
              <button onClick={() => setView('newContact')} className="rounded-full p-2 transition-colors" style={{ color: 'var(--text-muted)' }} title="New chat">
                <PenSquare className="w-5 h-5" />
              </button>
            </>
          )}
          {view === 'contacts' && (
            <button onClick={() => setView('newContact')} className="rounded-full p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <UserPlus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && view === 'chats' && (
        <SettingsPanel user={user} onClose={() => setShowSettings(false)} />
      )}

      {/* Search */}
      {(view === 'chats' || view === 'contacts') && (
        <div className="px-3 py-2" style={{ backgroundColor: isDark ? '#f8fafc' : 'var(--surface)' }}>
          <div className="flex items-center gap-2 rounded-full px-4 py-2 border" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={view === 'chats' ? 'Search or start new chat' : 'Search contacts'}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'chats' && (
          <>
            <div className="px-3 py-3 border-b" style={{ borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
              <div className="rounded-2xl border p-3" style={{ backgroundColor: isDark ? '#ffffff' : 'var(--surface-alt)', borderColor: isDark ? '#dbeafe' : 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="rounded-full p-1.5" style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: 'var(--accent)' }}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Secure conversations</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Private by design • Mock encryption active</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setView('newContact')} className="flex-1 rounded-full px-3 py-1.5 text-sm font-medium text-white transition-colors" style={{ backgroundColor: 'var(--accent)' }}>
                    New chat
                  </button>
                  <button onClick={() => setView('newGroup')} className="flex-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    New group
                  </button>
                </div>
              </div>
            </div>
            {search && searchResults.length > 0 && (
              <div className="px-4 py-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>People</div>
            )}
            {search && searchResults.map((u) => (
              <div key={u.id} onClick={() => handleOpenDM(u)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#1d2b34] cursor-pointer border-b border-gray-700/20">
                <Avatar user={u} size={40} />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.display_name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.phone}</div>
                </div>
              </div>
            ))}
            {search && searchResults.length > 0 && filteredConvs.length > 0 && (
              <div className="px-4 py-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Conversations</div>
            )}
            {filteredConvs.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConvId}
                onClick={() => onSelectConv(conv)}
              />
            ))}
            {filteredConvs.length === 0 && !search && (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center" style={{ color: 'var(--text-muted)' }}>
                <div className="mb-3 rounded-full border p-3" style={{ borderColor: isDark ? '#e2e8f0' : 'var(--border)', backgroundColor: isDark ? '#ffffff' : 'var(--surface-alt)', color: 'var(--accent)' }}>
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No conversations yet</div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Start a private chat or create a group to get going.</div>
              </div>
            )}
          </>
        )}

        {view === 'contacts' && (
          <>
            {contacts.map((c) => (
              <div key={c.id} onClick={() => handleOpenDM(c.contact)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#1d2b34] cursor-pointer border-b border-gray-700/20">
                <Avatar user={c.contact} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.nickname || c.contact.display_name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.contact.phone}</div>
                </div>
                {(c.contact.is_online) && (
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                )}
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                No contacts yet
              </div>
            )}
          </>
        )}

        {view === 'newContact' && (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter the phone number of the person you want to add.</p>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-[#2a3942] text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-transparent focus:border-[#00a884] transition-colors" />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Nickname (optional)</label>
              <input value={newNick} onChange={(e) => setNewNick(e.target.value)}
                placeholder="Nickname"
                className="w-full bg-[#2a3942] text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-transparent focus:border-[#00a884] transition-colors" />
            </div>
            <button onClick={handleAddContact} disabled={!newPhone.trim()}
              className="w-full py-2.5 bg-[#00a884] text-white rounded-full font-medium hover:bg-[#00c19e] disabled:opacity-40 transition-colors">
              Add Contact
            </button>
          </div>
        )}

        {view === 'newGroup' && (
          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Group Name</label>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full bg-[#2a3942] text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-transparent focus:border-[#00a884] transition-colors" />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Description (optional)</label>
              <input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="Group description"
                className="w-full bg-[#2a3942] text-white rounded-lg px-4 py-2.5 text-sm outline-none border border-transparent focus:border-[#00a884] transition-colors" />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Add Members</label>
              <div className="mb-2 flex items-center gap-2 rounded-lg border px-4 py-2.5" style={{ backgroundColor: isDark ? '#f1f5f9' : 'var(--surface-alt)', borderColor: isDark ? '#e2e8f0' : 'var(--border)' }}>
                <Search className="w-4 h-4 text-gray-500" />
                <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search people"
                  className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
              </div>
              {memberResults.map((u) => (
                <div key={u.id} onClick={() => { if (!groupMembers.find(m => m.id === u.id)) setGroupMembers(prev => [...prev, u]); setMemberSearch(''); setMemberResults([]); }}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors" style={{ backgroundColor: 'transparent' }}>
                  <Avatar user={u} size={32} />
                  <div className="text-sm text-white">{u.display_name}</div>
                  {groupMembers.find(m => m.id === u.id) && <span className="ml-auto text-green-400 text-xs">Added</span>}
                </div>
              ))}
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {groupMembers.map((m) => (
                    <span key={m.id} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs" style={{ backgroundColor: isDark ? '#f1f5f9' : 'var(--surface-alt)', color: 'var(--text-primary)' }}>
                      {m.display_name}
                      <button onClick={() => setGroupMembers(prev => prev.filter(x => x.id !== m.id))} className="text-gray-400 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleCreateGroup} disabled={!groupName.trim() || groupMembers.length === 0}
              className="w-full py-2.5 bg-[#00a884] text-white rounded-full font-medium hover:bg-[#00c19e] disabled:opacity-40 transition-colors">
              Create Group
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="flex items-center justify-around py-2 bg-[#202c33] border-t border-gray-700/30">
        <NavBtn icon={<MessageSquare className="w-5 h-5" />} label="Chats" active={view === 'chats'} onClick={() => setView('chats')} />
        <NavBtn icon={<Users className="w-5 h-5" />} label="Contacts" active={view === 'contacts'} onClick={() => setView('contacts')} />
        <NavBtn icon={<Phone className="w-5 h-5" />} label="Calls" active={false} onClick={() => toast('Coming soon', { icon: '📞' })} />
        <NavBtn icon={<Settings className="w-5 h-5" />} label="Settings" active={showSettings} onClick={() => setShowSettings(!showSettings)} />
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${active ? 'text-[#00a884]' : 'text-gray-400 hover:text-white'}`}>
      {icon}
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

function SettingsPanel({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { logout, setAuth } = useStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [about, setAbout] = useState(user?.about || '');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateMe({ display_name: displayName, about });
      const token = localStorage.getItem('token') || '';
      setAuth(updated, token);
      toast.success('Profile updated!');
      onClose();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadAvatar(file);
      const token = localStorage.getItem('token') || '';
      const me = await api.me();
      setAuth(me, token);
      toast.success('Avatar updated!');
    } catch { toast.error('Upload failed'); }
  };

  return (
    <div className="bg-[#111b21] border-b border-gray-700/30 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => fileInputRef.current?.click()} className="relative group">
          <Avatar user={user} size={64} />
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs">Edit</span>
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
        <div>
          <div className="text-white font-medium">{user?.display_name}</div>
          <div className="text-sm text-gray-400">{user?.phone}</div>
        </div>
      </div>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name"
        className="w-full bg-[#2a3942] text-white rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus:border-[#00a884]" />
      <input value={about} onChange={(e) => setAbout(e.target.value)}
        placeholder="About"
        className="w-full bg-[#2a3942] text-white rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus:border-[#00a884]" />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2 bg-[#00a884] text-white rounded-full text-sm font-medium hover:bg-[#00c19e] disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={logout}
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-sm hover:bg-red-500/30 transition-colors">
          Logout
        </button>
      </div>
    </div>
  );
}
