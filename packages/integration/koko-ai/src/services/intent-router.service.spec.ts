import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IApprovalQueueItem,
  IKnowledgeBaseArticle,
  Intent,
  InteractionStatus,
} from '../interfaces/koko.interface';
import {
  IApprovalQueueRepository,
  IAuditService,
  IChatwootService,
  IConversationRepository,
  IGeminiClient,
  IKnowledgeBaseRepository,
  IntentRouterService,
} from './intent-router.service';

const mockKnowledgeBaseRepository: IKnowledgeBaseRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByTenantId: vi.fn(),
  searchByEmbedding: vi.fn(),
  update: vi.fn(),
};

const mockApprovalQueueRepository: IApprovalQueueRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findPendingByTenantId: vi.fn(),
  update: vi.fn(),
};

const mockConversationRepository: IConversationRepository = {
  findById: vi.fn(),
  addMessage: vi.fn(),
};

const mockGeminiClient: IGeminiClient = {
  generateContent: vi.fn(),
  generateEmbedding: vi.fn(),
  classifyIntent: vi.fn(),
};

const mockChatwootService: IChatwootService = {
  escalateConversation: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('IntentRouterService', () => {
  let service: IntentRouterService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockConversationId = '00000000-0000-0000-0000-000000000001';
  const mockArticleId = '00000000-0000-0000-0000-000000000002';
  const mockQueueItemId = '00000000-0000-0000-0000-000000000003';

  const mockKbArticle: IKnowledgeBaseArticle = {
    id: mockArticleId,
    tenantId: mockTenantId,
    categoryId: 'cat-1',
    language: 'hu',
    question: 'Hogyan bérelhetek gépet?',
    answer: 'Gépet bérelni telefonon vagy személyesen lehet.',
    intent: Intent.RENTAL_INQUIRY,
    confidenceThreshold: 0.8,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueueItem: IApprovalQueueItem = {
    id: mockQueueItemId,
    tenantId: mockTenantId,
    conversationId: mockConversationId,
    messageId: 'msg-1',
    userMessage: 'Mikor nyitotok?',
    aiResponse: 'Hétfőtől péntekig 8-17 óráig vagyunk nyitva.',
    intent: Intent.GENERAL_QUESTION,
    confidence: 0.7,
    channel: 'web',
    language: 'hu',
    status: 'pending',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IntentRouterService(
      mockKnowledgeBaseRepository,
      mockApprovalQueueRepository,
      mockConversationRepository,
      mockGeminiClient,
      mockChatwootService,
      mockAuditService
    );
  });

  describe('classifyIntent', () => {
    it('should classify intent successfully', async () => {
      (mockGeminiClient.classifyIntent as ReturnType<typeof vi.fn>).mockResolvedValue({
        intent: Intent.RENTAL_INQUIRY,
        confidence: 0.9,
        sentiment: 'neutral',
        language: 'hu',
        entities: [],
      });

      const result = await service.classifyIntent(
        { message: 'Szeretnék gépet bérelni', language: 'hu' },
        mockTenantId
      );

      expect(result.intent).toBe(Intent.RENTAL_INQUIRY);
      expect(result.confidence).toBe(0.9);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'intent_classified' })
      );
    });
  });

  describe('searchKnowledgeBase', () => {
    it('should search knowledge base with embeddings', async () => {
      (mockGeminiClient.generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([
        0.1, 0.2, 0.3,
      ]);
      (mockKnowledgeBaseRepository.searchByEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(
        [{ article: mockKbArticle, similarity: 0.9 }]
      );

      const result = await service.searchKnowledgeBase(
        { query: 'bérlés', language: 'hu', limit: 5 },
        mockTenantId
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.article.question).toContain('bérelhetek');
      expect(result[0]?.similarity).toBe(0.9);
    });
  });

  describe('processMessage', () => {
    it('should auto-approve high confidence response', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockConversationId,
        tenantId: mockTenantId,
        messages: [],
      });
      (mockGeminiClient.classifyIntent as ReturnType<typeof vi.fn>).mockResolvedValue({
        intent: Intent.GREETING,
        confidence: 0.95,
        sentiment: 'positive',
        language: 'hu',
        entities: [],
      });
      (mockGeminiClient.generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1]);
      (mockKnowledgeBaseRepository.searchByEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );
      (mockGeminiClient.generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: 'Szia! Miben segíthetek?',
        tokenCount: 100,
      });

      const result = await service.processMessage('Szia!', mockConversationId, mockTenantId, 'hu');

      expect(result.status).toBe(InteractionStatus.AUTO_APPROVED);
      expect(result.confidence).toBe(0.95);
    });

    it('should queue for approval on medium confidence', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockConversationId,
        tenantId: mockTenantId,
        messages: [],
      });
      (mockGeminiClient.classifyIntent as ReturnType<typeof vi.fn>).mockResolvedValue({
        intent: Intent.GENERAL_QUESTION,
        confidence: 0.65,
        sentiment: 'neutral',
        language: 'hu',
        entities: [],
      });
      (mockGeminiClient.generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1]);
      (mockKnowledgeBaseRepository.searchByEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );
      (mockGeminiClient.generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: 'Nem vagyok biztos...',
        tokenCount: 100,
      });
      (mockApprovalQueueRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockQueueItem
      );

      const result = await service.processMessage(
        'Valami bonyolult kérdés',
        mockConversationId,
        mockTenantId,
        'hu'
      );

      expect(result.status).toBe(InteractionStatus.PENDING_APPROVAL);
      expect(mockApprovalQueueRepository.create).toHaveBeenCalled();
    });

    it('should escalate on low confidence', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockConversationId,
        tenantId: mockTenantId,
        messages: [],
      });
      (mockGeminiClient.classifyIntent as ReturnType<typeof vi.fn>).mockResolvedValue({
        intent: Intent.COMPLAINT,
        confidence: 0.3,
        sentiment: 'negative',
        language: 'hu',
        entities: [],
      });
      (mockGeminiClient.generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([0.1]);
      (mockKnowledgeBaseRepository.searchByEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );
      (mockGeminiClient.generateContent as ReturnType<typeof vi.fn>).mockResolvedValue({
        text: 'Sajnálom...',
        tokenCount: 100,
      });
      (mockChatwootService.escalateConversation as ReturnType<typeof vi.fn>).mockResolvedValue({
        ticketId: 'ticket-1',
      });

      const result = await service.processMessage(
        'Nagyon dühös vagyok!',
        mockConversationId,
        mockTenantId,
        'hu'
      );

      expect(result.status).toBe(InteractionStatus.ESCALATED);
      expect(mockChatwootService.escalateConversation).toHaveBeenCalled();
    });
  });

  describe('approveResponse', () => {
    it('should approve and send response', async () => {
      (mockApprovalQueueRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockQueueItem
      );
      (mockApprovalQueueRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQueueItem,
        status: 'approved',
      });

      const result = await service.approveResponse(
        { queueItemId: mockQueueItemId, approved: true },
        mockTenantId,
        mockUserId
      );

      expect(result.status).toBe('approved');
      expect(mockConversationRepository.addMessage).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'response_approved' })
      );
    });

    it('should approve with edited response', async () => {
      (mockApprovalQueueRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockQueueItem
      );
      (mockApprovalQueueRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQueueItem,
        status: 'approved',
        editedResponse: 'Módosított válasz',
      });

      await service.approveResponse(
        { queueItemId: mockQueueItemId, approved: true, editedResponse: 'Módosított válasz' },
        mockTenantId,
        mockUserId
      );

      expect(mockConversationRepository.addMessage).toHaveBeenCalledWith(
        mockConversationId,
        expect.objectContaining({ content: 'Módosított válasz' })
      );
    });

    it('should add to knowledge base when requested', async () => {
      (mockApprovalQueueRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockQueueItem
      );
      (mockApprovalQueueRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQueueItem,
        status: 'approved',
      });
      (mockGeminiClient.generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([
        0.1, 0.2,
      ]);
      (mockKnowledgeBaseRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockKbArticle
      );

      await service.approveResponse(
        { queueItemId: mockQueueItemId, approved: true, addToKnowledgeBase: true },
        mockTenantId,
        mockUserId
      );

      expect(mockKnowledgeBaseRepository.create).toHaveBeenCalled();
    });

    it('should escalate on rejection', async () => {
      (mockApprovalQueueRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockQueueItem
      );
      (mockApprovalQueueRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQueueItem,
        status: 'rejected',
      });
      (mockChatwootService.escalateConversation as ReturnType<typeof vi.fn>).mockResolvedValue({
        ticketId: 'ticket-1',
      });

      const result = await service.approveResponse(
        { queueItemId: mockQueueItemId, approved: false },
        mockTenantId,
        mockUserId
      );

      expect(result.status).toBe('rejected');
      expect(mockChatwootService.escalateConversation).toHaveBeenCalled();
    });

    it('should throw error on tenant mismatch', async () => {
      (mockApprovalQueueRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockQueueItem
      );

      await expect(
        service.approveResponse(
          { queueItemId: mockQueueItemId, approved: true },
          'other-tenant',
          mockUserId
        )
      ).rejects.toThrow('Access denied');
    });
  });

  describe('createKbArticle', () => {
    it('should create knowledge base article', async () => {
      (mockGeminiClient.generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue([
        0.1, 0.2,
      ]);
      (mockKnowledgeBaseRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockKbArticle
      );

      const result = await service.createKbArticle(
        {
          categoryId: '00000000-0000-0000-0000-000000000010',
          language: 'hu',
          question: 'Teszt kérdés?',
          answer: 'Teszt válasz.',
        },
        mockTenantId,
        mockUserId
      );

      expect(result.question).toBe('Hogyan bérelhetek gépet?');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'kb_article_created' })
      );
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals', async () => {
      (
        mockApprovalQueueRepository.findPendingByTenantId as ReturnType<typeof vi.fn>
      ).mockResolvedValue([mockQueueItem]);

      const result = await service.getPendingApprovals(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('pending');
    });
  });
});
