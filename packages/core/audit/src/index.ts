// Services
export { AuditService, AUDIT_REPOSITORY, AUDIT_ERROR_CODES } from './services/audit.service';
export { EncryptionService } from './services/encryption.service';
export { DataDeletionService, DELETION_REQUEST_REPOSITORY } from './services/data-deletion.service';
export { AuditExportService } from './services/audit-export.service';
export type {
  ExportFormat,
  ExportResult,
  AggregationGroupBy,
  AggregationOptions,
  AggregationResult,
  SearchOptions,
  DailySummaryOptions,
  DailySummary,
  EntityHistoryOptions,
  EntityHistoryResult,
} from './services/audit-export.service';
export { RetentionPolicyService, ARCHIVE_STORAGE } from './services/retention-policy.service';

// Interfaces - Audit
export type { AuditAction, AuditEntityType } from './interfaces/audit.interface';
export type {
  AuditEntry,
  AuditChanges,
  CreateAuditEntryInput,
  AuditQueryOptions,
  AuditQueryResult,
  IAuditRepository,
  AuditContext,
  AuditedOptions,
} from './interfaces/audit.interface';

// Interfaces - Encryption
export type { PIIFieldType } from './interfaces/encryption.interface';
export type {
  EncryptedValue,
  EncryptOptions,
  DecryptOptions,
  KeyRotationStatus,
  IEncryptionService,
  EncryptionConfig,
  EncryptedFieldMetadata,
} from './interfaces/encryption.interface';

// Interfaces - Data Deletion
export type { DeletionStrategy, DeletionRequestStatus } from './interfaces/data-deletion.interface';
export type {
  EntityDeletionConfig,
  EntityDependency,
  CreateDeletionRequestInput,
  DeletionRequest,
  DeletionLogEntry,
  DeletionResult,
  DeletionRequestQueryOptions,
  IDataDeletionService,
  IDeletionRequestRepository,
} from './interfaces/data-deletion.interface';

// Interfaces - Retention
export { DEFAULT_RETENTION_POLICY } from './interfaces/retention.interface';
export type { ArchiveStatus } from './interfaces/retention.interface';
export type {
  RetentionPolicy,
  ArchiveBatch,
  ArchiveJob,
  RestoreRequest,
  CleanupResult,
  IRetentionPolicyService,
  RetentionStatistics,
  IArchiveStorage,
} from './interfaces/retention.interface';

// DTOs
export {
  AuditActionSchema,
  AuditEntityTypeSchema,
  AuditChangesSchema,
  CreateAuditEntrySchema,
  AuditQuerySchema,
  AuditEntryResponseSchema,
  AuditQueryResultSchema,
  validateAuditEntry,
  validateAuditQuery,
} from './dto/audit.dto';
export type {
  AuditActionDto,
  AuditEntityTypeDto,
  AuditChangesDto,
  CreateAuditEntryDto,
  AuditQueryDto,
  AuditEntryResponseDto,
  AuditQueryResultDto,
} from './dto/audit.dto';
