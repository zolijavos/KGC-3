import { Button, Card, Input } from '@/components/ui';
import { useState } from 'react';
import { CURRENT_USER, MOCK_CHATS, MOCK_MESSAGES, MOCK_USERS } from './mock-data';
import type { ChatMessage } from './types';

export function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(MOCK_CHATS[0]?.id ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(MOCK_MESSAGES);

  const selectedChat = MOCK_CHATS.find(c => c.id === selectedChatId);

  const filteredChats = MOCK_CHATS.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const currentMessages = selectedChatId ? (messages[selectedChatId] ?? []) : [];

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

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChatId) return;

    const newMessage: ChatMessage = {
      id: `msg-new-${Date.now()}`,
      chatId: selectedChatId,
      senderId: CURRENT_USER.id,
      senderName: CURRENT_USER.name,
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
      isOwn: true,
    };

    setMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] ?? []), newMessage],
    }));
    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] kgc-bg">
      {/* Chat List Sidebar */}
      <div className="w-80 flex-shrink-0 border-r kgc-card-bg dark:border-slate-700">
        {/* Header */}
        <div className="border-b p-4 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chat</h1>
            <Button size="sm" className="bg-kgc-primary hover:bg-kgc-primary/90">
              + Új
            </Button>
          </div>
          <Input
            type="search"
            placeholder="Keresés..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Chat List */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 120px)' }}>
          {filteredChats.map(chat => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full p-3 text-left border-b transition-colors dark:border-slate-700 ${
                selectedChatId === chat.id
                  ? 'bg-kgc-primary/10 border-l-4 border-l-kgc-primary'
                  : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-start gap-3">
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
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800 ${getStatusColor(
                        chat.participants[1]?.status ?? 'offline'
                      )}`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {chat.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatTime(chat.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex flex-1 flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b p-4 kgc-card-bg dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white ${
                    selectedChat.type === 'group' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}
                >
                  {selectedChat.type === 'group' ? (
                    <span className="text-xs">{selectedChat.participants.length}</span>
                  ) : (
                    getInitials(selectedChat.name)
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedChat.name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedChat.type === 'group'
                      ? `${selectedChat.participants.length} résztvevő`
                      : selectedChat.participants[1]?.status === 'online'
                        ? 'Online'
                        : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" title="Hívás">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" title="Információ">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentMessages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${message.isOwn ? 'order-2' : ''}`}>
                    {!message.isOwn && selectedChat.type === 'group' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                        {message.senderName}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        message.isOwn
                          ? 'bg-kgc-primary text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p
                      className={`text-xs text-gray-400 mt-1 ${message.isOwn ? 'text-right mr-1' : 'ml-1'}`}
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
            </div>

            {/* Message Input */}
            <div className="border-t p-4 kgc-card-bg dark:border-slate-700">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" title="Csatolmány">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                </Button>
                <Input
                  placeholder="Írj üzenetet..."
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="bg-kgc-primary hover:bg-kgc-primary/90"
                >
                  Küldés
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Válassz egy beszélgetést
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Válassz ki egy meglévő beszélgetést a bal oldalon, vagy indíts újat.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Online Users Sidebar (Optional - shown on wider screens) */}
      <div className="hidden xl:block w-64 border-l kgc-card-bg dark:border-slate-700">
        <div className="p-4 border-b dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Online kollégák</h3>
        </div>
        <div className="p-2">
          {MOCK_USERS.filter(u => u.status === 'online').map(user => (
            <button
              key={user.id}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="relative">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
                  {getInitials(user.name)}
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-800 ${getStatusColor(user.status)}`}
                />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
