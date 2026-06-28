import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Conversation, Message } from '@/lib/types';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/ws';

interface AppState {
  user: User | null;
  token: string | null;
  theme: 'dark' | 'light';
  onboardingSeen: boolean;
  conversations: Conversation[];
  activeConvId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, Set<string>>;
  onlineUsers: Set<string>;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setOnboardingSeen: (seen: boolean) => void;
  setConversations: (convs: Conversation[]) => void;
  upsertConversation: (conv: Conversation) => void;
  setActiveConv: (id: string | null) => void;
  setMessages: (convId: string, messages: Message[]) => void;
  prependMessages: (convId: string, messages: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (msg: Partial<Message> & { id: string }) => void;
  deleteMessage: (convId: string, msgId: string) => void;
  setTyping: (convId: string, userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, online: boolean) => void;
  refreshConversation: (convId: string) => Promise<void>;
  refreshMessages: (convId: string) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      theme: 'light',
      onboardingSeen: false,
      conversations: [],
      activeConvId: null,
      messages: {},
      typingUsers: {},
      onlineUsers: new Set(),

      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        wsClient.connect(token);
        set({ user, token });
      },

      logout: () => {
        localStorage.removeItem('token');
        wsClient.disconnect();
        set({ user: null, token: null, conversations: [], messages: {}, activeConvId: null });
      },

      setTheme: (theme) => set({ theme }),
      setOnboardingSeen: (onboardingSeen) => set({ onboardingSeen }),

      setConversations: (conversations) => set({ conversations }),

      upsertConversation: (conv) => {
        const convs = get().conversations;
        const idx = convs.findIndex((c) => c.id === conv.id);
        if (idx >= 0) {
          const updated = [...convs];
          updated[idx] = conv;
          set({ conversations: updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) });
        } else {
          set({ conversations: [conv, ...convs] });
        }
      },

      setActiveConv: (id) => set({ activeConvId: id }),

      setMessages: (convId, messages) =>
        set((s) => ({ messages: { ...s.messages, [convId]: messages } })),

      prependMessages: (convId, messages) =>
        set((s) => ({
          messages: { ...s.messages, [convId]: [...messages, ...(s.messages[convId] || [])] },
        })),

      addMessage: (msg) => {
        set((s) => {
          const existing = s.messages[msg.conversation_id] || [];
          if (existing.find((m) => m.id === msg.id)) return s;
          const updated = [...existing, msg];
          return { messages: { ...s.messages, [msg.conversation_id]: updated } };
        });
      },

      updateMessage: (update) => {
        set((s) => {
          const updated: Record<string, Message[]> = {};
          for (const convId in s.messages) {
            updated[convId] = s.messages[convId].map((m) =>
              m.id === update.id ? { ...m, ...update } : m
            );
          }
          return { messages: updated };
        });
      },

      deleteMessage: (convId, msgId) => {
        set((s) => ({
          messages: {
            ...s.messages,
            [convId]: (s.messages[convId] || []).map((m) =>
              m.id === msgId ? { ...m, is_deleted: true, content: null } : m
            ),
          },
        }));
      },

      setTyping: (convId, userId, isTyping) => {
        set((s) => {
          const current = new Set(s.typingUsers[convId] || []);
          isTyping ? current.add(userId) : current.delete(userId);
          return { typingUsers: { ...s.typingUsers, [convId]: current } };
        });
      },

      setOnline: (userId, online) => {
        set((s) => {
          const next = new Set(s.onlineUsers);
          online ? next.add(userId) : next.delete(userId);
          return { onlineUsers: next };
        });
      },

      refreshConversation: async (convId) => {
        const conv = await api.getConversation(convId);
        get().upsertConversation(conv);
      },

      refreshMessages: async (convId) => {
        const messages = await api.getMessages(convId);
        get().setMessages(convId, messages);
      },
    }),
    {
      name: 'signal-store',
      partialize: (s) => ({ user: s.user, token: s.token, theme: s.theme, onboardingSeen: s.onboardingSeen }),
    }
  )
);
