/**
 * @kgc/chatwoot - EscalationService
 * Epic 29: Story 29-2 - AI Escalation Chatwoot-ba
 */

import { Injectable } from '@nestjs/common';
import {
  ITicket,
  IEscalation,
  IAiAnalysis,
  IAgent,
  EscalationReason,
  TicketPriority,
} from '../interfaces/chatwoot.interface';
import {
  EscalateTicketDto,
  EscalateTicketSchema,
  AiAnalyzeDto,
  AiAnalyzeSchema,
} from '../dto/chatwoot.dto';

export interface IEscalationRepository {
  create(data: Partial<IEscalation>): Promise<IEscalation>;
  findById(id: string): Promise<IEscalation | null>;
  findByTicketId(ticketId: string): Promise<IEscalation[]>;
  findPendingByTenantId(tenantId: string): Promise<IEscalation[]>;
  update(id: string, data: Partial<IEscalation>): Promise<IEscalation>;
}

export interface ITicketRepository {
  findById(id: string): Promise<ITicket | null>;
  update(id: string, data: Partial<ITicket>): Promise<ITicket>;
}

export interface IAgentRepository {
  findById(id: string): Promise<IAgent | null>;
  findAvailableByTenantId(tenantId: string): Promise<IAgent[]>;
  findBySkills(tenantId: string, skills: string[]): Promise<IAgent[]>;
}

export interface IAiService {
  analyzeMessage(
    content: string,
    conversationHistory?: { role: string; content: string }[],
  ): Promise<IAiAnalysis>;
  classifyIntent(content: string): Promise<{ intent: string; confidence: number }>;
  analyzeSentiment(content: string): Promise<{ sentiment: 'positive' | 'neutral' | 'negative'; score: number }>;
  generateResponse(context: {
    ticketSubject: string;
    customerMessage: string;
    previousMessages?: string[];
  }): Promise<{ response: string; confidence: number }>;
}

export interface IChatwootClient {
  assignAgent(conversationId: string, agentId: string): Promise<void>;
  sendMessage(conversationId: string, content: string, isPrivate?: boolean): Promise<{ id: string }>;
  addNote(conversationId: string, note: string): Promise<void>;
}

export interface INotificationService {
  notifyAgent(agentId: string, notification: {
    type: string;
    title: string;
    message: string;
    ticketId: string;
    priority: string;
  }): Promise<void>;
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

/** Confidence threshold below which AI suggests escalation */
const AI_CONFIDENCE_THRESHOLD = 0.7;
// Note: NEGATIVE_SENTIMENT_THRESHOLD = -0.5 (reserved for future sentiment-based escalation)

@Injectable()
export class EscalationService {
  constructor(
    private readonly escalationRepository: IEscalationRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly agentRepository: IAgentRepository,
    private readonly aiService: IAiService,
    private readonly chatwootClient: IChatwootClient,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
  ) {}

