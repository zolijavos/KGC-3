import { z } from 'zod';
import {
  EquipmentStatus,
  EquipmentCategory,
  EquipmentCondition,
  MaintenanceType,
} from '../interfaces/rental-equipment.interface';

/**
 * Rental Equipment DTOs with Zod validation - Epic 13
 */

// Base schemas
export const EquipmentStatusSchema = z.nativeEnum(EquipmentStatus);
export const EquipmentCategorySchema = z.nativeEnum(EquipmentCategory);
export const EquipmentConditionSchema = z.nativeEnum(EquipmentCondition);
export const MaintenanceTypeSchema = z.nativeEnum(MaintenanceType);

/**
 * Create Equipment DTO - Story 13.1
 */
export const CreateEquipmentDtoSchema = z.object({
  productId: z.string().uuid().optional(),
  serialNumber: z.string().min(1, 'Serial number is required').max(100),
  inventoryCode: z.string().max(50).optional(),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  category: EquipmentCategorySchema,
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  dailyRate: z.number().positive('Daily rate must be positive'),
  weeklyRate: z.number().positive('Weekly rate must be positive'),
  monthlyRate: z.number().positive('Monthly rate must be positive'),
  depositAmount: z.number().nonnegative('Deposit cannot be negative'),
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.number().positive().optional(),
  warrantyExpiry: z.coerce.date().optional(),
  maintenanceIntervalDays: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => data.weeklyRate <= data.dailyRate * 7,
  { message: 'Weekly rate should not exceed 7x daily rate' }
).refine(
  (data) => data.monthlyRate <= data.weeklyRate * 4.5,
  { message: 'Monthly rate should not exceed 4.5x weekly rate' }
);

export type CreateEquipmentDto = z.infer<typeof CreateEquipmentDtoSchema>;

/**
 * Update Equipment DTO
 */
export const UpdateEquipmentDtoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  category: EquipmentCategorySchema.optional(),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  dailyRate: z.number().positive().optional(),
  weeklyRate: z.number().positive().optional(),
  monthlyRate: z.number().positive().optional(),
  depositAmount: z.number().nonnegative().optional(),
  condition: EquipmentConditionSchema.optional(),
  warrantyExpiry: z.coerce.date().optional().nullable(),
  maintenanceIntervalDays: z.number().int().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateEquipmentDto = z.infer<typeof UpdateEquipmentDtoSchema>;

/**
 * Change Status DTO - Story 13.2
 */
export const ChangeEquipmentStatusDtoSchema = z.object({
  equipmentId: z.string().uuid(),
  newStatus: EquipmentStatusSchema,
  reason: z.string().max(500).optional(),
  relatedId: z.string().uuid().optional(),
});

export type ChangeEquipmentStatusDto = z.infer<typeof ChangeEquipmentStatusDtoSchema>;

/**
 * Scan Equipment DTO - Story 13.3
 */
export const ScanEquipmentDtoSchema = z.object({
  code: z.string().min(1, 'Scan code is required'),
  codeType: z.enum(['QR', 'SERIAL', 'INVENTORY']).default('QR'),
});

export type ScanEquipmentDto = z.infer<typeof ScanEquipmentDtoSchema>;

/**
 * Create Accessory DTO - Story 13.4
 */
export const CreateAccessoryDtoSchema = z.object({
  equipmentId: z.string().uuid(),
  name: z.string().min(1, 'Accessory name is required').max(200),
  description: z.string().max(1000).optional(),
  quantity: z.number().int().positive().default(1),
  isMandatory: z.boolean().default(false),
  replacementCost: z.number().nonnegative().default(0),
  condition: EquipmentConditionSchema.default(EquipmentCondition.GOOD),
  notes: z.string().max(500).optional(),
});

export type CreateAccessoryDto = z.infer<typeof CreateAccessoryDtoSchema>;

/**
 * Update Accessory DTO
 */
export const UpdateAccessoryDtoSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  quantity: z.number().int().positive().optional(),
  isMandatory: z.boolean().optional(),
  replacementCost: z.number().nonnegative().optional(),
  condition: EquipmentConditionSchema.optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type UpdateAccessoryDto = z.infer<typeof UpdateAccessoryDtoSchema>;

/**
 * Accessory Checklist DTO - Story 13.4
 */
export const AccessoryChecklistDtoSchema = z.object({
  equipmentId: z.string().uuid(),
  items: z.array(z.object({
    accessoryId: z.string().uuid(),
    isPresent: z.boolean(),
    condition: EquipmentConditionSchema,
    notes: z.string().max(500).optional(),
  })),
});

export type AccessoryChecklistDto = z.infer<typeof AccessoryChecklistDtoSchema>;

/**
 * Create Maintenance Record DTO - Story 13.5
 */
export const CreateMaintenanceRecordDtoSchema = z.object({
  equipmentId: z.string().uuid(),
  maintenanceType: MaintenanceTypeSchema,
  description: z.string().min(1, 'Description is required').max(2000),
  partsReplaced: z.array(z.string().max(200)).optional(),
  cost: z.number().nonnegative().default(0),
  performedBy: z.string().min(1, 'Technician is required').max(200),
  performedAt: z.coerce.date().optional(),
  nextDueDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateMaintenanceRecordDto = z.infer<typeof CreateMaintenanceRecordDtoSchema>;

/**
 * Equipment Filter DTO
 */
export const EquipmentFilterDtoSchema = z.object({
  status: EquipmentStatusSchema.optional(),
  category: EquipmentCategorySchema.optional(),
  condition: EquipmentConditionSchema.optional(),
  brand: z.string().max(100).optional(),
  minDailyRate: z.number().nonnegative().optional(),
  maxDailyRate: z.number().positive().optional(),
  availableOnly: z.boolean().default(false),
  maintenanceDueSoon: z.boolean().default(false),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type EquipmentFilterDto = z.infer<typeof EquipmentFilterDtoSchema>;

/**
 * Validation helper functions
 */
export function validateCreateEquipment(data: unknown): CreateEquipmentDto {
  return CreateEquipmentDtoSchema.parse(data);
}

export function validateUpdateEquipment(data: unknown): UpdateEquipmentDto {
  return UpdateEquipmentDtoSchema.parse(data);
}

export function validateChangeStatus(data: unknown): ChangeEquipmentStatusDto {
  return ChangeEquipmentStatusDtoSchema.parse(data);
}

export function validateScanEquipment(data: unknown): ScanEquipmentDto {
  return ScanEquipmentDtoSchema.parse(data);
}

export function validateCreateAccessory(data: unknown): CreateAccessoryDto {
  return CreateAccessoryDtoSchema.parse(data);
}

export function validateAccessoryChecklist(data: unknown): AccessoryChecklistDto {
  return AccessoryChecklistDtoSchema.parse(data);
}

export function validateCreateMaintenance(data: unknown): CreateMaintenanceRecordDto {
  return CreateMaintenanceRecordDtoSchema.parse(data);
}

export function validateEquipmentFilter(data: unknown): EquipmentFilterDto {
  return EquipmentFilterDtoSchema.parse(data);
}
