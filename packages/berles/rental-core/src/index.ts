/**
 * @kgc/rental-core - Rental Operations Module
 * Epic 14: Bérlés kiadás, visszavétel, díjkalkuláció, kedvezmények
 * Epic 37: Kalendárnap Kedvezmény Rendszer (ADR-048)
 */

// Interfaces
export * from './interfaces/early-cancellation.interface';
export * from './interfaces/rental-discount-audit.interface';
export * from './interfaces/rental-discount.interface';
export * from './interfaces/rental.interface';

// DTOs
export * from './dto/rental.dto';

// Repositories
export * from './repositories/rental.repository';

// Services
export { RentalService } from './services/rental.service';
export type {
  CustomerInfo,
  EquipmentPricingInfo,
  RentalPermissionContext,
} from './services/rental.service';

// Epic 37: Duration-based Discount Services (Story 37-1)
export {
  InMemoryRentalDiscountTierRepository,
  RentalDurationDiscountCalculator,
} from './services/rental-duration-discount.service';

// Epic 37: Tier Configuration Service (Story 37-2)
export { RentalDiscountTierService } from './services/rental-discount-tier.service';

// Epic 37: Early Cancellation Service (Story 37-3)
export {
  EarlyCancellationCalculator,
  InMemoryRentalRepositoryForCancellation,
} from './services/early-cancellation.service';

// Epic 37: Audit Trail Service (Story 37-4)
export {
  InMemoryRentalDiscountAuditRepository,
  RentalDiscountAuditService,
} from './services/rental-discount-audit.service';

// Epic 40: Equipment Cost Service (Story 40-1) - ADR-051
export {
  EquipmentCostService,
  type EquipmentCostResult,
  type EquipmentCostSummary,
  type IEquipmentCostRepository,
  type WorksheetCostBreakdown,
  type WorksheetCostInfo,
} from './services/equipment-cost.service';

// Epic 40: Equipment Profit Service (Story 40-2) - ADR-051
export {
  EquipmentProfitService,
  EquipmentProfitStatus,
  type EquipmentProfitData,
  type EquipmentProfitResult,
  type IEquipmentProfitRepository,
} from './services/equipment-profit.service';
