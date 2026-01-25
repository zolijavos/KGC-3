/**
 * Rental DTOs with Zod validation - Epic 14
 */
import { z } from 'zod';
import { DiscountType, RentalStatus } from '../interfaces/rental.interface';

// =====================================================
// Rental Checkout DTO - Story 14-1
// =====================================================

export const RentalCheckoutDtoSchema = z
  .object({
    customerId: z
      .string({ required_error: 'Az ügyfél azonosító kötelező' })
      .uuid({ message: 'Érvénytelen ügyfél azonosító formátum' }),
    equipmentId: z
      .string({ required_error: 'A bérgép azonosító kötelező' })
      .uuid({ message: 'Érvénytelen bérgép azonosító formátum' }),
    startDate: z.coerce.date({
      required_error: 'A kezdő dátum kötelező',
      invalid_type_error: 'Érvénytelen dátum formátum',
    }),
    expectedReturnDate: z.coerce.date({
      required_error: 'A várható visszavétel dátuma kötelező',
      invalid_type_error: 'Érvénytelen dátum formátum',
    }),
    depositAmount: z
      .number({ required_error: 'A kaució összeg kötelező' })
      .min(0, 'A kaució összeg nem lehet negatív'),
    notes: z.string().optional(),
  })
  .refine(data => data.expectedReturnDate > data.startDate, {
    message: 'A visszavétel dátuma későbbi kell legyen a kezdő dátumnál',
    path: ['expectedReturnDate'],
  });

export type RentalCheckoutDto = z.infer<typeof RentalCheckoutDtoSchema>;

export function validateRentalCheckout(data: unknown): RentalCheckoutDto {
  return RentalCheckoutDtoSchema.parse(data);
}

// =====================================================
// Rental Return DTO - Story 14-4
// =====================================================

export const RentalReturnDtoSchema = z
  .object({
    rentalId: z
      .string({ required_error: 'A bérlés azonosító kötelező' })
      .uuid({ message: 'Érvénytelen bérlés azonosító formátum' }),
    returnDate: z.coerce.date({
      required_error: 'A visszavétel dátuma kötelező',
      invalid_type_error: 'Érvénytelen dátum formátum',
    }),
    accessoryChecklistVerified: z.boolean({
      required_error: 'A tartozék ellenőrzőlista megerősítése kötelező',
    }),
    equipmentCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'], {
      required_error: 'A bérgép állapota kötelező',
      invalid_type_error: 'Érvénytelen állapot érték',
    }),
    damageNotes: z.string().optional(),
    depositAction: z.enum(['RETURN', 'RETAIN_PARTIAL', 'RETAIN_FULL'], {
      required_error: 'A kaució művelet kötelező',
      invalid_type_error: 'Érvénytelen kaució művelet',
    }),
    retainedAmount: z.number().min(0, 'A visszatartott összeg nem lehet negatív').optional(),
    retentionReason: z.string().optional(),
  })
  .refine(
    data =>
      data.depositAction !== 'RETAIN_PARTIAL' ||
      (data.retainedAmount !== undefined && data.retainedAmount > 0),
    {
      message: 'Részleges visszatartásnál meg kell adni a visszatartott összeget',
      path: ['retainedAmount'],
    }
  )
  .refine(
    data =>
      (data.depositAction !== 'RETAIN_PARTIAL' && data.depositAction !== 'RETAIN_FULL') ||
      data.retentionReason,
    { message: 'Visszatartásnál az indoklás kötelező', path: ['retentionReason'] }
  );

export type RentalReturnDto = z.infer<typeof RentalReturnDtoSchema>;

export function validateRentalReturn(data: unknown): RentalReturnDto {
  return RentalReturnDtoSchema.parse(data);
}

// =====================================================
// Rental Extension DTO - Story 14-5
// =====================================================

