/**
 * @kgc/koko-ai - Koko AI Module
 * Epic 31: Koko AI Chatbot (Gemini Flash)
 */

import { Module } from '@nestjs/common';
import { ChatWidgetService } from './services/chat-widget.service';
import { IntentRouterService } from './services/intent-router.service';
import { QuotaService } from './services/quota.service';

@Module({
  providers: [ChatWidgetService, IntentRouterService, QuotaService],
  exports: [ChatWidgetService, IntentRouterService, QuotaService],
})
export class KokoModule {}
