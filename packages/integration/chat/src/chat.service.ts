import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PRISMA_CLIENT } from './constants';
import type {
  IChatService,
  ChatMessage,
  Conversation,
  CreateMessageInput,
  StartConversationInput,
  MessageListOptions,
  UnreadCount,
  MessageStatus,
} from './interfaces/chat.interface';

/**
 * Chat service for managing conversations and messages
 * Implements tenant-scoped chat functionality
 */
@Injectable()
export class ChatService implements IChatService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * Start a new conversation between users
   * @param userId - Current user ID
   * @param input - Conversation input with participant IDs
   * @returns Created conversation
   */
  async startConversation(
    userId: string,
    input: StartConversationInput
  ): Promise<Conversation> {
    // Include current user in participants
    const allParticipants = [...new Set([userId, ...input.participantIds])];

    // For direct messages (2 participants), check if conversation exists
    if (allParticipants.length === 2) {
      const existing = await this.findExistingDirectConversation(
        userId,
        allParticipants
      );
      if (existing) {
        return existing;
      }
    }

    // Get tenant ID from current user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });

    if (!user?.tenantId) {
      throw new ForbiddenException('Felhasználó nem található');
    }

    // Verify all participants are in the same tenant
    const participants = await this.prisma.user.findMany({
      where: {
        id: { in: allParticipants },
        tenantId: user.tenantId,
      },
      select: { id: true },
    });

    if (participants.length !== allParticipants.length) {
      throw new ForbiddenException(
        'Minden résztvevőnek azonos tenant-hez kell tartoznia'
      );
    }

    // Create conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        type: allParticipants.length === 2 ? 'direct' : 'group',
        tenantId: user.tenantId,
        participants: {
          create: allParticipants.map((participantId) => ({
            userId: participantId,
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    // Send initial message if provided
    if (input.initialMessage) {
      await this.sendMessage(userId, {
        conversationId: conversation.id,
        content: input.initialMessage,
      });
    }

    return this.mapConversation(conversation);
  }

  /**
   * Find existing direct conversation between two users
   */
  private async findExistingDirectConversation(
    _userId: string,
    participantIds: string[]
  ): Promise<Conversation | null> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        type: 'direct',
        participants: {
          every: {
            userId: { in: participantIds },
          },
        },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Find conversation with exactly these participants
    const existing = conversations.find(
      (conv: typeof conversations[number]) =>
        conv.participants.length === 2 &&
        conv.participants.every((p: { userId: string }) => participantIds.includes(p.userId))
    );

    if (existing) {
      return this.mapConversation(existing);
    }

    return null;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations.map((conv: typeof conversations[number]) => this.mapConversation(conv));
  }

  /**
   * Get a specific conversation
   */
  async getConversation(
    userId: string,
    conversationId: string
  ): Promise<Conversation | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      return null;
    }

    return this.mapConversation(conversation);
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(
    userId: string,
    input: CreateMessageInput
  ): Promise<ChatMessage> {
    // Verify user is participant
    const participation = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: input.conversationId,
        userId,
      },
      include: {
        conversation: true,
      },
    });

    if (!participation) {
      throw new ForbiddenException('Nem vagy résztvevője a beszélgetésnek');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        senderId: userId,
        content: input.content,
        status: 'sent',
        tenantId: participation.conversation.tenantId,
      },
    });

    // Update conversation lastMessageAt
    await this.prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
        updatedAt: new Date(),
      },
    });

    return this.mapMessage(message);
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    userId: string,
    options: MessageListOptions
  ): Promise<ChatMessage[]> {
    // Verify user is participant
    const participation = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: options.conversationId,
        userId,
      },
    });

    if (!participation) {
      throw new ForbiddenException('Nem vagy résztvevője a beszélgetésnek');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: options.conversationId,
        ...(options.before && { createdAt: { lt: options.before } }),
        ...(options.after && { createdAt: { gt: options.after } }),
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 50,
    });

    return messages.map((msg: typeof messages[number]) => this.mapMessage(msg));
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markAsRead(userId: string, conversationId: string): Promise<void> {
    // Verify user is participant
    const participation = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!participation) {
      throw new ForbiddenException('Nem vagy résztvevője a beszélgetésnek');
    }

    // Update unread messages to read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { in: ['sent', 'delivered'] },
      },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    // Update read receipts
    await this.prisma.readReceipt.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      create: {
        conversationId,
        userId,
        lastReadAt: new Date(),
      },
      update: {
        lastReadAt: new Date(),
      },
    });
  }

  /**
   * Get unread message counts per conversation
   */
  async getUnreadCounts(userId: string): Promise<UnreadCount[]> {
    const counts = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversation: {
          participants: {
            some: { userId },
          },
        },
        senderId: { not: userId },
        status: { in: ['sent', 'delivered'] },
      },
      _count: {
        id: true,
      },
    });

    return counts.map((c: typeof counts[number]) => ({
      conversationId: c.conversationId,
      count: c._count.id,
    }));
  }

  /**
   * Update message status (delivered/read)
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<ChatMessage> {
    const updateData: Record<string, unknown> = { status };

    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'read') {
      updateData.readAt = new Date();
    }

    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: updateData,
    });

    return this.mapMessage(message);
  }

  /**
   * Map Prisma conversation to domain object
   */
  private mapConversation(conversation: {
    id: string;
    type: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    lastMessageId?: string | null;
    lastMessageAt?: Date | null;
    participants: Array<{ userId: string }>;
  }): Conversation {
    const result: Conversation = {
      id: conversation.id,
      type: conversation.type as 'direct' | 'group',
      participantIds: conversation.participants.map((p: { userId: string }) => p.userId),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      tenantId: conversation.tenantId,
    };
    if (conversation.lastMessageId != null) {
      result.lastMessageId = conversation.lastMessageId;
    }
    if (conversation.lastMessageAt != null) {
      result.lastMessageAt = conversation.lastMessageAt;
    }
    return result;
  }

  /**
   * Map Prisma message to domain object
   */
  private mapMessage(message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    status: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deliveredAt?: Date | null;
    readAt?: Date | null;
  }): ChatMessage {
    const result: ChatMessage = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      status: message.status as MessageStatus,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      tenantId: message.tenantId,
    };
    if (message.deliveredAt != null) {
      result.deliveredAt = message.deliveredAt;
    }
    if (message.readAt != null) {
      result.readAt = message.readAt;
    }
    return result;
  }
}
