import { AuthResponse, Contact, Conversation, Message, User } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data: { phone: string; display_name: string; password: string; otp: string; username?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (phone: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  me: () => request<User>('/auth/me'),
  updateMe: (data: Partial<{ display_name: string; about: string; username: string }>) =>
    request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Users
  searchUsers: (q: string) => request<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
  getUser: (id: string) => request<User>(`/users/${id}`),

  // Avatar upload
  uploadAvatar: async (file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/api/auth/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json() as Promise<{ avatar_url: string }>;
  },

  // Contacts
  getContacts: () => request<Contact[]>('/contacts'),
  addContact: (phone: string, nickname?: string) =>
    request<Contact>('/contacts', { method: 'POST', body: JSON.stringify({ phone, nickname }) }),
  deleteContact: (id: string) => request<void>(`/contacts/${id}`, { method: 'DELETE' }),

  // Conversations
  getConversations: () => request<Conversation[]>('/conversations'),
  getConversation: (id: string) => request<Conversation>(`/conversations/${id}`),
  getDM: (userId: string) => request<Conversation>(`/conversations/dm/${userId}`, { method: 'POST' }),
  createGroup: (name: string, member_ids: string[], description?: string) =>
    request<Conversation>('/conversations/group', { method: 'POST', body: JSON.stringify({ name, member_ids, description }) }),
  updateGroup: (id: string, data: { name?: string; description?: string }) =>
    request<Conversation>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addMember: (conv_id: string, user_id: string) =>
    request<void>(`/conversations/${conv_id}/members/${user_id}`, { method: 'POST' }),
  removeMember: (conv_id: string, user_id: string) =>
    request<void>(`/conversations/${conv_id}/members/${user_id}`, { method: 'DELETE' }),

  // Messages
  getMessages: (conv_id: string, skip = 0, limit = 50) =>
    request<Message[]>(`/conversations/${conv_id}/messages?skip=${skip}&limit=${limit}`),
  sendMessage: (conv_id: string, data: { content?: string; message_type?: string; reply_to_id?: string; disappear_after?: number }) =>
    request<Message>(`/conversations/${conv_id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  deleteMessage: (conv_id: string, msg_id: string) =>
    request<void>(`/conversations/${conv_id}/messages/${msg_id}`, { method: 'DELETE' }),
  reactToMessage: (conv_id: string, msg_id: string, emoji: string) =>
    request<void>(`/conversations/${conv_id}/messages/${msg_id}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  markRead: (conv_id: string, msg_id: string) =>
    request<void>(`/conversations/${conv_id}/messages/${msg_id}/read`, { method: 'POST' }),

  // File upload
  uploadFile: async (conv_id: string, file: File) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/api/conversations/${conv_id}/messages/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json() as Promise<Message>;
  },
};
