import { CURRENT_USER, MOCK_CHATS, MOCK_MESSAGES } from '@/pages/chat/mock-data';
import type { Chat, ChatMessage } from '@/pages/chat/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatState {
  // Widget állapot
  isOpen: boolean;
  isMinimized: boolean;

  // Aktív chat
  selectedChatId: string | null;

  // Adatok
  chats: Chat[];
  messages: Record<string, ChatMessage[]>;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  minimizeChat: () => void;
  maximizeChat: () => void;
  selectChat: (chatId: string | null) => void;
  sendMessage: (content: string) => void;
  getTotalUnreadCount: () => number;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isMinimized: true,
      selectedChatId: null,
      chats: MOCK_CHATS,
      messages: MOCK_MESSAGES,

      openChat: () => set({ isOpen: true, isMinimized: false }),

      closeChat: () => set({ isOpen: false, isMinimized: true, selectedChatId: null }),

      toggleChat: () => {
        const state = get();
        if (state.isMinimized) {
          set({ isOpen: true, isMinimized: false });
        } else {
          set({ isMinimized: true });
        }
      },

      minimizeChat: () => set({ isMinimized: true }),

      maximizeChat: () => set({ isOpen: true, isMinimized: false }),

      selectChat: (chatId: string | null) => {
        if (chatId) {
          // Olvasatlan üzenetek nullázása a kiválasztott chat-nél
          set(state => ({
            selectedChatId: chatId,
            chats: state.chats.map(chat =>
              chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
            ),
          }));
        } else {
          set({ selectedChatId: null });
        }
      },

      sendMessage: (content: string) => {
        const state = get();
        if (!state.selectedChatId || !content.trim()) return;

        const newMessage: ChatMessage = {
          id: `msg-new-${Date.now()}`,
          chatId: state.selectedChatId,
          senderId: CURRENT_USER.id,
          senderName: CURRENT_USER.name,
          content: content.trim(),
          timestamp: new Date().toISOString(),
          status: 'sent',
          isOwn: true,
        };

        set(state => ({
          messages: {
            ...state.messages,
            [state.selectedChatId!]: [...(state.messages[state.selectedChatId!] ?? []), newMessage],
          },
          chats: state.chats.map(chat =>
            chat.id === state.selectedChatId
              ? { ...chat, lastMessage: newMessage, updatedAt: newMessage.timestamp }
              : chat
          ),
        }));
      },

      getTotalUnreadCount: () => {
        return get().chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      },
    }),
    {
      name: 'kgc-chat',
      partialize: state => ({
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        selectedChatId: state.selectedChatId,
      }),
    }
  )
);
