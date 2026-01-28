/**
 * @kgc/koko-ai - IntentRouterService
 * Epic 31: Story 31-2 - Intent Classification és Routing
 */

import { Injectable } from '@nestjs/common';
import {
  ApproveResponseDto,
  ApproveResponseSchema,
  ClassifyIntentDto,
  ClassifyIntentSchema,
  CreateKbArticleDto,
  CreateKbArticleSchema,
  SearchKnowledgeBaseDto,
  SearchKnowledgeBaseSchema,
} from '../dto/koko.dto';
import {
  IAiAnalysisResult,
  IAiResponseResult,
  IApprovalQueueItem,
  IKnowledgeBaseArticle,
  Intent,
  InteractionStatus,
  Language,
} from '../interfaces/koko.interface';

export interface IKnowledgeBaseRepository {
  create(data: Partial<IKnowledgeBaseArticle>): Promise<IKnowledgeBaseArticle>;
  findById(id: string): Promise<IKnowledgeBaseArticle | null>;
  findByTenantId(tenantId: string, language: Language): Promise<IKnowledgeBaseArticle[]>;
  searchByEmbedding(
    tenantId: string,
    embedding: number[],
    language: Language,
    limit: number
  ): Promise<{ article: IKnowledgeBaseArticle; similarity: number }[]>;
  update(id: string, data: Partial<IKnowledgeBaseArticle>): Promise<IKnowledgeBaseArticle>;
}

export interface IApprovalQueueRepository {
  create(data: Partial<IApprovalQueueItem>): Promise<IApprovalQueueItem>;
  findById(id: string): Promise<IApprovalQueueItem | null>;
  findPendingByTenantId(tenantId: string): Promise<IApprovalQueueItem[]>;
  update(id: string, data: Partial<IApprovalQueueItem>): Promise<IApprovalQueueItem>;
}

export interface IGeminiClient {
  generateContent(
    prompt: string,
    systemPrompt?: string
  ): Promise<{ text: string; tokenCount: number }>;
  generateEmbedding(text: string): Promise<number[]>;
  classifyIntent(message: string, language: Language): Promise<IAiAnalysisResult>;
}

export interface IChatwootService {
  escalateConversation(
    conversationId: string,
    tenantId: string,
    reason: string
  ): Promise<{ ticketId: string }>;
}

export interface IConversationRepository {
  findById(id: string): Promise<{
    id: string;
    tenantId: string;
    messages: { role: string; content: string }[];
  } | null>;
  addMessage(
    conversationId: string,
    message: { role: string; content: string; status: InteractionStatus }
  ): Promise<void>;
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

/** Confidence threshold for auto-send */
const AUTO_SEND_THRESHOLD = 0.8;
/** Confidence threshold below which we escalate */
const ESCALATION_THRESHOLD = 0.5;

@Injectable()
export class IntentRouterService {
  constructor(
    private readonly knowledgeBaseRepository: IKnowledgeBaseRepository,
    private readonly approvalQueueRepository: IApprovalQueueRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly geminiClient: IGeminiClient,
    private readonly chatwootService: IChatwootService,
    private readonly auditService: IAuditService
  ) {}

  async classifyIntent(input: ClassifyIntentDto, tenantId: string): Promise<IAiAnalysisResult> {
    const validationResult = ClassifyIntentSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const language = validInput.language || (await this.detectLanguage(validInput.message));

    const result = await this.geminiClient.classifyIntent(validInput.message, language);

    await this.auditService.log({
      action: 'intent_classified',
      entityType: 'classification',
      entityId: 'n/a',
      userId: 'system',
      tenantId,
      metadata: {
        intent: result.intent,
        confidence: result.confidence,
        language: result.language,
      },
    });

    return result;
  }

