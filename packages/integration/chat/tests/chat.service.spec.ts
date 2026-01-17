import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ChatService } from '../src/chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    conversation: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    conversationParticipant: { findFirst: ReturnType<typeof vi.fn> };
    message: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    readReceipt: { upsert: ReturnType<typeof vi.fn> };
  };

  const mockUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
  };

  const mockConversation = {
    id: 'conv-1',
    type: 'direct',
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageId: null,
    lastMessageAt: null,
    participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
  };

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hello!',
    status: 'sent',
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deliveredAt: null,
    readAt: null,
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      conversation: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      conversationParticipant: {
        findFirst: vi.fn(),
      },
      message: {
        create: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn(),
      },
      readReceipt: {
        upsert: vi.fn(),
      },
    };

    service = new ChatService(mockPrisma as unknown as Parameters<typeof ChatService>[0]);
  });

  describe('startConversation', () => {
    it('should create a new direct conversation', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockPrisma.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.startConversation('user-1', {
        participantIds: ['user-2'],
      });

      expect(result.id).toBe('conv-1');
      expect(result.type).toBe('direct');
      expect(result.participantIds).toContain('user-1');
      expect(result.participantIds).toContain('user-2');
    });

    it('should return existing conversation for direct messages', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([mockConversation]);

      const result = await service.startConversation('user-1', {
        participantIds: ['user-2'],
      });

      expect(result.id).toBe('conv-1');
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.startConversation('user-1', { participantIds: ['user-2'] })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if participants not in same tenant', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]); // Only one found

      await expect(
        service.startConversation('user-1', { participantIds: ['user-2'] })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should send initial message if provided', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockPrisma.conversation.create.mockResolvedValue(mockConversation);
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
        conversation: { tenantId: 'tenant-1' },
      });
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.conversation.update.mockResolvedValue(mockConversation);

      await service.startConversation('user-1', {
        participantIds: ['user-2'],
        initialMessage: 'Hello!',
      });

      expect(mockPrisma.message.create).toHaveBeenCalled();
    });
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([mockConversation]);

      const result = await service.getConversations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('conv-1');
    });

    it('should return empty array if no conversations', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      const result = await service.getConversations('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getConversation', () => {
    it('should return conversation if user is participant', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(mockConversation);

      const result = await service.getConversation('user-1', 'conv-1');

      expect(result?.id).toBe('conv-1');
    });

    it('should return null if user is not participant', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      const result = await service.getConversation('user-3', 'conv-1');

      expect(result).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
        conversation: { tenantId: 'tenant-1' },
      });
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.conversation.update.mockResolvedValue(mockConversation);

      const result = await service.sendMessage('user-1', {
        conversationId: 'conv-1',
        content: 'Hello!',
      });

      expect(result.id).toBe('msg-1');
      expect(result.content).toBe('Hello!');
      expect(result.status).toBe('sent');
    });

    it('should throw if user is not participant', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage('user-3', {
          conversationId: 'conv-1',
          content: 'Hello!',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    it('should return messages for conversation', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      });
      mockPrisma.message.findMany.mockResolvedValue([mockMessage]);

      const result = await service.getMessages('user-1', {
        conversationId: 'conv-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe('Hello!');
    });

    it('should throw if user is not participant', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessages('user-3', { conversationId: 'conv-1' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should respect pagination options', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      });
      mockPrisma.message.findMany.mockResolvedValue([]);

      await service.getMessages('user-1', {
        conversationId: 'conv-1',
        limit: 10,
        before: new Date(),
      });

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      });
      mockPrisma.message.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.readReceipt.upsert.mockResolvedValue({});

      await service.markAsRead('user-1', 'conv-1');

      expect(mockPrisma.message.updateMany).toHaveBeenCalled();
      expect(mockPrisma.readReceipt.upsert).toHaveBeenCalled();
    });

    it('should throw if user is not participant', async () => {
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('user-3', 'conv-1')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getUnreadCounts', () => {
    it('should return unread counts per conversation', async () => {
      mockPrisma.message.groupBy.mockResolvedValue([
        { conversationId: 'conv-1', _count: { id: 3 } },
        { conversationId: 'conv-2', _count: { id: 1 } },
      ]);

      const result = await service.getUnreadCounts('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]?.count).toBe(3);
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message to delivered', async () => {
      mockPrisma.message.update.mockResolvedValue({
        ...mockMessage,
        status: 'delivered',
        deliveredAt: new Date(),
      });

      const result = await service.updateMessageStatus('msg-1', 'delivered');

      expect(result.status).toBe('delivered');
      expect(result.deliveredAt).toBeDefined();
    });

    it('should update message to read', async () => {
      mockPrisma.message.update.mockResolvedValue({
        ...mockMessage,
        status: 'read',
        readAt: new Date(),
      });

      const result = await service.updateMessageStatus('msg-1', 'read');

      expect(result.status).toBe('read');
      expect(result.readAt).toBeDefined();
    });
  });
});