  async escalateTicket(
    input: EscalateTicketDto,
    tenantId: string,
    userId: string,
  ): Promise<IEscalation> {
    const validationResult = EscalateTicketSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    const ticket = await this.ticketRepository.findById(validInput.ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    // Find target agent if not specified
    let targetAgentId = validInput.toAgentId;
    let targetAgentName: string | undefined;

    if (!targetAgentId) {
      const availableAgents = await this.agentRepository.findAvailableByTenantId(tenantId);
      const selectedAgent = this.selectBestAgent(availableAgents, ticket);
      if (selectedAgent) {
        targetAgentId = selectedAgent.id;
        targetAgentName = selectedAgent.name;
      }
    } else {
      const agent = await this.agentRepository.findById(targetAgentId);
      if (!agent) {
        throw new Error('Target agent not found');
      }
      targetAgentName = agent.name;
    }

    const escalation = await this.escalationRepository.create({
      tenantId,
      ticketId: validInput.ticketId,
      fromAgentId: ticket.assignedAgentId,
      toAgentId: targetAgentId,
      reason: validInput.reason as EscalationReason,
      notes: validInput.notes,
    });

    // Update ticket assignment
    if (targetAgentId) {
      await this.ticketRepository.update(validInput.ticketId, {
        assignedAgentId: targetAgentId,
        assignedAgentName: targetAgentName,
        priority: this.upgradePriorityIfNeeded(ticket.priority, validInput.reason as EscalationReason),
      });

      // Assign in Chatwoot
      await this.chatwootClient.assignAgent(ticket.chatwootConversationId, targetAgentId);

      // Add private note about escalation
      await this.chatwootClient.addNote(
        ticket.chatwootConversationId,
        `Escalated: ${validInput.reason}${validInput.notes ? ` - ${validInput.notes}` : ''}`,
      );

      // Notify agent
      await this.notificationService.notifyAgent(targetAgentId, {
        type: 'escalation',
        title: `Escalated Ticket: ${ticket.ticketNumber}`,
        message: `Reason: ${validInput.reason}`,
        ticketId: validInput.ticketId,
        priority: ticket.priority,
      });
    }

    await this.auditService.log({
      action: 'ticket_escalated',
      entityType: 'escalation',
      entityId: escalation.id,
      userId,
      tenantId,
      metadata: {
        ticketId: validInput.ticketId,
        reason: validInput.reason,
        fromAgentId: ticket.assignedAgentId,
        toAgentId: targetAgentId,
      },
    });

    return escalation;
  }

  async analyzeAndSuggestEscalation(
    input: AiAnalyzeDto,
    tenantId: string,
    userId: string,
  ): Promise<{
    shouldEscalate: boolean;
    reason?: EscalationReason;
    analysis: IAiAnalysis;
    suggestedAgentId?: string;
  }> {
    const validationResult = AiAnalyzeSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    const ticket = await this.ticketRepository.findById(validInput.ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    // Perform AI analysis
    const analysis = await this.aiService.analyzeMessage(
      validInput.messageContent,
      validInput.conversationHistory,
    );

    let shouldEscalate = false;
    let reason: EscalationReason | undefined;
    let suggestedAgentId: string | undefined;

    // Check for escalation triggers
    if (analysis.confidence < AI_CONFIDENCE_THRESHOLD) {
      shouldEscalate = true;
      reason = EscalationReason.AI_CONFIDENCE_LOW;
    } else if (analysis.sentiment === 'negative') {
      shouldEscalate = true;
      reason = EscalationReason.SENTIMENT_NEGATIVE;
    }

    // Find suitable agent if escalation needed
    if (shouldEscalate) {
      const availableAgents = await this.agentRepository.findAvailableByTenantId(tenantId);
      const selectedAgent = this.selectBestAgent(availableAgents, ticket);
      if (selectedAgent) {
        suggestedAgentId = selectedAgent.id;
      }
    }

    await this.auditService.log({
      action: 'ai_analysis_performed',
      entityType: 'ai_analysis',
      entityId: validInput.ticketId,
      userId,
      tenantId,
      metadata: {
        confidence: analysis.confidence,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        shouldEscalate,
        reason,
      },
    });

    return {
      shouldEscalate,
      reason,
      analysis,
      suggestedAgentId,
    };
  }

  async autoEscalateIfNeeded(
    ticketId: string,
    messageContent: string,
    tenantId: string,
  ): Promise<IEscalation | null> {
    const result = await this.analyzeAndSuggestEscalation(
      { ticketId, messageContent },
      tenantId,
      'system',
    );

    if (result.shouldEscalate && result.reason) {
      return this.escalateTicket(
        {
          ticketId,
          reason: result.reason,
          toAgentId: result.suggestedAgentId,
          notes: `Auto-escalated by AI. Analysis: ${JSON.stringify({
            confidence: result.analysis.confidence,
            sentiment: result.analysis.sentiment,
            intent: result.analysis.intent,
          })}`,
        },
        tenantId,
        'system',
      );
    }

    return null;
  }

  async generateAiResponse(
    ticketId: string,
    customerMessage: string,
    tenantId: string,
  ): Promise<{ response: string; confidence: number; autoSend: boolean }> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const result = await this.aiService.generateResponse({
      ticketSubject: ticket.subject,
      customerMessage,
    });

    // Only auto-send if confidence is high
    const autoSend = result.confidence >= 0.9;

    return {
      response: result.response,
      confidence: result.confidence,
      autoSend,
    };
  }

  async getEscalationHistory(ticketId: string, tenantId: string): Promise<IEscalation[]> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    return this.escalationRepository.findByTicketId(ticketId);
  }

  async resolveEscalation(
    escalationId: string,
    tenantId: string,
    userId: string,
  ): Promise<IEscalation> {
    const escalation = await this.escalationRepository.findById(escalationId);
    if (!escalation) {
      throw new Error('Escalation not found');
    }
    if (escalation.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const updatedEscalation = await this.escalationRepository.update(escalationId, {
      resolvedAt: new Date(),
    });

    await this.auditService.log({
      action: 'escalation_resolved',
      entityType: 'escalation',
      entityId: escalationId,
      userId,
      tenantId,
      metadata: { ticketId: escalation.ticketId },
    });

    return updatedEscalation;
  }

  private selectBestAgent(agents: IAgent[], _ticket: ITicket): IAgent | null {
    if (agents.length === 0) return null;

    // Sort by availability (online first, then by active ticket count)
    const sortedAgents = [...agents].sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return a.activeTicketCount - b.activeTicketCount;
    });

    return sortedAgents[0] ?? null;
  }

  private upgradePriorityIfNeeded(
    currentPriority: TicketPriority,
    reason: EscalationReason,
  ): TicketPriority {
    const criticalReasons = [
      EscalationReason.SLA_BREACH,
      EscalationReason.SENTIMENT_NEGATIVE,
      EscalationReason.CUSTOMER_REQUEST,
    ];

    if (criticalReasons.includes(reason) && currentPriority !== TicketPriority.URGENT) {
      const priorityOrder = [
        TicketPriority.LOW,
        TicketPriority.MEDIUM,
        TicketPriority.HIGH,
        TicketPriority.URGENT,
      ];
      const currentIndex = priorityOrder.indexOf(currentPriority);
      return priorityOrder[Math.min(currentIndex + 1, priorityOrder.length - 1)] ?? currentPriority;
    }

    return currentPriority;
  }
}
