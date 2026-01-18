/**
 * @kgc/chatwoot - Chatwoot Integration
 * Epic 29: Chatwoot Integration
 */

// Module
export { ChatwootModule } from './chatwoot.module';

// Services
export { TicketService } from './services/ticket.service';
export type {
  ITicketRepository,
  IMessageRepository,
  IChatwootClient,
  IPartnerService,
  IAuditService,
} from './services/ticket.service';

export { EscalationService } from './services/escalation.service';
export type {
  IEscalationRepository,
  ITicketRepository as IEscalationTicketRepository,
  IAgentRepository,
  IAiService,
  IChatwootClient as IEscalationChatwootClient,
  INotificationService,
  IAuditService as IEscalationAuditService,
} from './services/escalation.service';

// Interfaces
export {
  TicketStatus,
  TicketPriority,
  TicketSource,
  EscalationReason,
} from './interfaces/chatwoot.interface';
export type {
  ITicket,
  ITicketMessage,
  IAttachment,
  IAgent,
  IEscalation,
  IAiAnalysis,
  IEntity,
  IWebhookEvent,
} from './interfaces/chatwoot.interface';

// DTOs
export {
  TicketStatusEnum,
  TicketPriorityEnum,
  TicketSourceEnum,
  EscalationReasonEnum,
  CreateTicketSchema,
  UpdateTicketSchema,
  AddMessageSchema,
  EscalateTicketSchema,
  AiAnalyzeSchema,
  WebhookPayloadSchema,
  SearchTicketsSchema,
} from './dto/chatwoot.dto';
export type {
  CreateTicketDto,
  UpdateTicketDto,
  AddMessageDto,
  EscalateTicketDto,
  AiAnalyzeDto,
  WebhookPayloadDto,
  SearchTicketsDto,
} from './dto/chatwoot.dto';
