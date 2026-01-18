/**
 * @kgc/horilla-hr - Horilla HR Integration Module
 * Epic 30: Horilla HR Integration
 */

// Module
export { HorillaHrModule } from './horilla-hr.module';

// Services
export {
  EmployeeSyncService,
  IHorillaApiClient,
  IUserRepository,
  IEmployeeMappingRepository,
  IConfigRepository,
  IAuditService,
} from './services/employee-sync.service';

// Interfaces
export {
  IHorillaEmployee,
  IKgcUser,
  IEmployeeMapping,
  ISyncResult,
  IHorillaConfig,
  EmployeeStatus,
  SyncDirection,
  SyncStatus,
} from './interfaces/horilla-hr.interface';

// DTOs
export {
  HorillaConfigDto,
  HorillaConfigSchema,
  SyncEmployeesDto,
  SyncEmployeesSchema,
  CreateEmployeeMappingDto,
  CreateEmployeeMappingSchema,
} from './dto/horilla-hr.dto';
