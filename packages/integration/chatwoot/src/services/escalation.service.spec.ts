import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EscalationService,
  IEscalationRepository,
  ITicketRepository,
  IAgentRepository,
  IAiService,
  IChatwootClient,
  INotificationService,
  IAuditService,
} from './escalation.service';
import {
  ITicket,
  IEscalation,
  IAgent,
  EscalationReason,
  TicketStatus,
  TicketPriority,
  TicketSource,
} from '../interfaces/chatwoot.interface';

const mockEscalationRepository: IEscalationRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByTicketId: vi.fn(),
  findPendingByTenantId: vi.fn(),
  update: vi.fn(),
};

const mockTicketRepository: ITicketRepository = {
  findById: vi.fn(),
  update: vi.fn(),
};

const mockAgentRepository: IAgentRepository = {
  findById: vi.fn(),
  findAvailableByTenantId: vi.fn(),
  findBySkills: vi.fn(),
};

const mockAiService: IAiService = {
  analyzeMessage: vi.fn(),
  classifyIntent: vi.fn(),
  analyzeSentiment: vi.fn(),
  generateResponse: vi.fn(),
};

const mockChatwootClient: IChatwootClient = {
  assignAgent: vi.fn(),
  sendMessage: vi.fn(),
  addNote: vi.fn(),
};

