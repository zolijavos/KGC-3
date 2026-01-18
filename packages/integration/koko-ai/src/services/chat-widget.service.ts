/**
 * @kgc/koko-ai - ChatWidgetService
 * Epic 31: Story 31-1 - Koko Chatbot Widget
 */

import { Injectable } from '@nestjs/common';
import {
  IConversation,
  IMessage,
  IWidgetConfig,
  InteractionStatus,
  Language,
  Channel,
} from '../interfaces/koko.interface';
import {
  SendMessageDto,
  SendMessageSchema,
  StartConversationDto,
  StartConversationSchema,
  UpdateWidgetConfigDto,
  UpdateWidgetConfigSchema,
} from '../dto/koko.dto';

export interface IConversationRepository {
  create(data: Partial<IConversation>): Promise<IConversation>;
  findById(id: string): Promise<IConversation | null>;
  findBySessionId(tenantId: string, sessionId: string): Promise<IConversation | null>;
  update(id: string, data: Partial<IConversation>): Promise<IConversation>;
  addMessage(conversationId: string, message: Partial<IMessage>): Promise<IMessage>;
  getMessages(conversationId: string, limit?: number): Promise<IMessage[]>;
}

export interface IWidgetConfigRepository {
  findByTenantId(tenantId: string): Promise<IWidgetConfig | null>;
  upsert(tenantId: string, data: Partial<IWidgetConfig>): Promise<IWidgetConfig>;
}

export interface IIntentRouterService {
  processMessage(
    message: string,
    conversationId: string,
    tenantId: string,
    language: Language,
  ): Promise<{
    response: string;
    confidence: number;
    status: InteractionStatus;
  }>;
}

export interface IQuotaService {
  checkQuota(tenantId: string, estimatedTokens: number): Promise<{ allowed: boolean; reason?: string }>;
  recordUsage(tenantId: string, tokenCount: number): Promise<void>;
}

export interface ILanguageDetector {
  detect(text: string): Promise<Language>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

const DEFAULT_WIDGET_CONFIG: Omit<IWidgetConfig, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  position: 'bottom-right',
  theme: {
    primaryColor: '#007bff',
    headerText: 'Koko Asszisztens',
    welcomeMessage: 'Szia! Miben segíthetek?',
  },
};

