'use client';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { wsClient } from '@/lib/ws';
import { api } from '@/lib/api';
import { WSEvent } from '@/lib/types';

export function WSProvider({ children }: { children: React.ReactNode }) {
  const { token, user, addMessage, deleteMessage, updateMessage, setTyping, setOnline, upsertConversation, refreshConversation, refreshMessages } = useStore();

  useEffect(() => {
    if (!token) return;
    wsClient.connect(token);

    const off = wsClient.on(async (event: WSEvent) => {
      switch (event.type) {
        case 'new_message': {
          const msg = event.data;
          addMessage(msg);
          // Update conversation last message
          refreshConversation(msg.conversation_id);
          break;
        }
        case 'message_deleted':
          deleteMessage(event.data.conversation_id, event.data.id);
          break;
        case 'message_read': {
          updateMessage({ id: event.data.message_id, status: 'read' });
          break;
        }
        case 'reaction_update':
          refreshMessages(event.data.conversation_id);
          break;
        case 'typing':
          setTyping(event.data.conversation_id, event.data.user_id, event.data.is_typing);
          if (event.data.is_typing) {
            setTimeout(() => setTyping(event.data.conversation_id, event.data.user_id, false), 3000);
          }
          break;
        case 'user_online':
          setOnline(event.data.user_id, event.data.is_online);
          break;
      }
    });

    return () => {
      off();
    };
  }, [token]);

  return <>{children}</>;
}
