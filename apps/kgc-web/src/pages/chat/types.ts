// Chat típusok

export type ChatType = 'direct' | 'group';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  role?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
  isOwn?: boolean;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  participants: ChatUser[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}
