import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TicketService,
  ITicketRepository,
  IMessageRepository,
  IChatwootClient,
  IPartnerService,
  IAuditService,
} from './ticket.service';
import { ITicket, ITicketMessage, TicketStatus, TicketPriority, TicketSource } from '../interfaces/chatwoot.interface';

const mockTicketRepository: ITicketRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByConversationId: vi.fn(),
  findByTicketNumber: vi.fn(),
  update: vi.fn(),
  search: vi.fn(),
  getNextSequence: vi.fn(),
};

const mockMessageRepository: IMessageRepository = {
  create: vi.fn(),
  findByTicketId: vi.fn(),
  findById: vi.fn(),
};

const mockChatwootClient: IChatwootClient = {
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
  updateConversationStatus: vi.fn(),
  assignAgent: vi.fn(),
  addLabel: vi.fn(),
};

const mockPartnerService: IPartnerService = {
  findByEmail: vi.fn(),
  findByPhone: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('TicketService', () => {
  let service: TicketService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockTicketId = '00000000-0000-0000-0000-000000000001';
  const mockConversationId = 'conv-123';

  const mockTicket: ITicket = {
    id: mockTicketId,
    tenantId: mockTenantId,
    chatwootConversationId: mockConversationId,
    ticketNumber: 'TKT-2026-00001',
    subject: 'Segítség kell',
    description: 'Nem működik a bérlés',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    source: TicketSource.CHAT,
    customerName: 'Kovács János',
    customerEmail: 'kovacs@example.com',
    tags: ['berles'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage: ITicketMessage = {
    id: '00000000-0000-0000-0000-000000000002',
    ticketId: mockTicketId,
    chatwootMessageId: 'msg-123',
    content: 'Teszt üzenet',
    contentType: 'text',
    senderType: 'customer',
    senderId: 'customer-1',
    senderName: 'Kovács János',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TicketService(
      mockTicketRepository,
      mockMessageRepository,
      mockChatwootClient,
      mockPartnerService,
      mockAuditService,
    );
  });

  describe('createTicket', () => {
    it('should create a ticket successfully', async () => {
      (mockTicketRepository.findByConversationId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockTicketRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockTicketRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockPartnerService.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.createTicket(
        {
          chatwootConversationId: mockConversationId,
          subject: 'Segítség kell',
          description: 'Nem működik a bérlés',
          customerName: 'Kovács János',
          customerEmail: 'kovacs@example.com',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result.ticketNumber).toBe('TKT-2026-00001');
      expect(mockChatwootClient.addLabel).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ticket_created' }),
      );
    });

    it('should throw error if ticket already exists for conversation', async () => {
      (mockTicketRepository.findByConversationId as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

      await expect(
        service.createTicket(
          {
            chatwootConversationId: mockConversationId,
            subject: 'Test',
            description: 'Test',
            customerName: 'Test',
          },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Ticket already exists');
    });

    it('should link existing customer by email', async () => {
      (mockTicketRepository.findByConversationId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockTicketRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(2);
      (mockPartnerService.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'partner-1',
        name: 'Kovács János',
      });
      (mockTicketRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTicket,
        customerId: 'partner-1',
      });

      const result = await service.createTicket(
        {
          chatwootConversationId: 'conv-456',
          subject: 'Test',
          description: 'Test',
          customerName: 'Kovács János',
          customerEmail: 'kovacs@example.com',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result.customerId).toBe('partner-1');
    });
  });

  describe('updateTicket', () => {
    it('should update ticket successfully', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockTicketRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTicket,
        priority: TicketPriority.HIGH,
      });

      const result = await service.updateTicket(
        mockTicketId,
        { priority: 'HIGH' },
        mockTenantId,
        mockUserId,
      );

      expect(result.priority).toBe(TicketPriority.HIGH);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ticket_updated' }),
      );
    });

    it('should sync status to Chatwoot when changed', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockTicketRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.RESOLVED,
      });

      await service.updateTicket(
        mockTicketId,
        { status: 'RESOLVED' },
        mockTenantId,
        mockUserId,
      );

      expect(mockChatwootClient.updateConversationStatus).toHaveBeenCalledWith(
        mockConversationId,
        'resolved',
      );
    });

    it('should throw error on tenant mismatch', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

      await expect(
        service.updateTicket(mockTicketId, { priority: 'HIGH' }, 'other-tenant', mockUserId),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('addMessage', () => {
    it('should add message and send to Chatwoot for agent', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockChatwootClient.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'msg-new' });
      (mockMessageRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMessage);

      const result = await service.addMessage(
        {
          ticketId: mockTicketId,
          content: 'Agent válasz',
          senderType: 'agent',
          senderId: mockUserId,
          senderName: 'Agent',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(mockChatwootClient.sendMessage).toHaveBeenCalledWith(
        mockConversationId,
        'Agent válasz',
        false,
      );
    });

    it('should reopen resolved ticket on customer message', async () => {
      const resolvedTicket = { ...mockTicket, status: TicketStatus.RESOLVED };
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(resolvedTicket);
      (mockMessageRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMessage);

      await service.addMessage(
        {
          ticketId: mockTicketId,
          content: 'Customer follow-up',
          senderType: 'customer',
          senderId: 'customer-1',
          senderName: 'Customer',
        },
        mockTenantId,
        mockUserId,
      );

      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        mockTicketId,
        expect.objectContaining({ status: TicketStatus.PENDING }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('should process message_created webhook', async () => {
      (mockTicketRepository.findByConversationId as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockMessageRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMessage);

      const result = await service.handleWebhook(
        {
          event: 'message_created',
          conversationId: mockConversationId,
          messageId: 'msg-new',
          content: 'Új üzenet',
          timestamp: new Date(),
        },
        mockTenantId,
      );

      expect(result.processed).toBe(true);
      expect(result.ticketId).toBe(mockTicketId);
    });

    it('should handle conversation_resolved webhook', async () => {
      (mockTicketRepository.findByConversationId as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockTicketRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.RESOLVED,
      });

      const result = await service.handleWebhook(
        {
          event: 'conversation_resolved',
          conversationId: mockConversationId,
          timestamp: new Date(),
        },
        mockTenantId,
      );

      expect(result.processed).toBe(true);
      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        mockTicketId,
        expect.objectContaining({ status: TicketStatus.RESOLVED }),
      );
    });

    it('should return not processed for unknown conversation', async () => {
      (mockTicketRepository.findByConversationId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.handleWebhook(
        {
          event: 'message_created',
          conversationId: 'unknown-conv',
          timestamp: new Date(),
        },
        mockTenantId,
      );

      expect(result.processed).toBe(false);
    });
  });

  describe('searchTickets', () => {
    it('should search tickets with filters', async () => {
      (mockTicketRepository.search as ReturnType<typeof vi.fn>).mockResolvedValue({
        tickets: [mockTicket],
        total: 1,
      });

      const result = await service.searchTickets(
        { status: 'OPEN', priority: 'HIGH' },
        mockTenantId,
      );

      expect(result.tickets).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
