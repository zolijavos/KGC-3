/**
 * @kgc/chatwoot - TicketService
 * Epic 29: Story 29-1 - Support Ticket Integracio
 */

import { Injectable } from '@nestjs/common';
import {
  ITicket,
  ITicketMessage,
  TicketStatus,
  TicketPriority,
  TicketSource,
} from '../interfaces/chatwoot.interface';
import {
  CreateTicketDto,
  CreateTicketSchema,
  UpdateTicketDto,
  UpdateTicketSchema,
  AddMessageDto,
  AddMessageSchema,
  SearchTicketsDto,
  SearchTicketsSchema,
  WebhookPayloadDto,
  WebhookPayloadSchema,
} from '../dto/chatwoot.dto';

export interface ITicketRepository {
  create(data: Partial<ITicket>): Promise<ITicket>;
  findById(id: string): Promise<ITicket | null>;
  findByConversationId(tenantId: string, conversationId: string): Promise<ITicket | null>;
  findByTicketNumber(ticketNumber: string): Promise<ITicket | null>;
  update(id: string, data: Partial<ITicket>): Promise<ITicket>;
  search(tenantId: string, criteria: SearchTicketsDto): Promise<{ tickets: ITicket[]; total: number }>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
}

export interface IMessageRepository {
  create(data: Partial<ITicketMessage>): Promise<ITicketMessage>;
  findByTicketId(ticketId: string): Promise<ITicketMessage[]>;
  findById(id: string): Promise<ITicketMessage | null>;
}

export interface IChatwootClient {
  getConversation(conversationId: string): Promise<{
    id: string;
    messages: { id: string; content: string; sender_type: string }[];
    contact: { name: string; email?: string; phone?: string };
  } | null>;
  sendMessage(conversationId: string, content: string, isPrivate?: boolean): Promise<{ id: string }>;
  updateConversationStatus(conversationId: string, status: string): Promise<void>;
  assignAgent(conversationId: string, agentId: string): Promise<void>;
  addLabel(conversationId: string, label: string): Promise<void>;
}

export interface IPartnerService {
  findByEmail(tenantId: string, email: string): Promise<{ id: string; name: string } | null>;
  findByPhone(tenantId: string, phone: string): Promise<{ id: string; name: string } | null>;
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

@Injectable()
export class TicketService {
  constructor(
    private readonly ticketRepository: ITicketRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly chatwootClient: IChatwootClient,
    private readonly partnerService: IPartnerService,
    private readonly auditService: IAuditService,
  ) {}

  async createTicket(
    input: CreateTicketDto,
    tenantId: string,
    userId: string,
  ): Promise<ITicket> {
    const validationResult = CreateTicketSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Check if ticket already exists for this conversation
    const existingTicket = await this.ticketRepository.findByConversationId(
      tenantId,
      validInput.chatwootConversationId,
    );
    if (existingTicket) {
      throw new Error('Ticket already exists for this conversation');
    }

    // Try to find existing customer
    let customerId = validInput.customerId;
    if (!customerId && validInput.customerEmail) {
      const partner = await this.partnerService.findByEmail(tenantId, validInput.customerEmail);
      if (partner) {
        customerId = partner.id;
      }
    }

    // Generate ticket number
    const year = new Date().getFullYear();
    const sequence = await this.ticketRepository.getNextSequence(tenantId, year);
    const ticketNumber = `TKT-${year}-${String(sequence).padStart(5, '0')}`;

    const ticket = await this.ticketRepository.create({
      tenantId,
      chatwootConversationId: validInput.chatwootConversationId,
      ticketNumber,
      subject: validInput.subject,
      description: validInput.description,
      status: TicketStatus.OPEN,
      priority: validInput.priority as TicketPriority,
      source: validInput.source as TicketSource,
      ...(customerId !== undefined && { customerId }),
      customerName: validInput.customerName,
      ...(validInput.customerEmail !== undefined && { customerEmail: validInput.customerEmail }),
      ...(validInput.customerPhone !== undefined && { customerPhone: validInput.customerPhone }),
      tags: validInput.tags,
      ...(validInput.metadata !== undefined && { metadata: validInput.metadata }),
    });

    // Add label in Chatwoot
    await this.chatwootClient.addLabel(validInput.chatwootConversationId, `kgc-${ticketNumber}`);

    await this.auditService.log({
      action: 'ticket_created',
      entityType: 'ticket',
      entityId: ticket.id,
      userId,
      tenantId,
      metadata: {
        ticketNumber,
        source: validInput.source,
        priority: validInput.priority,
      },
    });

    return ticket;
  }

