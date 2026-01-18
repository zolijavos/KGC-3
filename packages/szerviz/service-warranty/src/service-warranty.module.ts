/**
 * @kgc/service-warranty - NestJS Module
 * Epic 19: Warranty Claims
 *
 * Provides dependency injection configuration for warranty services
 */

import { Module } from '@nestjs/common';
import { WarrantyCheckService } from './services/warranty-check.service';
import { WarrantyClaimService } from './services/warranty-claim.service';

/**
 * Service Warranty Module
 *
 * Note: Repository and external service implementations must be provided
 * by the consuming application module via custom providers.
 *
 * Required providers:
 * - DEVICE_REGISTRY_SERVICE (IDeviceRegistryService)
 * - WARRANTY_HISTORY_SERVICE (IWarrantyHistoryService)
 * - WARRANTY_CLAIM_REPOSITORY (IWarrantyClaimRepository)
 * - AUDIT_SERVICE (IAuditService)
 * - WORKSHEET_SERVICE (IWorksheetService)
 *
 * Example:
 * ```typescript
 * @Module({
 *   imports: [ServiceWarrantyModule],
 *   providers: [
 *     { provide: DEVICE_REGISTRY_SERVICE, useClass: DeviceRegistryServiceImpl },
 *     { provide: WARRANTY_HISTORY_SERVICE, useClass: WarrantyHistoryServiceImpl },
 *     { provide: WARRANTY_CLAIM_REPOSITORY, useClass: WarrantyClaimPrismaRepository },
 *     { provide: AUDIT_SERVICE, useClass: AuditServiceImpl },
 *     { provide: WORKSHEET_SERVICE, useClass: WorksheetServiceImpl },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  providers: [
    WarrantyCheckService,
    WarrantyClaimService,
  ],
  exports: [
    WarrantyCheckService,
    WarrantyClaimService,
  ],
})
export class ServiceWarrantyModule {}
