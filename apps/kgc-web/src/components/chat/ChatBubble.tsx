import { useChatStore } from '@/stores/chat-store';
import { MessageCircle } from 'lucide-react';

export function ChatBubble() {
  const { toggleChat, chats } = useChatStore();

  const unreadCount = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <button
      onClick={toggleChat}
      className="relative flex h-14 w-14 items-center justify-center rounded-full bg-kgc-primary text-white shadow-lg transition-all hover:scale-105 hover:bg-kgc-primary/90 focus:outline-none focus:ring-2 focus:ring-kgc-primary focus:ring-offset-2"
      aria-label="Chat megnyitása"
    >
      <MessageCircle className="h-6 w-6" />

      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kgc-accent px-1.5 text-xs font-bold text-white animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