  async updateTicket(
    ticketId: string,
    input: UpdateTicketDto,
    tenantId: string,
    userId: string,
  ): Promise<ITicket> {
    const validationResult = UpdateTicketSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const validInput = validationResult.data;

    // Prepare update data
    const updateData: Partial<ITicket> = {};
    if (validInput.subject) updateData.subject = validInput.subject;
    if (validInput.description) updateData.description = validInput.description;
    if (validInput.priority) updateData.priority = validInput.priority as TicketPriority;
    if (validInput.tags) updateData.tags = validInput.tags;
    if (validInput.metadata) updateData.metadata = validInput.metadata;
    if (validInput.assignedAgentId !== undefined && validInput.assignedAgentId !== null && validInput.assignedAgentId !== '') {
      updateData.assignedAgentId = validInput.assignedAgentId;
    }

    // Handle status change
    if (validInput.status) {
      updateData.status = validInput.status as TicketStatus;
      if (validInput.status === TicketStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      } else if (validInput.status === TicketStatus.CLOSED) {
        updateData.closedAt = new Date();
      }

      // Sync status to Chatwoot
      await this.chatwootClient.updateConversationStatus(
        ticket.chatwootConversationId,
        this.mapStatusToChatwoot(validInput.status as TicketStatus),
      );
    }

    // Handle agent assignment
    if (validInput.assignedAgentId && validInput.assignedAgentId !== ticket.assignedAgentId) {
      await this.chatwootClient.assignAgent(
        ticket.chatwootConversationId,
        validInput.assignedAgentId,
      );
    }

    const updatedTicket = await this.ticketRepository.update(ticketId, updateData);

    await this.auditService.log({
      action: 'ticket_updated',
      entityType: 'ticket',
      entityId: ticketId,
      userId,
      tenantId,
      metadata: { changes: Object.keys(validInput) },
    });

    return updatedTicket;
  }

  async addMessage(
    input: AddMessageDto,
    tenantId: string,
    userId: string,
  ): Promise<ITicketMessage> {
    const validationResult = AddMessageSchema.safeParse(input);
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

    // Send message to Chatwoot if it's from agent or bot
    let chatwootMessageId = '';
    if (validInput.senderType === 'agent' || validInput.senderType === 'bot') {
      const result = await this.chatwootClient.sendMessage(
        ticket.chatwootConversationId,
        validInput.content,
        validInput.senderType === 'bot',
      );
      chatwootMessageId = result.id;
    }

    const message = await this.messageRepository.create({
      ticketId: validInput.ticketId,
      chatwootMessageId,
      content: validInput.content,
      contentType: validInput.contentType,
      senderType: validInput.senderType,
      senderId: validInput.senderId,
      senderName: validInput.senderName,
    });

    // Update ticket to pending if customer message on resolved ticket
    if (validInput.senderType === 'customer' && ticket.status === TicketStatus.RESOLVED) {
      await this.ticketRepository.update(validInput.ticketId, {
        status: TicketStatus.PENDING,
      });
    }

    await this.auditService.log({
      action: 'ticket_message_added',
      entityType: 'ticket_message',
      entityId: message.id,
      userId,
      tenantId,
      metadata: {
        ticketId: validInput.ticketId,
        senderType: validInput.senderType,
      },
    });

    return message;
  }

  async handleWebhook(
    input: WebhookPayloadDto,
    tenantId: string,
  ): Promise<{ processed: boolean; ticketId?: string }> {
    const validationResult = WebhookPayloadSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Find existing ticket for this conversation
    const ticket = await this.ticketRepository.findByConversationId(
      tenantId,
      validInput.conversationId,
    );

    switch (validInput.event) {
      case 'message_created':
        if (ticket && validInput.content) {
          await this.messageRepository.create({
            ticketId: ticket.id,
            chatwootMessageId: validInput.messageId || '',
            content: validInput.content,
            contentType: 'text',
            senderType: 'customer',
            senderId: validInput.senderId || 'unknown',
            senderName: 'Customer',
          });
          return { processed: true, ticketId: ticket.id };
        }
        break;

      case 'conversation_status_changed':
        if (ticket && validInput.metadata?.status) {
          const newStatus = this.mapChatwootStatus(validInput.metadata.status as string);
          if (newStatus) {
            await this.ticketRepository.update(ticket.id, { status: newStatus });
          }
          return { processed: true, ticketId: ticket.id };
        }
        break;

      case 'conversation_resolved':
        if (ticket) {
          await this.ticketRepository.update(ticket.id, {
            status: TicketStatus.RESOLVED,
            resolvedAt: new Date(),
          });
          return { processed: true, ticketId: ticket.id };
        }
        break;
    }

    return { processed: false };
  }

  async getTicket(ticketId: string, tenantId: string): Promise<ITicket | null> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      return null;
    }
    if (ticket.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return ticket;
  }

  async getTicketMessages(ticketId: string, tenantId: string): Promise<ITicketMessage[]> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }
    if (ticket.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return this.messageRepository.findByTicketId(ticketId);
  }

  async searchTickets(
    input: SearchTicketsDto,
    tenantId: string,
  ): Promise<{ tickets: ITicket[]; total: number }> {
    const validationResult = SearchTicketsSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    return this.ticketRepository.search(tenantId, validationResult.data);
  }

  private mapStatusToChatwoot(status: TicketStatus): string {
    const mapping: Record<TicketStatus, string> = {
      [TicketStatus.OPEN]: 'open',
      [TicketStatus.PENDING]: 'pending',
      [TicketStatus.RESOLVED]: 'resolved',
      [TicketStatus.CLOSED]: 'resolved',
    };
    return mapping[status] || 'open';
  }

  private mapChatwootStatus(status: string): TicketStatus | null {
    const mapping: Record<string, TicketStatus> = {
      open: TicketStatus.OPEN,
      pending: TicketStatus.PENDING,
      resolved: TicketStatus.RESOLVED,
      snoozed: TicketStatus.PENDING,
    };
    return mapping[status] || null;
  }
}