  async searchKnowledgeBase(
    input: SearchKnowledgeBaseDto,
    tenantId: string
  ): Promise<{ article: IKnowledgeBaseArticle; similarity: number }[]> {
    const validationResult = SearchKnowledgeBaseSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Generate embedding for semantic search
    const queryEmbedding = await this.geminiClient.generateEmbedding(validInput.query);

    // Search knowledge base
    const results = await this.knowledgeBaseRepository.searchByEmbedding(
      tenantId,
      queryEmbedding,
      validInput.language,
      validInput.limit
    );

    return results;
  }

  async processMessage(
    message: string,
    conversationId: string,
    tenantId: string,
    language: Language
  ): Promise<{
    response: string;
    confidence: number;
    status: InteractionStatus;
  }> {
    // Get conversation history for context
    const conversation = await this.conversationRepository.findById(conversationId);
    const history = conversation?.messages.slice(-10) || [];

    // Classify intent
    const analysis = await this.geminiClient.classifyIntent(message, language);

    // Search knowledge base for relevant content
    const kbResults = await this.searchKnowledgeBase(
      { query: message, language, intent: analysis.intent, limit: 3 },
      tenantId
    );

    // Generate response
    const responseResult = await this.generateResponse(
      message,
      analysis,
      kbResults.map(r => r.article),
      history,
      language,
      tenantId
    );

    // Decide action based on confidence
    if (responseResult.shouldEscalate) {
      // Escalate to human agent
      await this.chatwootService.escalateConversation(
        conversationId,
        tenantId,
        `Low confidence (${analysis.confidence.toFixed(2)}) - Intent: ${analysis.intent}`
      );

      return {
        response:
          language === 'hu'
            ? 'Kérdésed egy kollégámhoz irányítom, aki hamarosan válaszol.'
            : 'I am forwarding your question to a colleague who will respond shortly.',
        confidence: analysis.confidence,
        status: InteractionStatus.ESCALATED,
      };
    }

    if (responseResult.requiresApproval) {
      // Queue for manual approval
      await this.approvalQueueRepository.create({
        tenantId,
        conversationId,
        messageId: '',
        userMessage: message,
        aiResponse: responseResult.response,
        intent: analysis.intent,
        confidence: analysis.confidence,
        channel: 'web',
        language,
        status: 'pending',
      });

      return {
        response:
          language === 'hu'
            ? 'Köszönöm a kérdést! Válaszom ellenőrzés alatt van, hamarosan megkapod.'
            : 'Thank you for your question! My response is being reviewed and you will receive it shortly.',
        confidence: analysis.confidence,
        status: InteractionStatus.PENDING_APPROVAL,
      };
    }

    // Auto-send high confidence response
    return {
      response: responseResult.response,
      confidence: analysis.confidence,
      status: InteractionStatus.AUTO_APPROVED,
    };
  }

  async generateResponse(
    userMessage: string,
    analysis: IAiAnalysisResult,
    kbArticles: IKnowledgeBaseArticle[],
    history: { role: string; content: string }[],
    language: Language,
    _tenantId: string
  ): Promise<IAiResponseResult> {
    const systemPrompt =
      language === 'hu'
        ? `Te a KGC ügyfélszolgálati asszisztense vagy (név: Koko).
         Válaszolj magyarul, udvariasan és szakszerűen.
         Ha nem tudod a választ biztosan, jelezd.
         Intent: ${analysis.intent}
         Sentiment: ${analysis.sentiment}`
        : `You are KGC customer service assistant (name: Koko).
         Answer in English, politely and professionally.
         If you are not sure about the answer, indicate it.
         Intent: ${analysis.intent}
         Sentiment: ${analysis.sentiment}`;

    // Build context from KB articles
    const kbContext =
      kbArticles.length > 0
        ? `\n\nRelevant knowledge base entries:\n${kbArticles.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}`
        : '';

    // Build conversation context
    const historyContext =
      history.length > 0
        ? `\n\nConversation history:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}`
        : '';

    const prompt = `${historyContext}${kbContext}\n\nUser: ${userMessage}\n\nAssistant:`;

    const result = await this.geminiClient.generateContent(prompt, systemPrompt);

    // Determine action based on confidence
    const shouldAutoSend = analysis.confidence >= AUTO_SEND_THRESHOLD;
    const shouldEscalate =
      analysis.confidence < ESCALATION_THRESHOLD || analysis.sentiment === 'negative';
    const requiresApproval = !shouldAutoSend && !shouldEscalate;

    const responseResult: IAiResponseResult = {
      response: result.text,
      confidence: analysis.confidence,
      shouldAutoSend,
      requiresApproval,
      shouldEscalate,
    };
    if (kbArticles[0]?.id !== undefined) responseResult.kbArticleId = kbArticles[0].id;

    return responseResult;
  }

