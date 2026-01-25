import { useChatStore } from '@/stores/chat-store';
import { ChatBubble } from './ChatBubble';
import { ChatWindow } from './ChatWindow';

export function FloatingChat() {
  const { isOpen, isMinimized } = useChatStore();

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {isOpen && !isMinimized ? <ChatWindow /> : <ChatBubble />}
    </div>
  );
}
