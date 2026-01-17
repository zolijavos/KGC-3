/**
 * Rental DTOs with Zod validation - Epic 14
 */
import { z } from 'zod';
import {
  RentalStatus,
  DiscountType,
} from '../interfaces/rental.interface';

// =====================================================
// Rental Checkout DTO - Story 14-1
// =====================================================

export const RentalCheckoutDtoSchema = z.object({
  customerId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  startDate: z.coerce.date(),
  expectedReturnDate: z.coerce.date(),
  depositAmount: z.number().min(0),
  notes: z.string().optional(),
});

export type RentalCheckoutDto = z.infer<typeof RentalCheckoutDtoSchema>;

export function validateRentalCheckout(data: unknown): RentalCheckoutDto {
  return RentalCheckoutDtoSchema.parse(data);
}

// =====================================================
// Rental Return DTO - Story 14-4
// =====================================================

export const RentalReturnDtoSchema = z.object({
  rentalId: z.string().uuid(),
  returnDate: z.coerce.date(),
  accessoryChecklistVerified: z.boolean(),
  equipmentCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  damageNotes: z.string().optional(),
  depositAction: z.enum(['RETURN', 'RETAIN_PARTIAL', 'RETAIN_FULL']),
  retainedAmount: z.number().min(0).optional(),
  retentionReason: z.string().optional(),
});

export type RentalReturnDto = z.infer<typeof RentalReturnDtoSchema>;

export function validateRentalReturn(data: unknown): RentalReturnDto {
  return RentalReturnDtoSchema.parse(data);
}

// =====================================================
// Rental Extension DTO - Story 14-5
// =====================================================

export const RentalExtensionDtoSchema = z.object({
  rentalId: z.string().uuid(),
  newReturnDate: z.coerce.date(),
  reason: z.string().optional(),
  selfService: z.boolean().default(false),
});

export type RentalExtensionDto = z.infer<typeof RentalExtensionDtoSchema>;

export function validateRentalExtension(data: unknown): RentalExtensionDto {
  return RentalExtensionDtoSchema.parse(data);
}

// =====================================================
// Price Calculation DTO - Story 14-2
// =====================================================

export const PriceCalculationDtoSchema = z.object({
  equipmentId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  customerId: z.string().uuid().optional(),
  promoCode: z.string().optional(),
  manualDiscounts: z.array(z.object({
    type: z.nativeEnum(DiscountType),
    percentage: z.number().min(0).max(100).optional(),
    fixedAmount: z.number().min(0).optional(),
    reason: z.string(),
  })).optional(),
});

export type PriceCalculationDto = z.infer<typeof PriceCalculationDtoSchema>;

export function validatePriceCalculation(data: unknown): PriceCalculationDto {
  return PriceCalculationDtoSchema.parse(data);
}

// =====================================================
// Apply Discount DTO - Story 14-3
// =====================================================

export const ApplyDiscountDtoSchema = z.object({
  rentalId: z.string().uuid(),
  type: z.nativeEnum(DiscountType),
  name: z.string().min(1),
  percentage: z.number().min(0).max(100).optional(),
  fixedAmount: z.number().min(0).optional(),
  reason: z.string().optional(),
}).refine(
  (data) => data.percentage !== undefined || data.fixedAmount !== undefined,
  { message: 'Either percentage or fixedAmount must be provided' }
);

export type ApplyDiscountDto = z.infer<typeof ApplyDiscountDtoSchema>;

export function validateApplyDiscount(data: unknown): ApplyDiscountDto {
  return ApplyDiscountDtoSchema.parse(data);
}

// =====================================================
// Discount Rule DTO - Story 14-3
// =====================================================

export const CreateDiscountRuleDtoSchema = z.object({
  type: z.nativeEnum(DiscountType),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  percentage: z.number().min(0).max(100).optional(),
  fixedAmount: z.number().min(0).optional(),
  minDays: z.number().int().min(1).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  requiredRole: z.string().optional(),
  promoCode: z.string().optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  stackable: z.boolean().default(false),
  priority: z.number().int().min(0).default(100),
}).refine(
  (data) => data.percentage !== undefined || data.fixedAmount !== undefined,
  { message: 'Either percentage or fixedAmount must be provided' }
);

export type CreateDiscountRuleDto = z.infer<typeof CreateDiscountRuleDtoSchema>;

export function validateCreateDiscountRule(data: unknown): CreateDiscountRuleDto {
  return CreateDiscountRuleDtoSchema.parse(data);
}

// =====================================================
// Late Fee Waiver DTO - Story 14-6
// =====================================================

export const WaiveLateFeesDtoSchema = z.object({
  rentalId: z.string().uuid(),
  reason: z.string().min(1),
});

export type WaiveLateFeesDto = z.infer<typeof WaiveLateFeesDtoSchema>;

export function validateWaiveLateFees(data: unknown): WaiveLateFeesDto {
  return WaiveLateFeesDtoSchema.parse(data);
}

// =====================================================
// Cancel Rental DTO
// =====================================================

export const CancelRentalDtoSchema = z.object({
  rentalId: z.string().uuid(),
  reason: z.string().min(1),
});

export type CancelRentalDto = z.infer<typeof CancelRentalDtoSchema>;

export function validateCancelRental(data: unknown): CancelRentalDto {
  return CancelRentalDtoSchema.parse(data);
}

// =====================================================
// Rental Filter DTO
// =====================================================

export const RentalFilterDtoSchema = z.object({
  status: z.nativeEnum(RentalStatus).optional(),
  customerId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
  startDateFrom: z.coerce.date().optional(),
  startDateTo: z.coerce.date().optional(),
  overdueOnly: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type RentalFilterDto = z.infer<typeof RentalFilterDtoSchema>;

export function validateRentalFilter(data: unknown): RentalFilterDto {
  return RentalFilterDtoSchema.parse(data);
}

// =====================================================
// Pickup Confirmation DTO - Story 14-1
// =====================================================

export const ConfirmPickupDtoSchema = z.object({
  rentalId: z.string().uuid(),
  accessoryChecklistVerified: z.boolean(),
  depositCollected: z.boolean(),
  depositMethod: z.enum(['CASH', 'CARD', 'PRE_AUTH']).optional(),
  notes: z.string().optional(),
});

export type ConfirmPickupDto = z.infer<typeof ConfirmPickupDtoSchema>;

export function validateConfirmPickup(data: unknown): ConfirmPickupDto {
  return ConfirmPickupDtoSchema.parse(data);
}

// =====================================================
// Add Note DTO
// =====================================================

export const AddNoteDtoSchema = z.object({
  rentalId: z.string().uuid(),
  note: z.string().min(1).max(1000),
});

export type AddNoteDto = z.infer<typeof AddNoteDtoSchema>;

export function validateAddNote(data: unknown): AddNoteDto {
  return AddNoteDtoSchema.parse(data);
}
