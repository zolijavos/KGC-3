import { z } from 'zod';

/**
 * Severity enum for stock alerts
 */
export const SeverityEnum = z.enum(['critical', 'warning', 'all']);
export type Severity = z.infer<typeof SeverityEnum>;

/**
 * Inventory Query DTO Schema
 *
 * Validates query parameters for inventory endpoints
 */
export const InventoryQuerySchema = z.object({
  days: z.coerce.number().int().positive().optional().default(30),
  severity: SeverityEnum.optional(),
});

export type InventoryQueryDto = z.infer<typeof InventoryQuerySchema>;
