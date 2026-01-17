import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { PresenceService } from './services/presence.service';
import { NotificationService } from './services/notification.service';
import { HistoryService } from './services/history.service';
import { PRISMA_CLIENT } from './constants';

/**
 * Chat module for internal communication
 *
 * Provides:
 * - Real-time messaging via WebSocket
 * - REST API for chat operations
 * - Tenant-scoped conversations
 * - User presence tracking
 * - Push notifications
 * - Message history and search
 *
 * @requires PrismaClient - Must be provided by the importing module or use forRoot/forRootAsync
 */
@Module({
  providers: [
    ChatService,
    ChatGateway,
    PresenceService,
    NotificationService,
    HistoryService,
    {
      provide: PRISMA_CLIENT,
      useClass: PrismaClient,
    },
  ],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway, PresenceService, NotificationService, HistoryService],
})
export class ChatModule {}