export const RentalExtensionDtoSchema = z.object({
  rentalId: z
    .string({ required_error: 'A bérlés azonosító kötelező' })
    .uuid({ message: 'Érvénytelen bérlés azonosító formátum' }),
  newReturnDate: z.coerce.date({
    required_error: 'Az új visszavétel dátuma kötelező',
    invalid_type_error: 'Érvénytelen dátum formátum',
  }),
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

export const PriceCalculationDtoSchema = z
  .object({
    equipmentId: z
      .string({ required_error: 'A bérgép azonosító kötelező' })
      .uuid({ message: 'Érvénytelen bérgép azonosító formátum' }),
    startDate: z.coerce.date({
      required_error: 'A kezdő dátum kötelező',
      invalid_type_error: 'Érvénytelen dátum formátum',
    }),
    endDate: z.coerce.date({
      required_error: 'A befejező dátum kötelező',
      invalid_type_error: 'Érvénytelen dátum formátum',
    }),
    customerId: z.string().uuid({ message: 'Érvénytelen ügyfél azonosító formátum' }).optional(),
    promoCode: z.string().optional(),
    manualDiscounts: z
      .array(
        z.object({
          type: z.nativeEnum(DiscountType, { required_error: 'A kedvezmény típusa kötelező' }),
          percentage: z
            .number()
            .min(0, 'A százalék nem lehet negatív')
            .max(100, 'A százalék nem lehet 100-nál nagyobb')
            .optional(),
          fixedAmount: z.number().min(0, 'Az összeg nem lehet negatív').optional(),
          reason: z.string({ required_error: 'A kedvezmény indoklása kötelező' }),
        })
      )
      .optional(),
  })
  .refine(data => data.endDate > data.startDate, {
    message: 'A befejező dátum későbbi kell legyen a kezdő dátumnál',
    path: ['endDate'],
  });

export type PriceCalculationDto = z.infer<typeof PriceCalculationDtoSchema>;

export function validatePriceCalculation(data: unknown): PriceCalculationDto {
  return PriceCalculationDtoSchema.parse(data);
}

// =====================================================
// Apply Discount DTO - Story 14-3
// =====================================================

export const ApplyDiscountDtoSchema = z
  .object({
    rentalId: z
      .string({ required_error: 'A bérlés azonosító kötelező' })
      .uuid({ message: 'Érvénytelen bérlés azonosító formátum' }),
    type: z.nativeEnum(DiscountType, { required_error: 'A kedvezmény típusa kötelező' }),
    name: z
      .string({ required_error: 'A kedvezmény neve kötelező' })
      .min(1, 'A kedvezmény neve kötelező'),
    percentage: z
      .number()
      .min(0, 'A százalék nem lehet negatív')
      .max(100, 'A százalék nem lehet 100-nál nagyobb')
      .optional(),
    fixedAmount: z.number().min(0, 'Az összeg nem lehet negatív').optional(),
    reason: z.string().optional(),
  })
  .refine(data => data.percentage !== undefined || data.fixedAmount !== undefined, {
    message: 'Százalék vagy fix összeg megadása kötelező',
  });

export type ApplyDiscountDto = z.infer<typeof ApplyDiscountDtoSchema>;

export function validateApplyDiscount(data: unknown): ApplyDiscountDto {
  return ApplyDiscountDtoSchema.parse(data);
}

// =====================================================
// Discount Rule DTO - Story 14-3
// =====================================================

export const CreateDiscountRuleDtoSchema = z
  .object({
    type: z.nativeEnum(DiscountType, { required_error: 'A kedvezmény típusa kötelező' }),
    name: z
      .string({ required_error: 'A kedvezmény neve kötelező' })
      .min(1, 'A kedvezmény neve kötelező')
      .max(100, 'A név maximum 100 karakter lehet'),
    description: z.string().optional(),
    percentage: z
      .number()
      .min(0, 'A százalék nem lehet negatív')
      .max(100, 'A százalék nem lehet 100-nál nagyobb')
      .optional(),
    fixedAmount: z.number().min(0, 'Az összeg nem lehet negatív').optional(),
    minDays: z
      .number()
      .int('Egész számnak kell lennie')
      .min(1, 'Minimum 1 nap szükséges')
      .optional(),
    maxDiscountAmount: z.number().min(0, 'Az összeg nem lehet negatív').optional(),
    requiredRole: z.string().optional(),
    promoCode: z.string().optional(),
    validFrom: z.coerce.date({ invalid_type_error: 'Érvénytelen dátum formátum' }).optional(),
    validUntil: z.coerce.date({ invalid_type_error: 'Érvénytelen dátum formátum' }).optional(),
    stackable: z.boolean().default(false),
    priority: z
      .number()
      .int('Egész számnak kell lennie')
      .min(0, 'A prioritás nem lehet negatív')
      .default(100),
  })
  .refine(data => data.percentage !== undefined || data.fixedAmount !== undefined, {
    message: 'Százalék vagy fix összeg megadása kötelező',
  })
  .refine(data => !data.validFrom || !data.validUntil || data.validUntil > data.validFrom, {
    message: 'Az érvényesség vége későbbi kell legyen az érvényesség kezdeténél',
    path: ['validUntil'],
  });

export type CreateDiscountRuleDto = z.infer<typeof CreateDiscountRuleDtoSchema>;

export function validateCreateDiscountRule(data: unknown): CreateDiscountRuleDto {
  return CreateDiscountRuleDtoSchema.parse(data);
}

// =====================================================
// Late Fee Waiver DTO - Story 14-6
// =====================================================

export const WaiveLateFeesDtoSchema = z.object({
  rentalId: z
    .string({ required_error: 'A bérlés azonosító kötelező' })
    .uuid({ message: 'Érvénytelen bérlés azonosító formátum' }),
  reason: z.string({ required_error: 'Az indoklás kötelező' }).min(1, 'Az indoklás kötelező'),
});

export type WaiveLateFeesDto = z.infer<typeof WaiveLateFeesDtoSchema>;

export function validateWaiveLateFees(data: unknown): WaiveLateFeesDto {
  return WaiveLateFeesDtoSchema.parse(data);
}

// =====================================================
// Cancel Rental DTO
// =====================================================

export const CancelRentalDtoSchema = z.object({
  rentalId: z
    .string({ required_error: 'A bérlés azonosító kötelező' })
    .uuid({ message: 'Érvénytelen bérlés azonosító formátum' }),
  reason: z.string({ required_error: 'Az indoklás kötelező' }).min(1, 'Az indoklás kötelező'),
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
  customerId: z.string().uuid({ message: 'Érvénytelen ügyfél azonosító formátum' }).optional(),
  equipmentId: z.string().uuid({ message: 'Érvénytelen bérgép azonosító formátum' }).optional(),
  startDateFrom: z.coerce.date({ invalid_type_error: 'Érvénytelen dátum formátum' }).optional(),
  startDateTo: z.coerce.date({ invalid_type_error: 'Érvénytelen dátum formátum' }).optional(),
  overdueOnly: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int('Egész számnak kell lennie').min(1, 'Az oldal minimum 1 lehet').default(1),
  pageSize: z
    .number()
    .int('Egész számnak kell lennie')
    .min(1, 'Az oldalméret minimum 1')
    .max(100, 'Az oldalméret maximum 100')
    .default(20),
});

export type RentalFilterDto = z.infer<typeof RentalFilterDtoSchema>;

export function validateRentalFilter(data: unknown): RentalFilterDto {
  return RentalFilterDtoSchema.parse(data);
}

// =====================================================
// Pickup Confirmation DTO - Story 14-1
// =====================================================

export const ConfirmPickupDtoSchema = z.object({
  rentalId: z
    .string({ required_error: 'A bérlés azonosító kötelező' })
    .uuid({ message: 'Érvénytelen bérlés azonosító formátum' }),
  accessoryChecklistVerified: z.boolean({
    required_error: 'A tartozék ellenőrzőlista megerősítése kötelező',
  }),
  depositCollected: z.boolean({ required_error: 'A kaució felvétel státusza kötelező' }),
  depositMethod: z
    .enum(['CASH', 'CARD', 'PRE_AUTH'], {
      invalid_type_error: 'Érvénytelen kaució fizetési mód',
    })
    .optional(),
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
  rentalId: z
    .string({ required_error: 'A bérlés azonosító kötelező' })
    .uuid({ message: 'Érvénytelen bérlés azonosító formátum' }),
  note: z
    .string({ required_error: 'A megjegyzés kötelező' })
    .min(1, 'A megjegyzés kötelező')
    .max(1000, 'A megjegyzés maximum 1000 karakter lehet'),
});

export type AddNoteDto = z.infer<typeof AddNoteDtoSchema>;

export function validateAddNote(data: unknown): AddNoteDto {
  return AddNoteDtoSchema.parse(data);
}
