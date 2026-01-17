import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import {
  ChatServerEvent,
  ChatClientEvent,
  type TypingEvent,
  type UserStatus,
} from './interfaces/chat.interface';
import { sendMessageSchema } from './dto/send-message.dto';

/**
 * Authenticated socket with user info
 */
interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    tenantId: string;
  };
}

/**
 * User connection tracking
 */
interface UserConnection {
  socketId: string;
  userId: string;
  tenantId: string;
  status: UserStatus;
  lastSeenAt: Date;
}

/**
 * WebSocket Gateway for real-time chat
 *
 * Handles:
 * - Connection/disconnection
 * - Message sending/receiving
 * - Typing indicators
 * - Read receipts
 * - User presence
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env['CORS_ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** Track connected users: Map<userId, UserConnection> */
  private connectedUsers = new Map<string, UserConnection>();

  /** Track socket to user mapping: Map<socketId, userId> */
  private socketToUser = new Map<string, string>();

  constructor(private readonly chatService: ChatService) {}

  /**
   * Handle new connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract user info from handshake (set by auth middleware)
      const { userId, tenantId } = client.data;

      if (!userId || !tenantId) {
        this.logger.warn(`Unauthorized connection attempt: ${client.id}`);
        client.disconnect();
        return;
      }

      // Track connection
      this.connectedUsers.set(userId, {
        socketId: client.id,
        userId,
        tenantId,
        status: 'online',
        lastSeenAt: new Date(),
      });
      this.socketToUser.set(client.id, userId);

      // Join tenant room for broadcasts
      await client.join(`tenant:${tenantId}`);

      // Notify other users in tenant about online status
      this.server.to(`tenant:${tenantId}`).emit(ChatServerEvent.USER_STATUS, {
        userId,
        status: 'online',
      });

      this.logger.log(`User connected: ${userId} (socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error}`);
      client.disconnect();
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.socketToUser.get(client.id);

    if (userId) {
      const connection = this.connectedUsers.get(userId);

      if (connection) {
        // Update last seen
        connection.status = 'offline';
        connection.lastSeenAt = new Date();

        // Notify other users
        this.server
          .to(`tenant:${connection.tenantId}`)
          .emit(ChatServerEvent.USER_STATUS, {
            userId,
            status: 'offline',
            lastSeenAt: connection.lastSeenAt,
          });
      }

      // Clean up tracking
      this.connectedUsers.delete(userId);
      this.socketToUser.delete(client.id);

      this.logger.log(`User disconnected: ${userId}`);
    }
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage(ChatClientEvent.JOIN_CONVERSATION)
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string
  ) {
    const { userId } = client.data;

    // Verify user is participant
    const conversation = await this.chatService.getConversation(
      userId,
      conversationId
    );

    if (!conversation) {
      client.emit(ChatServerEvent.ERROR, {
        message: 'Nem vagy résztvevője a beszélgetésnek',
      });
      return;
    }

    await client.join(`conversation:${conversationId}`);
    this.logger.debug(`User ${userId} joined conversation ${conversationId}`);

    return { success: true };
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage(ChatClientEvent.LEAVE_CONVERSATION)
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string
  ) {
    await client.leave(`conversation:${conversationId}`);
    return { success: true };
  }

  /**
   * Send a message
   */
  @SubscribeMessage(ChatClientEvent.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string }
  ) {
    const { userId } = client.data;

    try {
      // Validate input
      const validated = sendMessageSchema.parse(data);

      // Save message
      const message = await this.chatService.sendMessage(userId, validated);

      // Broadcast to conversation room
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit(ChatServerEvent.MESSAGE_NEW, message);

      // Also notify participants not in the room
      const conversation = await this.chatService.getConversation(
        userId,
        data.conversationId
      );

      if (conversation) {
        for (const participantId of conversation.participantIds) {
          if (participantId !== userId) {
            const participantConnection = this.connectedUsers.get(participantId);
            if (participantConnection) {
              this.server
                .to(participantConnection.socketId)
                .emit(ChatServerEvent.CONVERSATION_UPDATED, {
                  conversationId: data.conversationId,
                  lastMessage: message,
                });
            }
          }
        }
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Send message error: ${error}`);
      client.emit(ChatServerEvent.ERROR, {
        message: 'Üzenet küldése sikertelen',
      });
      return { success: false };
    }
  }

  /**
   * Handle typing start
   */
  @SubscribeMessage(ChatClientEvent.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string
  ) {
    const { userId } = client.data;

    const event: TypingEvent = {
      conversationId,
      userId,
      isTyping: true,
    };

    // Broadcast to conversation room except sender
    client.to(`conversation:${conversationId}`).emit(ChatServerEvent.TYPING, event);

    return { success: true };
  }

  /**
   * Handle typing stop
   */
  @SubscribeMessage(ChatClientEvent.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string
  ) {
    const { userId } = client.data;

    const event: TypingEvent = {
      conversationId,
      userId,
      isTyping: false,
    };

    client.to(`conversation:${conversationId}`).emit(ChatServerEvent.TYPING, event);

    return { success: true };
  }

  /**
   * Mark messages as read
   */
  @SubscribeMessage(ChatClientEvent.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() conversationId: string
  ) {
    const { userId } = client.data;

    try {
      await this.chatService.markAsRead(userId, conversationId);

      // Notify sender that messages were read
      this.server
        .to(`conversation:${conversationId}`)
        .emit(ChatServerEvent.MESSAGE_STATUS, {
          conversationId,
          readBy: userId,
          readAt: new Date(),
        });

      return { success: true };
    } catch (error) {
      this.logger.error(`Mark read error: ${error}`);
      return { success: false };
    }
  }

  /**
   * Get online users in tenant
   */
  getOnlineUsersInTenant(tenantId: string): string[] {
    const online: string[] = [];

    for (const [userId, connection] of this.connectedUsers) {
      if (connection.tenantId === tenantId && connection.status === 'online') {
        online.push(userId);
      }
    }

    return online;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const connection = this.connectedUsers.get(userId);
    return connection?.status === 'online';
  }

  /**
   * Get user's last seen time
   */
  getUserLastSeen(userId: string): Date | null {
    const connection = this.connectedUsers.get(userId);
    return connection?.lastSeenAt ?? null;
  }
}
