'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatPane } from '@/components/chat/ChatPane';
import { ConversationInfo } from '@/components/chat/ConversationInfo';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { Conversation } from '@/lib/types';

export default function ChatPage() {
  const router = useRouter();
  const { token, conversations, activeConvId, setConversations, setActiveConv } = useStore();
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }

    api.getConversations()
      .then((data) => {
        setConversations(data);
        if (!activeConvId && data[0]) {
          setActiveConv(data[0].id);
        } else if (activeConvId && !data.some((conv) => conv.id === activeConvId)) {
          setActiveConv(data[0]?.id ?? null);
        }
      })
      .catch(() => {
        setConversations([]);
      });
  }, [token, activeConvId, router, setConversations, setActiveConv]);

  const selectedConversation = useMemo(() => {
    return conversations.find((conv) => conv.id === activeConvId) || conversations[0] || null;
  }, [conversations, activeConvId]);

  const handleSelectConv = (conversation: Conversation) => {
    setActiveConv(conversation.id);
    setShowInfo(false);
  };

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <Sidebar onSelectConv={handleSelectConv} activeConvId={activeConvId} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {selectedConversation ? (
          <>
            <ChatPane conversation={selectedConversation} onInfoClick={() => setShowInfo(true)} />
            {showInfo && <ConversationInfo conversation={selectedConversation} onClose={() => setShowInfo(false)} />}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0d1117] px-6 text-center">
            <div className="rounded-full bg-[#202c33] p-4 text-[#00a884]">
              <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current">
                <path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 2v2l5 3 5-3V8H6Zm0 4v2h12v-2l-6 3-6-3Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">No conversation selected</h2>
              <p className="mt-2 text-sm text-gray-400">Start a chat or create a new group from the sidebar.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
