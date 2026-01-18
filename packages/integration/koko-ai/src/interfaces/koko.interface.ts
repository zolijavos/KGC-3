/**
 * @kgc/koko-ai - Koko AI Interfaces
 * Epic 31: Koko AI Chatbot (Gemini Flash)
 */

export type Language = 'hu' | 'en';
export type Channel = 'web' | 'discord' | 'email';

export enum InteractionStatus {
  PENDING_RESPONSE = 'PENDING_RESPONSE',
  AUTO_APPROVED = 'AUTO_APPROVED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  MANUAL_APPROVED = 'MANUAL_APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
}

export enum Intent {
  RENTAL_INQUIRY = 'RENTAL_INQUIRY',
  SERVICE_INQUIRY = 'SERVICE_INQUIRY',
  PRODUCT_INFO = 'PRODUCT_INFO',
  PRICE_INQUIRY = 'PRICE_INQUIRY',
  AVAILABILITY_CHECK = 'AVAILABILITY_CHECK',
  BOOKING_REQUEST = 'BOOKING_REQUEST',
  COMPLAINT = 'COMPLAINT',
  GENERAL_QUESTION = 'GENERAL_QUESTION',
  GREETING = 'GREETING',
  UNKNOWN = 'UNKNOWN',
}

export interface IConversation {
  id: string;
  tenantId: string;
  userId?: string;
  sessionId: string;
  channel: Channel;
  language: Language;
  messages: IMessage[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export interface IMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: Intent;
  confidence?: number;
  status: InteractionStatus;
  kbArticleId?: string;
  approvedBy?: string;
  createdAt: Date;
}

export interface IKnowledgeBaseArticle {
  id: string;
  tenantId: string;
  categoryId: string;
  language: Language;
  question: string;
  answer: string;
  intent?: Intent;
  confidenceThreshold: number;
  embedding?: number[];
  isActive: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKnowledgeBaseCategory {
  id: string;
  tenantId: string;
  name: string;
  parentId?: string;
  createdAt: Date;
}

export interface IApprovalQueueItem {
  id: string;
  tenantId: string;
  conversationId: string;
  messageId: string;
  userMessage: string;
  aiResponse: string;
  intent: Intent;
  confidence: number;
  channel: Channel;
  language: Language;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  editedResponse?: string;
  createdAt: Date;
}

export interface IAiAnalysisResult {
  intent: Intent;
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  language: Language;
  entities: IExtractedEntity[];
  suggestedCategory?: string;
}

export interface IExtractedEntity {
  type: 'product' | 'date' | 'price' | 'phone' | 'email' | 'location';
  value: string;
  confidence: number;
}

export interface IAiResponseResult {
  response: string;
  confidence: number;
  kbArticleId?: string;
  shouldAutoSend: boolean;
  requiresApproval: boolean;
  shouldEscalate: boolean;
}

export interface IQuotaUsage {
  id: string;
  tenantId: string;
  period: string; // YYYY-MM format
  requestCount: number;
  tokenCount: number;
  tier: QuotaTier;
  limitReached: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum QuotaTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  UNLIMITED = 'UNLIMITED',
}

export interface IQuotaConfig {
  tier: QuotaTier;
  monthlyRequestLimit: number;
  monthlyTokenLimit: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface IRateLimitStatus {
  allowed: boolean;
  remainingRequests: number;
  resetAt: Date;
  reason?: 'quota_exceeded' | 'rate_limited' | 'tier_limit';
}

export interface IWidgetConfig {
  id: string;
  tenantId: string;
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left';
  theme: {
    primaryColor: string;
    headerText: string;
    welcomeMessage: string;
  };
  businessHours?: {
    enabled: boolean;
    timezone: string;
    schedule: { day: number; open: string; close: string }[];
    offlineMessage: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
