/**
 * @kgc/koko-ai - Koko AI Chatbot
 * Epic 31: Koko AI Chatbot (Gemini Flash)
 */

// Module
export { KokoModule } from './koko.module';

// Interfaces - common types
export * from './interfaces/koko.interface';

// DTOs
export * from './dto/koko.dto';

// Services - classes are runtime exports
export { ChatWidgetService } from './services/chat-widget.service';
export { IntentRouterService } from './services/intent-router.service';
export { QuotaService } from './services/quota.service';

// Interfaces from services - type exports
export type {
  IConversationRepository,
  IIntentRouterService,
  IWidgetConfigRepository,
} from './services/chat-widget.service';
export type {
  IApprovalQueueRepository,
  IChatwootService,
  IGeminiClient,
  IKnowledgeBaseRepository,
} from './services/intent-router.service';
export type {
  IAuditService,
  IQuotaUsageRepository,
  IRateLimitCache,
  ITenantConfigRepository,
} from './services/quota.service';
