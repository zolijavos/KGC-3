import { Button, Input } from '@/components/ui';
import { useChatStore } from '@/stores/chat-store';
import { ArrowLeft, Minus, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ChatWindow() {
  const { chats, messages, selectedChatId, selectChat, sendMessage, minimizeChat, closeChat } =
    useChatStore();

  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const currentMessages = selectedChatId ? (messages[selectedChatId] ?? []) : [];

  const sortedChats = [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Auto-scroll üzeneteknél
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  // ESC billentyű kezelés
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedChatId) {
          selectChat(null);
        } else {
          minimizeChat();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChatId, selectChat, minimizeChat]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendMessage(messageInput);
    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex h-[500px] w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-kgc-primary px-3 py-2 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {selectedChatId && (
            <button
              onClick={() => selectChat(null)}
              className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h3 className="font-semibold text-white">{selectedChat ? selectedChat.name : 'Chat'}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={minimizeChat}
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
            title="Minimalizálás"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={closeChat}
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
            title="Bezárás"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!selectedChatId ? (
        // Chat lista
        <div className="flex-1 overflow-y-auto">
          {sortedChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className="flex w-full items-start gap-3 border-b border-gray-100 p-3 text-left transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white ${
                    chat.type === 'group' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}
                >
                  {chat.type === 'group' ? (
                    <span className="text-xs">{chat.participants.length}</span>
                  ) : (
                    getInitials(chat.name)
                  )}
                </div>
                {chat.type === 'direct' && (
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-800 ${getStatusColor(
                      chat.participants[1]?.status ?? 'offline'
                    )}`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {chat.name}
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(chat.updatedAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                    {chat.lastMessage?.isOwn && <span className="text-gray-400">Te: </span>}
                    {chat.lastMessage?.content ?? 'Nincs üzenet'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-kgc-primary px-1.5 text-xs font-medium text-white">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        // Aktív beszélgetés
        <>
          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {currentMessages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.isOwn ? 'order-2' : ''}`}>
                  {!message.isOwn && selectedChat?.type === 'group' && (
                    <p className="mb-1 ml-1 text-xs text-gray-500 dark:text-gray-400">
                      {message.senderName}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      message.isOwn
                        ? 'rounded-br-md bg-kgc-primary text-white'
                        : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-slate-700 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  </div>
                  <p
                    className={`mt-1 text-xs text-gray-400 ${
                      message.isOwn ? 'mr-1 text-right' : 'ml-1'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                    {message.isOwn && (
                      <span className="ml-1">
                        {message.status === 'read'
                          ? '✓✓'
                          : message.status === 'delivered'
                            ? '✓✓'
                            : '✓'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-2 dark:border-slate-700">
            <div className="flex gap-2">
              <Input
                placeholder="Írj üzenetet..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                size="sm"
                className="bg-kgc-primary px-3 hover:bg-kgc-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
