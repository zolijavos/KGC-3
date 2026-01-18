/**
 * @kgc/horilla-hr - Horilla HR Integration Module
 * Epic 30: Horilla HR Integration
 */

// Module
export { HorillaHrModule } from './horilla-hr.module';

// Services
export { EmployeeSyncService } from './services/employee-sync.service';
export type {
  IHorillaApiClient,
  IUserRepository,
  IEmployeeMappingRepository,
  IConfigRepository,
  IAuditService,
} from './services/employee-sync.service';

// Interfaces
export type {
  IHorillaEmployee,
  IKgcUser,
  IEmployeeMapping,
  ISyncResult,
  IHorillaConfig,
} from './interfaces/horilla-hr.interface';
export {
  EmployeeStatus,
  SyncDirection,
  SyncStatus,
} from './interfaces/horilla-hr.interface';

// DTOs
export type {
  HorillaConfigDto,
  SyncEmployeesDto,
  CreateEmployeeMappingDto,
} from './dto/horilla-hr.dto';
export {
  HorillaConfigSchema,
  SyncEmployeesSchema,
  CreateEmployeeMappingSchema,
} from './dto/horilla-hr.dto';
