/**
 * @kgc/koko-ai - Koko AI DTOs
 * Epic 31: Koko AI Chatbot
 */

import { z } from 'zod';

export const LanguageEnum = z.enum(['hu', 'en']);
export const ChannelEnum = z.enum(['web', 'discord', 'email']);
export const IntentEnum = z.enum([
  'RENTAL_INQUIRY',
  'SERVICE_INQUIRY',
  'PRODUCT_INFO',
  'PRICE_INQUIRY',
  'AVAILABILITY_CHECK',
  'BOOKING_REQUEST',
  'COMPLAINT',
  'GENERAL_QUESTION',
  'GREETING',
  'UNKNOWN',
]);
export const QuotaTierEnum = z.enum(['FREE', 'BASIC', 'PREMIUM', 'UNLIMITED']);

// Story 31-1: Chat Widget
export const SendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  sessionId: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  channel: ChannelEnum.default('web'),
  language: LanguageEnum.optional(),
});

export const GetConversationSchema = z.object({
  conversationId: z.string().uuid(),
});

export const StartConversationSchema = z.object({
  sessionId: z.string().min(1).max(100),
  channel: ChannelEnum.default('web'),
  language: LanguageEnum.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const GetWidgetConfigSchema = z.object({
  tenantId: z.string().min(1),
});

export const UpdateWidgetConfigSchema = z.object({
  enabled: z.boolean().optional(),
  position: z.enum(['bottom-right', 'bottom-left']).optional(),
  theme: z
    .object({
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      headerText: z.string().max(50),
      welcomeMessage: z.string().max(200),
    })
    .optional(),
  businessHours: z
    .object({
      enabled: z.boolean(),
      timezone: z.string(),
      schedule: z.array(
        z.object({
          day: z.number().int().min(0).max(6),
          open: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/),
          close: z.string().regex(/^[0-2][0-9]:[0-5][0-9]$/),
        }),
      ),
      offlineMessage: z.string().max(200),
    })
    .optional(),
});

// Story 31-2: Intent Classification & Routing
export const ClassifyIntentSchema = z.object({
  message: z.string().min(1).max(2000),
  language: LanguageEnum.optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
});

export const SearchKnowledgeBaseSchema = z.object({
  query: z.string().min(1).max(500),
  language: LanguageEnum,
  intent: IntentEnum.optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export const CreateKbArticleSchema = z.object({
  categoryId: z.string().uuid(),
  language: LanguageEnum,
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  intent: IntentEnum.optional(),
  confidenceThreshold: z.number().min(0).max(1).default(0.8),
});

export const ApproveResponseSchema = z.object({
  queueItemId: z.string().uuid(),
  approved: z.boolean(),
  editedResponse: z.string().max(5000).optional(),
  addToKnowledgeBase: z.boolean().default(false),
});

export const RouteConversationSchema = z.object({
  conversationId: z.string().uuid(),
  targetType: z.enum(['ai', 'agent', 'chatwoot']),
  reason: z.string().max(500).optional(),
});

// Story 31-3: AI Quota & Rate Limiting
export const CheckQuotaSchema = z.object({
  tenantId: z.string().min(1),
  requestType: z.enum(['chat', 'analysis', 'embedding']).default('chat'),
  estimatedTokens: z.number().int().min(0).default(500),
});

export const GetQuotaUsageSchema = z.object({
  tenantId: z.string().min(1),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(), // YYYY-MM
});

export const UpdateQuotaTierSchema = z.object({
  tenantId: z.string().min(1),
  tier: QuotaTierEnum,
});

export const RecordUsageSchema = z.object({
  tenantId: z.string().min(1),
  requestType: z.enum(['chat', 'analysis', 'embedding']),
  tokenCount: z.number().int().min(0),
  success: z.boolean(),
});

// Type exports
export type SendMessageDto = z.infer<typeof SendMessageSchema>;
export type GetConversationDto = z.infer<typeof GetConversationSchema>;
export type StartConversationDto = z.infer<typeof StartConversationSchema>;
export type GetWidgetConfigDto = z.infer<typeof GetWidgetConfigSchema>;
export type UpdateWidgetConfigDto = z.infer<typeof UpdateWidgetConfigSchema>;
export type ClassifyIntentDto = z.infer<typeof ClassifyIntentSchema>;
export type SearchKnowledgeBaseDto = z.infer<typeof SearchKnowledgeBaseSchema>;
export type CreateKbArticleDto = z.infer<typeof CreateKbArticleSchema>;
export type ApproveResponseDto = z.infer<typeof ApproveResponseSchema>;
export type RouteConversationDto = z.infer<typeof RouteConversationSchema>;
export type CheckQuotaDto = z.infer<typeof CheckQuotaSchema>;
export type GetQuotaUsageDto = z.infer<typeof GetQuotaUsageSchema>;
export type UpdateQuotaTierDto = z.infer<typeof UpdateQuotaTierSchema>;
export type RecordUsageDto = z.infer<typeof RecordUsageSchema>;
