/**
 * @kgc/chatwoot - Chatwoot Module
 * Epic 29: Chatwoot Integration
 */

import { Module } from '@nestjs/common';
import { TicketService } from './services/ticket.service';
import { EscalationService } from './services/escalation.service';

@Module({
  providers: [TicketService, EscalationService],
  exports: [TicketService, EscalationService],
})
export class ChatwootModule {}
