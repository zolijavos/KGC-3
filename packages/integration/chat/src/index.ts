/**
 * @kgc/chat - Internal Chat Module
 *
 * Real-time messaging between employees within the same tenant.
 *
 * Features:
 * - 1-to-1 direct messaging
 * - Group conversations
 * - Typing indicators
 * - Read receipts
 * - Offline message queue
 * - Tenant-scoped isolation
 *
 * @example
 * ```typescript
 * import { ChatModule, ChatService } from '@kgc/chat';
 *
 * // In NestJS module
 * @Module({
 *   imports: [ChatModule],
 * })
 * export class AppModule {}
 * ```
 */

// Module
export { ChatModule } from './chat.module';

// Services
export { ChatService } from './chat.service';
export { PresenceService } from './services/presence.service';
export { NotificationService } from './services/notification.service';
export { HistoryService } from './services/history.service';

// Gateway (WebSocket)
export { ChatGateway } from './chat.gateway';

// Controller
export { ChatController } from './chat.controller';

// DTOs
export * from './dto';

// Interfaces
export * from './interfaces';
