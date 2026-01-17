/**
 * @kgc/service-worksheet - NestJS Module
 * Epic 17: Work Orders
 *
 * Provides dependency injection configuration for worksheet services
 */

import { Module } from '@nestjs/common';
import { WorksheetService } from './services/worksheet.service';
import { WorksheetStateService } from './services/worksheet-state.service';
import { DiagnosisService } from './services/diagnosis.service';
import { WorksheetItemService } from './services/worksheet-item.service';
import { WorksheetRentalService } from './services/worksheet-rental.service';
import { WorksheetQueueService } from './services/worksheet-queue.service';

/**
 * Service Worksheet Module
 *
 * Note: Repository and external service implementations must be provided
 * by the consuming application module via custom providers.
 *
 * Required providers:
 * - IWorksheetRepository
 * - IDiagnosisRepository
 * - IWorksheetItemRepository
 * - IPartnerService
 * - IRentalService
 * - IInventoryService
 * - IAuditService
 */
@Module({
  providers: [
    WorksheetService,
    WorksheetStateService,
    DiagnosisService,
    WorksheetItemService,
    WorksheetRentalService,
    WorksheetQueueService,
  ],
  exports: [
    WorksheetService,
    WorksheetStateService,
    DiagnosisService,
    WorksheetItemService,
    WorksheetRentalService,
    WorksheetQueueService,
  ],
})
export class ServiceWorksheetModule {}
