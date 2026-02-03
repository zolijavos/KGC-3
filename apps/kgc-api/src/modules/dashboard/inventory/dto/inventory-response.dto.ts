import { z } from 'zod';

/**
 * Stock Summary Response Schema
 * GET /api/v1/dashboard/inventory/summary
 *
 * FIX #1: Add proper API response wrapper per CLAUDE.md conventions
 */
export const StockSummaryDataSchema = z.object({
  total: z.number().int().nonnegative(),
  byLocation: z.record(
    z.string(),
    z.object({
      count: z.number().int().nonnegative(),
      percentage: z.number().nonnegative(),
    }),
  ),
  byStatus: z.object({
    available: z.number().int().nonnegative(),
    rented: z.number().int().nonnegative(),
    service: z.number().int().nonnegative(),
  }),
});

export const StockSummaryResponseSchema = z.object({
  data: StockSummaryDataSchema,
});

export type StockSummaryResponse = z.infer<typeof StockSummaryResponseSchema>;

/**
 * Stock Alert Response Schema
 * GET /api/v1/dashboard/inventory/alerts
 */
export const StockAlertSchema = z.object({
  id: z.string(),
  model: z.string(),
  type: z.string(),
  currentStock: z.number().int().nonnegative(),
  minimumThreshold: z.number().int().positive(),
  severity: z.enum(['critical', 'warning']),
  lastPurchase: z.string().optional(),
});

export type StockAlert = z.infer<typeof StockAlertSchema>;

export const StockAlertResponseSchema = z.object({
  data: z.array(StockAlertSchema),
});
export type StockAlertResponse = z.infer<typeof StockAlertResponseSchema>;

/**
 * Stock Movement Response Schema
 * GET /api/v1/dashboard/inventory/movement?days=30
 */
export const StockMovementSchema = z.object({
  date: z.string(), // ISO date
  inbound: z.number().int().nonnegative(),
  outbound: z.number().int().nonnegative(),
  net: z.number().int(),
});

export type StockMovement = z.infer<typeof StockMovementSchema>;

export const StockMovementResponseSchema = z.object({
  data: z.array(StockMovementSchema),
});
export type StockMovementResponse = z.infer<typeof StockMovementResponseSchema>;

/**
 * Stock Heatmap Response Schema
 * GET /api/v1/dashboard/inventory/heatmap
 */
export const StockHeatmapDataSchema = z.object({
  machineType: z.string(),
  location: z.string(),
  count: z.number().int().nonnegative(),
  utilizationPercent: z.number().nonnegative().max(100),
});

export type StockHeatmapData = z.infer<typeof StockHeatmapDataSchema>;

export const StockHeatmapResponseSchema = z.object({
  data: z.array(StockHeatmapDataSchema),
});
export type StockHeatmapResponse = z.infer<typeof StockHeatmapResponseSchema>;
