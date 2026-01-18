import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ChatWidgetService,
  IConversationRepository,
  IWidgetConfigRepository,
  IIntentRouterService,
  IQuotaService,
  ILanguageDetector,
  IAuditService,
} from './chat-widget.service';
import { IConversation, IMessage, IWidgetConfig, InteractionStatus } from '../interfaces/koko.interface';

const mockConversationRepository: IConversationRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findBySessionId: vi.fn(),
  update: vi.fn(),
  addMessage: vi.fn(),
  getMessages: vi.fn(),
};

const mockWidgetConfigRepository: IWidgetConfigRepository = {
  findByTenantId: vi.fn(),
  upsert: vi.fn(),
};

const mockIntentRouterService: IIntentRouterService = {
  processMessage: vi.fn(),
};

const mockQuotaService: IQuotaService = {
  checkQuota: vi.fn(),
  recordUsage: vi.fn(),
};

const mockLanguageDetector: ILanguageDetector = {
  detect: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('ChatWidgetService', () => {
  let service: ChatWidgetService;

  const mockTenantId = 'tenant-1';
  const mockSessionId = 'session-123';
  const mockConversationId = '00000000-0000-0000-0000-000000000001';

  const mockConversation: IConversation = {
    id: mockConversationId,
    tenantId: mockTenantId,
    sessionId: mockSessionId,
    channel: 'web',
    language: 'hu',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage: IMessage = {
    id: '00000000-0000-0000-0000-000000000002',
    conversationId: mockConversationId,
    role: 'user',
    content: 'Szia!',
    status: InteractionStatus.PENDING_RESPONSE,
    createdAt: new Date(),
  };

  const mockWidgetConfig: IWidgetConfig = {
    id: '00000000-0000-0000-0000-000000000003',
    tenantId: mockTenantId,
    enabled: true,
    position: 'bottom-right',
    theme: {
      primaryColor: '#007bff',
      headerText: 'Koko Asszisztens',
      welcomeMessage: 'Szia! Miben segíthetek?',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatWidgetService(
      mockConversationRepository,
      mockWidgetConfigRepository,
      mockIntentRouterService,
      mockQuotaService,
      mockLanguageDetector,
      mockAuditService,
    );
  });

  describe('startConversation', () => {
    it('should create new conversation', async () => {
      (mockConversationRepository.findBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockConversationRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockConversation);

      const result = await service.startConversation(
        { sessionId: mockSessionId, channel: 'web' },
        mockTenantId,
      );

      expect(result.id).toBe(mockConversationId);
      expect(result.channel).toBe('web');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'conversation_started' }),
      );
    });

    it('should return existing conversation for same session', async () => {
      (mockConversationRepository.findBySessionId as ReturnType<typeof vi.fn>).mockResolvedValue(mockConversation);

      const result = await service.startConversation(
        { sessionId: mockSessionId, channel: 'web' },
        mockTenantId,
      );

      expect(result.id).toBe(mockConversationId);
      expect(mockConversationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send message and get AI response', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockConversation);
      (mockQuotaService.checkQuota as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
      (mockConversationRepository.addMessage as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockMessage)
        .mockResolvedValueOnce({
          ...mockMessage,
          id: 'response-id',
          role: 'assistant',
          content: 'Szia! Miben segíthetek?',
        });
      (mockIntentRouterService.processMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        response: 'Szia! Miben segíthetek?',
        confidence: 0.9,
        status: InteractionStatus.AUTO_APPROVED,
      });
      (mockLanguageDetector.detect as ReturnType<typeof vi.fn>).mockResolvedValue('hu');

      const result = await service.sendMessage(
        { conversationId: mockConversationId, sessionId: mockSessionId, message: 'Szia!' },
        mockTenantId,
      );

      expect(result.message.content).toBe('Szia!');
      expect(result.response.content).toBe('Szia! Miben segíthetek?');
      expect(mockQuotaService.recordUsage).toHaveBeenCalled();
    });

    it('should throw error when quota exceeded', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockConversation);
      (mockQuotaService.checkQuota as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: false,
        reason: 'quota_exceeded',
      });
      (mockLanguageDetector.detect as ReturnType<typeof vi.fn>).mockResolvedValue('hu');

      await expect(
        service.sendMessage(
          { conversationId: mockConversationId, sessionId: mockSessionId, message: 'Test' },
          mockTenantId,
        ),
      ).rejects.toThrow('Quota exceeded');
    });

    it('should throw error on tenant mismatch', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockConversation);

      await expect(
        service.sendMessage(
          { conversationId: mockConversationId, sessionId: mockSessionId, message: 'Test' },
          'other-tenant',
        ),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getConversation', () => {
    it('should return conversation for valid tenant', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockConversation);

      const result = await service.getConversation(mockConversationId, mockTenantId);

      expect(result?.id).toBe(mockConversationId);
    });

    it('should return null when not found', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getConversation('non-existent', mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('closeConversation', () => {
    it('should close conversation successfully', async () => {
      (mockConversationRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockConversation);
      (mockConversationRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockConversation,
        closedAt: new Date(),
      });

      const result = await service.closeConversation(mockConversationId, mockTenantId);

      expect(result.closedAt).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'conversation_closed' }),
      );
    });
  });

  describe('getWidgetConfig', () => {
    it('should return widget config', async () => {
      (mockWidgetConfigRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidgetConfig);

      const result = await service.getWidgetConfig(mockTenantId);

      expect(result.enabled).toBe(true);
      expect(result.theme.primaryColor).toBe('#007bff');
    });

    it('should return default config when not found', async () => {
      (mockWidgetConfigRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getWidgetConfig(mockTenantId);

      expect(result.enabled).toBe(true);
      expect(result.position).toBe('bottom-right');
    });
  });

  describe('updateWidgetConfig', () => {
    it('should update widget config', async () => {
      (mockWidgetConfigRepository.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockWidgetConfig,
        enabled: false,
      });

      const result = await service.updateWidgetConfig(
        { enabled: false },
        mockTenantId,
        'user-1',
      );

      expect(result.enabled).toBe(false);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'widget_config_updated' }),
      );
    });
  });

  describe('isWidgetEnabled', () => {
    it('should return true when enabled', async () => {
      (mockWidgetConfigRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue(mockWidgetConfig);

      const result = await service.isWidgetEnabled(mockTenantId);

      expect(result).toBe(true);
    });
  });
});
