/**
 * @kgc/bergep-szerviz - Equipment-Service Integration Module
 * Epic 25: Equipment-Service Integration
 */

// Module
export { BergepSzervizModule } from './bergep-szerviz.module';

// Services
export {
  EquipmentDispatchService,
  IEquipmentRepository,
  IWorksheetRepository,
  IServiceDispatchRepository,
  IAuditService,
} from './services/equipment-dispatch.service';

export {
  ServiceReturnService,
  INotificationService,
} from './services/service-return.service';

// Interfaces
export {
  IEquipment,
  IWorksheet,
  IServiceDispatch,
  IServiceReturn,
  EquipmentStatus,
  WorksheetStatus,
  ServiceDispatchReason,
} from './interfaces/bergep-szerviz.interface';

// DTOs
export {
  DispatchToServiceDto,
  DispatchToServiceSchema,
  ReturnFromServiceDto,
  ReturnFromServiceSchema,
} from './dto/bergep-szerviz.dto';