const mockNotificationService: INotificationService = {
  notifyAgent: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('EscalationService', () => {
  let service: EscalationService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockTicketId = '00000000-0000-0000-0000-000000000001';
  const mockEscalationId = '00000000-0000-0000-0000-000000000002';
  const mockAgentId = '00000000-0000-0000-0000-000000000003';

  const mockTicket: ITicket = {
    id: mockTicketId,
    tenantId: mockTenantId,
    chatwootConversationId: 'conv-123',
    ticketNumber: 'TKT-2026-00001',
    subject: 'Segítség kell',
    description: 'Nem működik a bérlés',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    source: TicketSource.CHAT,
    customerName: 'Kovács János',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgent: IAgent = {
    id: mockAgentId,
    chatwootAgentId: 'cw-agent-1',
    name: 'Agent Anna',
    email: 'anna@example.com',
    role: 'agent',
    isOnline: true,
    activeTicketCount: 2,
  };

  const mockEscalation: IEscalation = {
    id: mockEscalationId,
    tenantId: mockTenantId,
    ticketId: mockTicketId,
    fromAgentId: undefined,
    toAgentId: mockAgentId,
    reason: EscalationReason.COMPLEX_ISSUE,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EscalationService(
      mockEscalationRepository,
      mockTicketRepository,
      mockAgentRepository,
      mockAiService,
      mockChatwootClient,
      mockNotificationService,
      mockAuditService,
    );
  });

  describe('escalateTicket', () => {
    it('should escalate ticket to specified agent', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAgentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgent);
      (mockEscalationRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockEscalation);
      (mockTicketRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

      const result = await service.escalateTicket(
        {
          ticketId: mockTicketId,
          reason: 'COMPLEX_ISSUE',
          toAgentId: mockAgentId,
          notes: 'Needs technical expertise',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result.reason).toBe(EscalationReason.COMPLEX_ISSUE);
      expect(mockChatwootClient.assignAgent).toHaveBeenCalledWith('conv-123', mockAgentId);
      expect(mockChatwootClient.addNote).toHaveBeenCalled();
      expect(mockNotificationService.notifyAgent).toHaveBeenCalledWith(
        mockAgentId,
        expect.objectContaining({ type: 'escalation' }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ticket_escalated' }),
      );
    });

    it('should auto-select available agent when not specified', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAgentRepository.findAvailableByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockAgent,
        { ...mockAgent, id: 'agent-2', activeTicketCount: 5 },
      ]);
      (mockEscalationRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockEscalation);
      (mockTicketRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

      const result = await service.escalateTicket(
        {
          ticketId: mockTicketId,
          reason: 'CUSTOMER_REQUEST',
        },
        mockTenantId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        mockTicketId,
        expect.objectContaining({ assignedAgentId: mockAgentId }),
      );
    });

    it('should upgrade priority for SLA breach', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAgentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgent);
      (mockEscalationRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockEscalation);
      (mockTicketRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

      await service.escalateTicket(
        {
          ticketId: mockTicketId,
          reason: 'SLA_BREACH',
          toAgentId: mockAgentId,
        },
        mockTenantId,
        mockUserId,
      );

      expect(mockTicketRepository.update).toHaveBeenCalledWith(
        mockTicketId,
        expect.objectContaining({ priority: TicketPriority.HIGH }),
      );
    });

    it('should throw error on tenant mismatch', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

      await expect(
        service.escalateTicket(
          { ticketId: mockTicketId, reason: 'COMPLEX_ISSUE' },
          'other-tenant',
          mockUserId,
        ),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('analyzeAndSuggestEscalation', () => {
    it('should suggest escalation on low AI confidence', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAiService.analyzeMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        confidence: 0.5,
        intent: 'complaint',
        sentiment: 'neutral',
      });
      (mockAgentRepository.findAvailableByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockAgent]);

      const result = await service.analyzeAndSuggestEscalation(
        { ticketId: mockTicketId, messageContent: 'This is very complicated' },
        mockTenantId,
        mockUserId,
      );

      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe(EscalationReason.AI_CONFIDENCE_LOW);
      expect(result.suggestedAgentId).toBe(mockAgentId);
    });

    it('should suggest escalation on negative sentiment', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAiService.analyzeMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        confidence: 0.9,
        intent: 'complaint',
        sentiment: 'negative',
      });
      (mockAgentRepository.findAvailableByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockAgent]);

      const result = await service.analyzeAndSuggestEscalation(
        { ticketId: mockTicketId, messageContent: 'I am very angry!' },
        mockTenantId,
        mockUserId,
      );

      expect(result.shouldEscalate).toBe(true);
      expect(result.reason).toBe(EscalationReason.SENTIMENT_NEGATIVE);
    });

    it('should not suggest escalation on high confidence positive sentiment', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAiService.analyzeMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        confidence: 0.95,
        intent: 'inquiry',
        sentiment: 'positive',
      });

      const result = await service.analyzeAndSuggestEscalation(
        { ticketId: mockTicketId, messageContent: 'Thank you for your help!' },
        mockTenantId,
        mockUserId,
      );

      expect(result.shouldEscalate).toBe(false);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('autoEscalateIfNeeded', () => {
    it('should auto-escalate when AI suggests', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAiService.analyzeMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        confidence: 0.4,
        intent: 'complaint',
        sentiment: 'negative',
      });
      (mockAgentRepository.findAvailableByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockAgent]);
      (mockAgentRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgent);
      (mockEscalationRepository.create as ReturnType<typeof vi.fn>).mockImplementation((data) =>
        Promise.resolve({ ...mockEscalation, reason: data.reason }),
      );
      (mockTicketRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);

      const result = await service.autoEscalateIfNeeded(
        mockTicketId,
        'I am very frustrated with your service',
        mockTenantId,
      );

      expect(result).not.toBeNull();
      expect(result?.reason).toBe(EscalationReason.AI_CONFIDENCE_LOW);
    });

    it('should return null when no escalation needed', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAiService.analyzeMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        confidence: 0.9,
        intent: 'inquiry',
        sentiment: 'positive',
      });

      const result = await service.autoEscalateIfNeeded(
        mockTicketId,
        'Simple question',
        mockTenantId,
      );

      expect(result).toBeNull();
    });
  });

  describe('generateAiResponse', () => {
    it('should generate AI response with high confidence', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAiService.generateResponse as ReturnType<typeof vi.fn>).mockResolvedValue({
        response: 'Here is how to fix your issue...',
        confidence: 0.95,
      });

      const result = await service.generateAiResponse(
        mockTicketId,
        'How do I return equipment?',
        mockTenantId,
      );

      expect(result.response).toBeDefined();
      expect(result.confidence).toBe(0.95);
      expect(result.autoSend).toBe(true);
    });

    it('should not auto-send on low confidence', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockAiService.generateResponse as ReturnType<typeof vi.fn>).mockResolvedValue({
        response: 'I think...',
        confidence: 0.6,
      });

      const result = await service.generateAiResponse(
        mockTicketId,
        'Complex question',
        mockTenantId,
      );

      expect(result.autoSend).toBe(false);
    });
  });

  describe('resolveEscalation', () => {
    it('should resolve escalation successfully', async () => {
      (mockEscalationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockEscalation);
      (mockEscalationRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockEscalation,
        resolvedAt: new Date(),
      });

      const result = await service.resolveEscalation(mockEscalationId, mockTenantId, mockUserId);

      expect(result.resolvedAt).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'escalation_resolved' }),
      );
    });
  });

  describe('getEscalationHistory', () => {
    it('should return escalation history for ticket', async () => {
      (mockTicketRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
      (mockEscalationRepository.findByTicketId as ReturnType<typeof vi.fn>).mockResolvedValue([mockEscalation]);

      const result = await service.getEscalationHistory(mockTicketId, mockTenantId);

      expect(result).toHaveLength(1);
    });
  });
});