  async approveResponse(
    input: ApproveResponseDto,
    tenantId: string,
    userId: string
  ): Promise<IApprovalQueueItem> {
    const validationResult = ApproveResponseSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    const queueItem = await this.approvalQueueRepository.findById(validInput.queueItemId);
    if (!queueItem) {
      throw new Error('Queue item not found');
    }
    if (queueItem.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const finalResponse = validInput.editedResponse || queueItem.aiResponse;

    const updateData: Parameters<typeof this.approvalQueueRepository.update>[1] = {
      status: validInput.approved ? 'approved' : 'rejected',
      reviewedBy: userId,
      reviewedAt: new Date(),
    };
    if (validInput.editedResponse !== undefined)
      updateData.editedResponse = validInput.editedResponse;

    const updatedItem = await this.approvalQueueRepository.update(
      validInput.queueItemId,
      updateData
    );

    if (validInput.approved) {
      // Send response to user
      await this.conversationRepository.addMessage(queueItem.conversationId, {
        role: 'assistant',
        content: finalResponse,
        status: InteractionStatus.MANUAL_APPROVED,
      });

      // Add to knowledge base if requested
      if (validInput.addToKnowledgeBase) {
        const embedding = await this.geminiClient.generateEmbedding(queueItem.userMessage);
        await this.knowledgeBaseRepository.create({
          tenantId,
          categoryId: '00000000-0000-0000-0000-000000000000', // Default category
          language: queueItem.language,
          question: queueItem.userMessage,
          answer: finalResponse,
          intent: queueItem.intent,
          confidenceThreshold: 0.8,
          embedding,
          isActive: true,
          approvedBy: userId,
          approvedAt: new Date(),
        });
      }
    } else {
      // Escalate rejected items
      await this.chatwootService.escalateConversation(
        queueItem.conversationId,
        tenantId,
        'Response rejected by admin'
      );
    }

    await this.auditService.log({
      action: validInput.approved ? 'response_approved' : 'response_rejected',
      entityType: 'approval_queue',
      entityId: validInput.queueItemId,
      userId,
      tenantId,
      metadata: { addedToKb: validInput.addToKnowledgeBase },
    });

    return updatedItem;
  }

  async createKbArticle(
    input: CreateKbArticleDto,
    tenantId: string,
    userId: string
  ): Promise<IKnowledgeBaseArticle> {
    const validationResult = CreateKbArticleSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Generate embedding
    const embedding = await this.geminiClient.generateEmbedding(validInput.question);

    const article = await this.knowledgeBaseRepository.create({
      tenantId,
      categoryId: validInput.categoryId,
      language: validInput.language,
      question: validInput.question,
      answer: validInput.answer,
      intent: validInput.intent as Intent,
      confidenceThreshold: validInput.confidenceThreshold,
      embedding,
      isActive: true,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    await this.auditService.log({
      action: 'kb_article_created',
      entityType: 'kb_article',
      entityId: article.id,
      userId,
      tenantId,
    });

    return article;
  }

  async getPendingApprovals(tenantId: string): Promise<IApprovalQueueItem[]> {
    return this.approvalQueueRepository.findPendingByTenantId(tenantId);
  }

  private async detectLanguage(text: string): Promise<Language> {
    // Simple heuristic: Hungarian characters
    if (/[áéíóöőúüű]/i.test(text)) {
      return 'hu';
    }
    return 'en';
  }
}
