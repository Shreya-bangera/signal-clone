export interface User {
  id: string;
  phone: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  about: string | null;
  is_online: boolean;
  last_seen: string;
}

export interface Contact {
  id: string;
  contact: User;
  nickname: string | null;
}

export interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  user: User;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User;
  content: string | null;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  reply_to: Message | null;
  is_deleted: boolean;
  disappear_after: number | null;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'received';
  reactions: Reaction[];
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  user: User;
  is_admin: boolean;
  joined_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  name: string | null;
  avatar_url: string | null;
  description: string | null;
  created_by: string | null;
  members: Member[];
  last_message: Message | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type WSEvent =
  | { type: 'new_message'; data: Message }
  | { type: 'message_deleted'; data: { id: string; conversation_id: string } }
  | { type: 'message_read'; data: { message_id: string; conversation_id: string; reader_id: string } }
  | { type: 'reaction_update'; data: { message_id: string; conversation_id: string } }
  | { type: 'typing'; data: { user_id: string; conversation_id: string; is_typing: boolean } }
  | { type: 'user_online'; data: { user_id: string; is_online: boolean } }
  | { type: 'pong' };
