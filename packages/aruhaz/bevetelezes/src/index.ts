/**
 * @kgc/bevetelezes - Goods Receipt (Bevételezes) Module
 * Epic 21: Goods Receipt management
 */

// Module
export { BevetelezesModule } from './bevetelezes.module';

// Services
export { AvizoService } from './services/avizo.service';
export type {
  IAuditService,
  IAvizoItemRepository,
  IAvizoRepository,
} from './services/avizo.service';
export { DiscrepancyService } from './services/discrepancy.service';
export type {
  IDiscrepancyRepository,
  ISupplierNotificationService,
} from './services/discrepancy.service';
export { ReceiptService } from './services/receipt.service';
export type {
  IInventoryService,
  IReceiptItemRepository,
  IReceiptRepository,
} from './services/receipt.service';

// Interfaces
export { AvizoStatus } from './interfaces/avizo.interface';
export type { IAvizo, IAvizoCreateResult, IAvizoItem } from './interfaces/avizo.interface';

export {
  DiscrepancyType,
  RECEIPT_TOLERANCE_PERCENT,
  ReceiptStatus,
} from './interfaces/receipt.interface';
export type { IDiscrepancy, IReceipt, IReceiptItem } from './interfaces/receipt.interface';

// DTOs
export { CreateAvizoSchema, UpdateAvizoSchema } from './dto/avizo.dto';
export type { CreateAvizoDto, UpdateAvizoDto } from './dto/avizo.dto';

export {
  CreateDiscrepancySchema,
  CreateReceiptSchema,
  ResolveDiscrepancySchema,
} from './dto/receipt.dto';
export type {
  CreateDiscrepancyDto,
  CreateReceiptDto,
  ResolveDiscrepancyDto,
} from './dto/receipt.dto';

// Note: Prisma repositories should be implemented in apps/kgc-api/src/modules/bevetelezes/
// where PrismaClient is available. Use the repository interfaces from services/.
