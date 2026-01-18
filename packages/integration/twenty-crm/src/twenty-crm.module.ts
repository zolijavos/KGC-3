/**
 * @kgc/twenty-crm - Twenty CRM Module
 * Epic 28: Twenty CRM Integration
 */

import { Module } from '@nestjs/common';
import { PartnerSyncService } from './services/partner-sync.service';
import { DashboardEmbedService } from './services/dashboard-embed.service';

@Module({
  providers: [PartnerSyncService, DashboardEmbedService],
  exports: [PartnerSyncService, DashboardEmbedService],
})
export class TwentyCrmModule {}
