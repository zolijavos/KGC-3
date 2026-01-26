/**
 * @kgc/bevetelezes - Goods Receipt (Bevételezes) Module
 * Epic 21: Goods Receipt management
 */

// Module
export { BevetelezesModule } from './bevetelezes.module.js';

// Services
export { AvizoService } from './services/avizo.service.js';
export type {
  IAuditService,
  IAvizoItemRepository,
  IAvizoRepository,
} from './services/avizo.service.js';
export { DiscrepancyService } from './services/discrepancy.service.js';
export type {
  IDiscrepancyRepository,
  ISupplierNotificationService,
} from './services/discrepancy.service.js';
export { ReceiptService } from './services/receipt.service.js';
export type {
  IInventoryService,
  IReceiptItemRepository,
  IReceiptRepository,
} from './services/receipt.service.js';

// Interfaces
export { AvizoStatus } from './interfaces/avizo.interface.js';
export type { IAvizo, IAvizoCreateResult, IAvizoItem } from './interfaces/avizo.interface.js';

export {
  DiscrepancyType,
  RECEIPT_TOLERANCE_PERCENT,
  ReceiptStatus,
} from './interfaces/receipt.interface.js';
export type { IDiscrepancy, IReceipt, IReceiptItem } from './interfaces/receipt.interface.js';

// DTOs
export { CreateAvizoSchema, UpdateAvizoSchema } from './dto/avizo.dto.js';
export type { CreateAvizoDto, UpdateAvizoDto } from './dto/avizo.dto.js';

export {
  CreateDiscrepancySchema,
  CreateReceiptSchema,
  ResolveDiscrepancySchema,
} from './dto/receipt.dto.js';
export type {
  CreateDiscrepancyDto,
  CreateReceiptDto,
  ResolveDiscrepancyDto,
} from './dto/receipt.dto.js';

// Note: Prisma repositories should be implemented in apps/kgc-api/src/modules/bevetelezes/
// where PrismaClient is available. Use the repository interfaces from services/.
