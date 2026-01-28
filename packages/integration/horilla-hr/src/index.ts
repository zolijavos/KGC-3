/**
 * @kgc/horilla-hr - Horilla HR Integration Module
 * Epic 30: Horilla HR Integration
 */

// Module
export { HorillaHrModule } from './horilla-hr.module';

// Services
export { EmployeeSyncService } from './services/employee-sync.service';
export type {
  IAuditService,
  IConfigRepository,
  IEmployeeMappingRepository,
  IHorillaApiClient,
  IUserRepository,
} from './services/employee-sync.service';

// Interfaces
export {
  ConflictResolutionStrategy,
  EmployeeStatus,
  SyncDirection,
  SyncStatus,
} from './interfaces/horilla-hr.interface';
export type {
  IConflictRecord,
  IEmployeeMapping,
  IHorillaConfig,
  IHorillaEmployee,
  IKgcUser,
  ISyncError,
  ISyncResult,
  ISyncResultExtended,
} from './interfaces/horilla-hr.interface';

// DTOs
export {
  ConflictResolutionEnum,
  CreateEmployeeMappingSchema,
  HorillaConfigSchema,
  SyncDirectionEnum,
  SyncEmployeesExtendedSchema,
  SyncEmployeesSchema,
} from './dto/horilla-hr.dto';
export type {
  CreateEmployeeMappingDto,
  HorillaConfigDto,
  SyncEmployeesDto,
  SyncEmployeesExtendedDto,
} from './dto/horilla-hr.dto';