@Injectable()
export class ChatWidgetService {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly widgetConfigRepository: IWidgetConfigRepository,
    private readonly intentRouterService: IIntentRouterService,
    private readonly quotaService: IQuotaService,
    private readonly languageDetector: ILanguageDetector,
    private readonly auditService: IAuditService,
  ) {}

  async startConversation(
    input: StartConversationDto,
    tenantId: string,
  ): Promise<IConversation> {
    const validationResult = StartConversationSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Check if conversation already exists for this session
    const existingConversation = await this.conversationRepository.findBySessionId(
      tenantId,
      validInput.sessionId,
    );
    if (existingConversation) {
      return existingConversation;
    }

    const conversation = await this.conversationRepository.create({
      tenantId,
      sessionId: validInput.sessionId,
      channel: validInput.channel as Channel,
      language: (validInput.language as Language) || 'hu',
      messages: [],
      metadata: validInput.metadata,
    });

    await this.auditService.log({
      action: 'conversation_started',
      entityType: 'conversation',
      entityId: conversation.id,
      userId: 'anonymous',
      tenantId,
      metadata: { channel: validInput.channel, sessionId: validInput.sessionId },
    });

    return conversation;
  }

  async sendMessage(
    input: SendMessageDto,
    tenantId: string,
  ): Promise<{ message: IMessage; response: IMessage }> {
    const validationResult = SendMessageSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Get or create conversation
    let conversation: IConversation;
    if (validInput.conversationId) {
      const existing = await this.conversationRepository.findById(validInput.conversationId);
      if (!existing) {
        throw new Error('Conversation not found');
      }
      if (existing.tenantId !== tenantId) {
        throw new Error('Access denied');
      }
      conversation = existing;
    } else {
      conversation = await this.startConversation(
        {
          sessionId: validInput.sessionId,
          channel: validInput.channel,
          language: validInput.language,
        },
        tenantId,
      );
    }

    // Detect language if not set
    let language = conversation.language;
    if (!validInput.language) {
      language = await this.languageDetector.detect(validInput.message);
      if (language !== conversation.language) {
        await this.conversationRepository.update(conversation.id, { language });
      }
    }

    // Check quota
    const quotaCheck = await this.quotaService.checkQuota(tenantId, 500);
    if (!quotaCheck.allowed) {
      throw new Error(`Quota exceeded: ${quotaCheck.reason}`);
    }

    // Store user message
    const userMessage = await this.conversationRepository.addMessage(conversation.id, {
      role: 'user',
      content: validInput.message,
      status: InteractionStatus.PENDING_RESPONSE,
    });

    // Process with intent router
    const aiResult = await this.intentRouterService.processMessage(
      validInput.message,
      conversation.id,
      tenantId,
      language,
    );

    // Store AI response
    const aiMessage = await this.conversationRepository.addMessage(conversation.id, {
      role: 'assistant',
      content: aiResult.response,
      confidence: aiResult.confidence,
      status: aiResult.status,
    });

    // Record usage
    await this.quotaService.recordUsage(tenantId, 500);

    await this.auditService.log({
      action: 'message_exchanged',
      entityType: 'message',
      entityId: aiMessage.id,
      userId: 'anonymous',
      tenantId,
      metadata: {
        conversationId: conversation.id,
        confidence: aiResult.confidence,
        status: aiResult.status,
      },
    });

    return { message: userMessage, response: aiMessage };
  }

  async getConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<IConversation | null> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      return null;
    }
    if (conversation.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return conversation;
  }

  async getConversationMessages(
    conversationId: string,
    tenantId: string,
    limit?: number,
  ): Promise<IMessage[]> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return this.conversationRepository.getMessages(conversationId, limit);
  }

  async closeConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<IConversation> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const updated = await this.conversationRepository.update(conversationId, {
      closedAt: new Date(),
    });

    await this.auditService.log({
      action: 'conversation_closed',
      entityType: 'conversation',
      entityId: conversationId,
      userId: 'anonymous',
      tenantId,
    });

    return updated;
  }

  async getWidgetConfig(tenantId: string): Promise<IWidgetConfig> {
    const config = await this.widgetConfigRepository.findByTenantId(tenantId);
    if (!config) {
      // Return default config
      return {
        id: '',
        tenantId,
        ...DEFAULT_WIDGET_CONFIG,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return config;
  }

  async updateWidgetConfig(
    input: UpdateWidgetConfigDto,
    tenantId: string,
    userId: string,
  ): Promise<IWidgetConfig> {
    const validationResult = UpdateWidgetConfigSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const config = await this.widgetConfigRepository.upsert(tenantId, validationResult.data);

    await this.auditService.log({
      action: 'widget_config_updated',
      entityType: 'widget_config',
      entityId: config.id,
      userId,
      tenantId,
      metadata: { changes: Object.keys(validationResult.data) },
    });

    return config;
  }

  async isWidgetEnabled(tenantId: string): Promise<boolean> {
    const config = await this.getWidgetConfig(tenantId);
    return config.enabled;
  }

  async isWithinBusinessHours(tenantId: string): Promise<boolean> {
    const config = await this.getWidgetConfig(tenantId);
    if (!config.businessHours?.enabled) {
      return true; // No business hours configured, always available
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toLocaleTimeString('en-GB', {
      timeZone: config.businessHours.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const todaySchedule = config.businessHours.schedule.find((s) => s.day === dayOfWeek);
    if (!todaySchedule) {
      return false;
    }

    return currentTime >= todaySchedule.open && currentTime <= todaySchedule.close;
  }
}
