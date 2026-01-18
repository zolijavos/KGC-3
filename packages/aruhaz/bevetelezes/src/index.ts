/**
 * @kgc/bevetelezes - Goods Receipt (Bevételezes) Module
 * Epic 21: Goods Receipt management
 */

// Module
export { BevetelezesModule } from './bevetelezes.module';

// Services
export { AvizoService, IAvizoRepository, IAvizoItemRepository, IAuditService } from './services/avizo.service';
export { ReceiptService, IReceiptRepository, IReceiptItemRepository, IInventoryService } from './services/receipt.service';
export { DiscrepancyService, IDiscrepancyRepository, ISupplierNotificationService } from './services/discrepancy.service';

// Interfaces
export {
  IAvizo,
  IAvizoItem,
  IAvizoCreateResult,
  AvizoStatus,
} from './interfaces/avizo.interface';

export {
  IReceipt,
  IReceiptItem,
  IDiscrepancy,
  ReceiptStatus,
  DiscrepancyType,
  RECEIPT_TOLERANCE_PERCENT,
} from './interfaces/receipt.interface';

// DTOs
export {
  CreateAvizoDto,
  CreateAvizoSchema,
  UpdateAvizoDto,
  UpdateAvizoSchema,
  CreateAvizoItemDto,
} from './dto/avizo.dto';

export {
  CreateReceiptDto,
  CreateReceiptSchema,
  CreateReceiptItemDto,
  CreateDiscrepancyDto,
  CreateDiscrepancySchema,
  ResolveDiscrepancyDto,
  ResolveDiscrepancySchema,
} from './dto/receipt.dto';
