// @kgc/service-warranty - Warranty Claims (Garanciális igények) modul
// Epic 19: Warranty Claims

// Interfaces - Type exports
export type {
  IWarrantyClaim,
  IWarrantyClaimRepository,
  ICreateWarrantyClaimInput,
  IUpdateClaimStatusInput,
  ISettleClaimInput,
  IWarrantyClaimSummary,
  IWarrantyCheckResult,
} from './interfaces/warranty-claim.interface';

export {
  WarrantyClaimStatus,
  WarrantySupplier,
  WarrantyType,
} from './interfaces/warranty-claim.interface';

export type {
  IWarrantyCheckInput,
  IDetailedWarrantyCheckResult,
  IDeviceWarrantyInfo,
  ISupplierWarrantyRules,
  IWarrantyCheckService,
} from './interfaces/warranty-check.interface';

export {
  WarrantyRejectionReason,
  WarrantyWarningType,
} from './interfaces/warranty-check.interface';

// DTOs
export {
  WarrantyCheckInputSchema,
  CreateWarrantyClaimSchema,
  UpdateClaimStatusSchema,
  SettleClaimSchema,
  ClaimFilterSchema,
  ClaimReportFilterSchema,
} from './dto/warranty-claim.dto';

export type {
  WarrantyCheckInputDto,
  CreateWarrantyClaimDto,
  UpdateClaimStatusDto,
  SettleClaimDto,
  ClaimFilterDto,
  ClaimReportFilterDto,
} from './dto/warranty-claim.dto';

// Services
export { WarrantyCheckService } from './services/warranty-check.service';
export type {
  IDeviceRegistryService,
  IWarrantyHistoryService,
} from './services/warranty-check.service';
export {
  DEVICE_REGISTRY_SERVICE,
  WARRANTY_HISTORY_SERVICE,
} from './services/warranty-check.service';

export { WarrantyClaimService } from './services/warranty-claim.service';
export type {
  IAuditService,
  IWorksheetService,
} from './services/warranty-claim.service';
export {
  WARRANTY_CLAIM_REPOSITORY,
  AUDIT_SERVICE,
  WORKSHEET_SERVICE,
} from './services/warranty-claim.service';

// NestJS Module
export { ServiceWarrantyModule } from './service-warranty.module';
