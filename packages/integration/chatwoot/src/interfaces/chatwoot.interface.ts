/**
 * @kgc/chatwoot - Chatwoot Interfaces
 * Epic 29: Chatwoot Integration
 */

export enum TicketStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketSource {
  CHAT = 'CHAT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  WEB_FORM = 'WEB_FORM',
  API = 'API',
}

export enum EscalationReason {
  COMPLEX_ISSUE = 'COMPLEX_ISSUE',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  SLA_BREACH = 'SLA_BREACH',
  AI_CONFIDENCE_LOW = 'AI_CONFIDENCE_LOW',
  SENTIMENT_NEGATIVE = 'SENTIMENT_NEGATIVE',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
}

export interface ITicket {
  id: string;
  tenantId: string;
  chatwootConversationId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface ITicketMessage {
  id: string;
  ticketId: string;
  chatwootMessageId: string;
  content: string;
  contentType: 'text' | 'html' | 'attachment';
  senderType: 'customer' | 'agent' | 'bot';
  senderId: string;
  senderName: string;
  attachments?: IAttachment[];
  createdAt: Date;
}

export interface IAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export interface IAgent {
  id: string;
  chatwootAgentId: string;
  name: string;
  email: string;
  role: 'agent' | 'admin';
  isOnline: boolean;
  activeTicketCount: number;
}

export interface IEscalation {
  id: string;
  tenantId: string;
  ticketId: string;
  fromAgentId?: string;
  toAgentId?: string;
  reason: EscalationReason;
  notes?: string;
  aiAnalysis?: IAiAnalysis;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IAiAnalysis {
  confidence: number;
  intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedCategory?: string;
  suggestedPriority?: TicketPriority;
  suggestedResponse?: string;
  entities?: IEntity[];
}

export interface IEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface IWebhookEvent {
  event: string;
  conversationId: string;
  messageId?: string;
  senderId?: string;
  content?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
