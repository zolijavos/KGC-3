/**
 * @kgc/chatwoot - Chatwoot DTOs
 * Epic 29: Chatwoot Integration
 */

import { z } from 'zod';

export const TicketStatusEnum = z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']);
export const TicketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const TicketSourceEnum = z.enum(['CHAT', 'EMAIL', 'PHONE', 'WEB_FORM', 'API']);
export const EscalationReasonEnum = z.enum([
  'COMPLEX_ISSUE',
  'CUSTOMER_REQUEST',
  'SLA_BREACH',
  'AI_CONFIDENCE_LOW',
  'SENTIMENT_NEGATIVE',
  'TECHNICAL_ISSUE',
]);

export const CreateTicketSchema = z.object({
  chatwootConversationId: z.string().min(1),
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: TicketPriorityEnum.default('MEDIUM'),
  source: TicketSourceEnum.default('CHAT'),
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(20).optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: TicketStatusEnum.optional(),
  priority: TicketPriorityEnum.optional(),
  assignedAgentId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AddMessageSchema = z.object({
  ticketId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  contentType: z.enum(['text', 'html', 'attachment']).default('text'),
  senderType: z.enum(['customer', 'agent', 'bot']),
  senderId: z.string().min(1),
  senderName: z.string().min(1).max(200),
});

export const EscalateTicketSchema = z.object({
  ticketId: z.string().uuid(),
  reason: EscalationReasonEnum,
  toAgentId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export const AiAnalyzeSchema = z.object({
  ticketId: z.string().uuid(),
  messageContent: z.string().min(1).max(10000),
  conversationHistory: z.array(z.object({
    role: z.enum(['customer', 'agent', 'bot']),
    content: z.string(),
  })).optional(),
});

export const WebhookPayloadSchema = z.object({
  event: z.string().min(1),
  conversationId: z.string().min(1),
  messageId: z.string().optional(),
  senderId: z.string().optional(),
  content: z.string().optional(),
  timestamp: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const SearchTicketsSchema = z.object({
  status: TicketStatusEnum.optional(),
  priority: TicketPriorityEnum.optional(),
  assignedAgentId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  searchTerm: z.string().max(200).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketDto = z.infer<typeof UpdateTicketSchema>;
export type AddMessageDto = z.infer<typeof AddMessageSchema>;
export type EscalateTicketDto = z.infer<typeof EscalateTicketSchema>;
export type AiAnalyzeDto = z.infer<typeof AiAnalyzeSchema>;
export type WebhookPayloadDto = z.infer<typeof WebhookPayloadSchema>;
export type SearchTicketsDto = z.infer<typeof SearchTicketsSchema>;
