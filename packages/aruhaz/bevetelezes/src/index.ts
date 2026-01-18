/**
 * @kgc/bevetelezes - Goods Receipt (Bevételezes) Module
 * Epic 21: Goods Receipt management
 */

// Module
export { BevetelezesModule } from './bevetelezes.module';

// Services
export { AvizoService } from './services/avizo.service';
export type { IAvizoRepository, IAvizoItemRepository, IAuditService } from './services/avizo.service';
export { ReceiptService } from './services/receipt.service';
export type { IReceiptRepository, IReceiptItemRepository, IInventoryService } from './services/receipt.service';
export { DiscrepancyService } from './services/discrepancy.service';
export type { IDiscrepancyRepository, ISupplierNotificationService } from './services/discrepancy.service';

// Interfaces
export type { IAvizo, IAvizoItem, IAvizoCreateResult } from './interfaces/avizo.interface';
export { AvizoStatus } from './interfaces/avizo.interface';

export type { IReceipt, IReceiptItem, IDiscrepancy } from './interfaces/receipt.interface';
export { ReceiptStatus, DiscrepancyType, RECEIPT_TOLERANCE_PERCENT } from './interfaces/receipt.interface';

// DTOs
export type { CreateAvizoDto, UpdateAvizoDto } from './dto/avizo.dto';
export { CreateAvizoSchema, UpdateAvizoSchema } from './dto/avizo.dto';

export type { CreateReceiptDto, CreateDiscrepancyDto, ResolveDiscrepancyDto } from './dto/receipt.dto';
export { CreateReceiptSchema, CreateDiscrepancySchema, ResolveDiscrepancySchema } from './dto/receipt.dto';
