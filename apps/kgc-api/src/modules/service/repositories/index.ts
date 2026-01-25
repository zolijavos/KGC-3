/**
 * Service Module Repositories
 * Epic 17: Munkalap CRUD
 * Epic 19: Garanciális megkülönböztetés
 * Epic 20: Szerviz Norma
 */

export {
  PrismaWorksheetItemRepository,
  // Repositories
  PrismaWorksheetRepository,
  WORKSHEET_ITEM_REPOSITORY,
  // Tokens
  WORKSHEET_REPOSITORY,
  WorksheetPriority,
  // Enums
  WorksheetStatus,
  WorksheetType,
  type ILaborItemCalculation,
  type IQueueReorderResult,
  type IRentalWorksheetStats,
  type IStorageFeeCalculation,
  type IWorksheet,
  type IWorksheetItem,
  type IWorksheetItemRepository,
  type IWorksheetLaborSummary,
  // Interfaces
  type IWorksheetRepository,
  type WorksheetFilterDto,
} from './prisma-worksheet.repository';

export {
  ClaimItemType,
  // Repository
  PrismaWarrantyClaimRepository,
  // Token
  WARRANTY_CLAIM_REPOSITORY,
  // Enums
  WarrantyClaimStatus,
  WarrantySupplier,
  WarrantyType,
  type IBulkSettleResult,
  type IClaimItem,
  type ICreateClaimItemInput,
  type ICreateWarrantyClaimInput,
  type ILinkedWorksheet,
  type IProcessingTimeStats,
  type ISettlementSummary,
  type IStatusTimelineEntry,
  type IUpdateClaimStatusInput,
  type IUpdateWarrantyClaimInput,
  type IWarrantyClaim,
  // Interfaces
  type IWarrantyClaimRepository,
  type IWarrantyClaimSummary,
  type WarrantyClaimFilterDto,
} from './prisma-warranty-claim.repository';

export {
  // Enums
  DifficultyLevel,
  NormaManufacturer,
  // Repository
  PrismaServiceNormRepository,
  // Token
  SERVICE_NORM_REPOSITORY,
  type ICreateServiceNormInput,
  type IImportServiceNormInput,
  type ILaborCalculationResult,
  type IServiceNorm,
  type IServiceNormImportResult,
  // Interfaces
  type IServiceNormRepository,
  type IUpdateServiceNormInput,
  type ServiceNormFilterDto,
} from './prisma-service-norm.repository';

export {
  // Token
  DIAGNOSTIC_CODE_REPOSITORY,
  // Enums
  DiagnosticSeverity,
  // Repository
  PrismaDiagnosticCodeRepository,
  type DiagnosticFilterDto,
  type ICreateDiagnosticInput,
  type IDiagnosticCode,
  // Interfaces
  type IDiagnosticCodeRepository,
  type IDiagnosticSummary,
  type IUpdateDiagnosticInput,
} from './prisma-diagnostic.repository';
