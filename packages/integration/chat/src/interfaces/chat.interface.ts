/**
 * Chat interfaces for @kgc/chat
 */

/**
 * Message status tracking
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * User online status
 */
export type UserStatus = 'online' | 'away' | 'offline';

/**
 * Conversation type
 */
export type ConversationType = 'direct' | 'group';

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  /** Tenant scope */
  tenantId: string;
}

/**
 * Conversation interface
 */
export interface Conversation {
  id: string;
  type: ConversationType;
  /** Participant user IDs */
  participantIds: string[];
  /** Last message in conversation */
  lastMessageId?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  /** Tenant scope */
  tenantId: string;
}

/**
 * Chat participant with status
 */
export interface ChatParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  lastSeenAt?: Date;
}

/**
 * Typing indicator event
 */
export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

/**
 * Message read receipt
 */
export interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: Date;
}

/**
 * Create message input
 */
export interface CreateMessageInput {
  conversationId: string;
  content: string;
}

/**
 * Start conversation input
 */
export interface StartConversationInput {
  participantIds: string[];
  type?: ConversationType;
  initialMessage?: string;
}

/**
 * Message list options
 */
export interface MessageListOptions {
  conversationId: string;
  limit?: number;
  before?: Date;
  after?: Date;
}

/**
 * Unread count per conversation
 */
export interface UnreadCount {
  conversationId: string;
  count: number;
}

/**
 * Chat service interface
 */
export interface IChatService {
  /** Start a new conversation */
  startConversation(userId: string, input: StartConversationInput): Promise<Conversation>;

  /** Get user's conversations */
  getConversations(userId: string): Promise<Conversation[]>;

  /** Get conversation by ID */
  getConversation(userId: string, conversationId: string): Promise<Conversation | null>;

  /** Send a message */
  sendMessage(userId: string, input: CreateMessageInput): Promise<ChatMessage>;

  /** Get messages in a conversation */
  getMessages(userId: string, options: MessageListOptions): Promise<ChatMessage[]>;

  /** Mark messages as read */
  markAsRead(userId: string, conversationId: string): Promise<void>;

  /** Get unread counts */
  getUnreadCounts(userId: string): Promise<UnreadCount[]>;
}

/**
 * WebSocket events emitted by server
 */
export enum ChatServerEvent {
  MESSAGE_NEW = 'message:new',
  MESSAGE_STATUS = 'message:status',
  TYPING = 'typing',
  USER_STATUS = 'user:status',
  CONVERSATION_UPDATED = 'conversation:updated',
  ERROR = 'error',
}

/**
 * WebSocket events emitted by client
 */
export enum ChatClientEvent {
  JOIN_CONVERSATION = 'join:conversation',
  LEAVE_CONVERSATION = 'leave:conversation',
  SEND_MESSAGE = 'send:message',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  MARK_READ = 'mark:read',
}
