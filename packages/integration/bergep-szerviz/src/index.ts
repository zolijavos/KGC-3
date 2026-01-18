/**
 * @kgc/bergep-szerviz - Equipment-Service Integration Module
 * Epic 25: Equipment-Service Integration
 */

// Module
export { BergepSzervizModule } from './bergep-szerviz.module';

// Services
export { EquipmentDispatchService } from './services/equipment-dispatch.service';
export type {
  IEquipmentRepository,
  IWorksheetRepository,
  IServiceDispatchRepository,
  IAuditService,
} from './services/equipment-dispatch.service';

export { ServiceReturnService } from './services/service-return.service';
export type { INotificationService } from './services/service-return.service';

// Interfaces
export type {
  IEquipment,
  IWorksheet,
  IServiceDispatch,
  IServiceReturn,
} from './interfaces/bergep-szerviz.interface';
export {
  EquipmentStatus,
  WorksheetStatus,
  ServiceDispatchReason,
} from './interfaces/bergep-szerviz.interface';

// DTOs
export type { DispatchToServiceDto, ReturnFromServiceDto } from './dto/bergep-szerviz.dto';
export { DispatchToServiceSchema, ReturnFromServiceSchema } from './dto/bergep-szerviz.dto';
