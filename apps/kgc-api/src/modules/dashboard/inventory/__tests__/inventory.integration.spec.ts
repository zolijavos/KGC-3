/**
 * Integration Tests: Inventory Dashboard API
 * Story 35-3: Inventory API Endpoints Integration
 *
 * Tests controller-service integration, validation, and response format compliance
 * Priority: P0 (Critical - Dashboard API reliability)
 *
 * Test Coverage:
 * - Controller → Service integration
 * - Zod query parameter validation
 * - Response format compliance ({ data: ... })
 * - CORS and middleware compatibility
 * - Performance with large datasets
 * - Error handling and edge cases
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryController } from '../inventory.controller';
import { InventoryService } from '../inventory.service';
import type { InventoryQueryDto } from '../dto/inventory-query.dto';
import {
  StockSummaryResponseSchema,
  StockAlertResponseSchema,
  StockMovementResponseSchema,
  StockHeatmapResponseSchema,
} from '../dto/inventory-response.dto';
import { ZodError } from 'zod';

describe('Inventory Dashboard API - Integration Tests', () => {
  let controller: InventoryController;
  let service: InventoryService;

  beforeEach(() => {
    // Create real service instance for integration testing
    service = new InventoryService();
    controller = new InventoryController(service);
  });

  // ============================================
  // STORY 35-3: CONTROLLER → SERVICE INTEGRATION
  // ============================================

  describe('GET /api/v1/dashboard/inventory/summary', () => {
    it('[P0] should call service.getSummary and return response', async () => {
      const serviceSpy = vi.spyOn(service, 'getSummary');

      const result = await controller.getSummary();

      expect(serviceSpy).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('[P0] should return response with { data: ... } wrapper', async () => {
      const result = await controller.getSummary();

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('byLocation');
      expect(result.data).toHaveProperty('byStatus');
    });

    it('[P0] should validate response schema compliance (Zod)', async () => {
      const result = await controller.getSummary();

      // Should not throw ZodError
      const validation = StockSummaryResponseSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('[P1] should return valid stock summary structure', async () => {
      const result = await controller.getSummary();

      expect(result.data.total).toBeGreaterThanOrEqual(0);
      expect(typeof result.data.total).toBe('number');

      // Check byLocation structure
      expect(result.data.byLocation).toBeDefined();
      Object.values(result.data.byLocation).forEach((loc: any) => {
        expect(loc).toHaveProperty('count');
        expect(loc).toHaveProperty('percentage');
        expect(typeof loc.count).toBe('number');
        expect(typeof loc.percentage).toBe('number');
      });

      // Check byStatus structure
      expect(result.data.byStatus).toBeDefined();
      expect(result.data.byStatus.available).toBeGreaterThanOrEqual(0);
      expect(result.data.byStatus.rented).toBeGreaterThanOrEqual(0);
      expect(result.data.byStatus.service).toBeGreaterThanOrEqual(0);
    });

    it('[P1] should handle empty inventory gracefully', async () => {
      // Mock service to return empty data
      vi.spyOn(service, 'getSummary').mockResolvedValue({
        data: {
          total: 0,
          byLocation: {},
          byStatus: { available: 0, rented: 0, service: 0 },
        },
      });

      const result = await controller.getSummary();

      expect(result.data.total).toBe(0);
      expect(Object.keys(result.data.byLocation).length).toBe(0);
    });

    it('[P2] should complete within 500ms (performance)', async () => {
      const start = Date.now();
      await controller.getSummary();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================
  // QUERY PARAMETER VALIDATION (ZOD SCHEMA)
  // ============================================

  describe('GET /api/v1/dashboard/inventory/alerts', () => {
    it('[P0] should call service.getAlerts with parsed query', async () => {
      const serviceSpy = vi.spyOn(service, 'getAlerts');
      const rawQuery = { days: '30', severity: 'critical' };

      await controller.getAlerts(rawQuery);

      expect(serviceSpy).toHaveBeenCalledTimes(1);
      expect(serviceSpy).toHaveBeenCalledWith({
        days: 30, // Coerced to number
        severity: 'critical',
      });
    });

    it('[P0] should return response with { data: [...] } wrapper', async () => {
      const result = await controller.getAlerts({});

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('[P0] should validate response schema compliance (Zod)', async () => {
      const result = await controller.getAlerts({});

      const validation = StockAlertResponseSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('[P1] should use default days=30 when not provided', async () => {
      const serviceSpy = vi.spyOn(service, 'getAlerts');
      const rawQuery = {};

      await controller.getAlerts(rawQuery);

      expect(serviceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30,
        })
      );
    });

    it('[P1] should coerce string days to number', async () => {
      const serviceSpy = vi.spyOn(service, 'getAlerts');
      const rawQuery = { days: '7' };

      await controller.getAlerts(rawQuery);

      expect(serviceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 7, // Number, not string
        })
      );
    });

    it('[P0] should throw ZodError on invalid severity', async () => {
      const rawQuery = { days: '30', severity: 'invalid' };

      await expect(controller.getAlerts(rawQuery)).rejects.toThrow(ZodError);
    });

    it('[P0] should throw ZodError on negative days', async () => {
      const rawQuery = { days: '-5' };

      await expect(controller.getAlerts(rawQuery)).rejects.toThrow(ZodError);
    });

    it('[P0] should throw ZodError on zero days', async () => {
      const rawQuery = { days: '0' };

      await expect(controller.getAlerts(rawQuery)).rejects.toThrow(ZodError);
    });

    it('[P0] should throw ZodError on non-integer days', async () => {
      const rawQuery = { days: '3.5' };

      await expect(controller.getAlerts(rawQuery)).rejects.toThrow(ZodError);
    });

    it('[P1] should accept severity: "critical"', async () => {
      const rawQuery = { severity: 'critical' };

      const result = await controller.getAlerts(rawQuery);

      expect(result).toBeDefined();
      // All alerts should be critical
      result.data.forEach((alert) => {
        expect(alert.severity).toBe('critical');
      });
    });

    it('[P1] should accept severity: "warning"', async () => {
      const rawQuery = { severity: 'warning' };

      const result = await controller.getAlerts(rawQuery);

      expect(result).toBeDefined();
      // All alerts should be warning
      result.data.forEach((alert) => {
        expect(alert.severity).toBe('warning');
      });
    });

    it('[P1] should accept severity: "all"', async () => {
      const rawQuery = { severity: 'all' };

      const result = await controller.getAlerts(rawQuery);

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('[P1] should limit alerts to 10 items', async () => {
      const result = await controller.getAlerts({});

      expect(result.data.length).toBeLessThanOrEqual(10);
    });

    it('[P1] should return valid alert structure', async () => {
      const result = await controller.getAlerts({});

      if (result.data.length > 0) {
        const alert = result.data[0]!;
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('model');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('currentStock');
        expect(alert).toHaveProperty('minimumThreshold');
        expect(alert).toHaveProperty('severity');
        expect(['critical', 'warning']).toContain(alert.severity);
      }
    });

    it('[P2] should complete within 500ms (performance)', async () => {
      const start = Date.now();
      await controller.getAlerts({ days: '30' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================
  // STOCK MOVEMENT ENDPOINT
  // ============================================

  describe('GET /api/v1/dashboard/inventory/movement', () => {
    it('[P0] should call service.getMovement with parsed query', async () => {
      const serviceSpy = vi.spyOn(service, 'getMovement');
      const rawQuery = { days: '7' };

      await controller.getMovement(rawQuery);

      expect(serviceSpy).toHaveBeenCalledTimes(1);
      expect(serviceSpy).toHaveBeenCalledWith({
        days: 7,
      });
    });

    it('[P0] should return response with { data: [...] } wrapper', async () => {
      const result = await controller.getMovement({});

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('[P0] should validate response schema compliance (Zod)', async () => {
      const result = await controller.getMovement({});

      const validation = StockMovementResponseSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('[P1] should use default days=30 when not provided', async () => {
      const serviceSpy = vi.spyOn(service, 'getMovement');
      const rawQuery = {};

      await controller.getMovement(rawQuery);

      expect(serviceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30,
        })
      );
    });

    it('[P1] should return correct number of data points for days=7', async () => {
      const result = await controller.getMovement({ days: '7' });

      expect(result.data.length).toBe(7);
    });

    it('[P1] should return correct number of data points for days=30', async () => {
      const result = await controller.getMovement({ days: '30' });

      expect(result.data.length).toBe(30);
    });

    it('[P1] should return valid movement structure', async () => {
      const result = await controller.getMovement({ days: '7' });

      result.data.forEach((movement) => {
        expect(movement).toHaveProperty('date');
        expect(movement).toHaveProperty('inbound');
        expect(movement).toHaveProperty('outbound');
        expect(movement).toHaveProperty('net');

        // Validate types
        expect(typeof movement.date).toBe('string');
        expect(typeof movement.inbound).toBe('number');
        expect(typeof movement.outbound).toBe('number');
        expect(typeof movement.net).toBe('number');

        // Validate date format (YYYY-MM-DD)
        expect(movement.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Validate net calculation
        expect(movement.net).toBe(movement.inbound - movement.outbound);
      });
    });

    it('[P0] should throw ZodError on invalid days parameter', async () => {
      const rawQuery = { days: 'invalid' };

      await expect(controller.getMovement(rawQuery)).rejects.toThrow(ZodError);
    });

    it('[P2] should handle large dataset (days=90)', async () => {
      const start = Date.now();
      const result = await controller.getMovement({ days: '90' });
      const duration = Date.now() - start;

      expect(result.data.length).toBe(90);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('[P2] should complete within 500ms for days=30 (performance)', async () => {
      const start = Date.now();
      await controller.getMovement({ days: '30' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================
  // STOCK HEATMAP ENDPOINT
  // ============================================

  describe('GET /api/v1/dashboard/inventory/heatmap', () => {
    it('[P0] should call service.getHeatmap', async () => {
      const serviceSpy = vi.spyOn(service, 'getHeatmap');

      await controller.getHeatmap();

      expect(serviceSpy).toHaveBeenCalledTimes(1);
    });

    it('[P0] should return response with { data: [...] } wrapper', async () => {
      const result = await controller.getHeatmap();

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('[P0] should validate response schema compliance (Zod)', async () => {
      const result = await controller.getHeatmap();

      const validation = StockHeatmapResponseSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('[P1] should return non-empty heatmap data', async () => {
      const result = await controller.getHeatmap();

      expect(result.data.length).toBeGreaterThan(0);
    });

    it('[P1] should return valid heatmap structure', async () => {
      const result = await controller.getHeatmap();

      result.data.forEach((data) => {
        expect(data).toHaveProperty('machineType');
        expect(data).toHaveProperty('location');
        expect(data).toHaveProperty('count');
        expect(data).toHaveProperty('utilizationPercent');

        // Validate types
        expect(typeof data.machineType).toBe('string');
        expect(typeof data.location).toBe('string');
        expect(typeof data.count).toBe('number');
        expect(typeof data.utilizationPercent).toBe('number');

        // Validate ranges
        expect(data.count).toBeGreaterThanOrEqual(0);
        expect(data.utilizationPercent).toBeGreaterThanOrEqual(0);
        expect(data.utilizationPercent).toBeLessThanOrEqual(100);
      });
    });

    it('[P1] should return grid data (machine types × locations)', async () => {
      const result = await controller.getHeatmap();

      // Should have multiple machine types
      const machineTypes = new Set(result.data.map((d) => d.machineType));
      expect(machineTypes.size).toBeGreaterThan(1);

      // Should have multiple locations
      const locations = new Set(result.data.map((d) => d.location));
      expect(locations.size).toBeGreaterThan(1);
    });

    it('[P2] should complete within 500ms (performance)', async () => {
      const start = Date.now();
      await controller.getHeatmap();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  // ============================================
  // RESPONSE FORMAT COMPLIANCE
  // ============================================

  describe('Response Format Compliance', () => {
    it('[P0] all endpoints should return { data: ... } wrapper', async () => {
      const summary = await controller.getSummary();
      expect(summary).toHaveProperty('data');

      const alerts = await controller.getAlerts({});
      expect(alerts).toHaveProperty('data');

      const movement = await controller.getMovement({});
      expect(movement).toHaveProperty('data');

      const heatmap = await controller.getHeatmap();
      expect(heatmap).toHaveProperty('data');
    });

    it('[P0] all responses should NOT have { error: ... } on success', async () => {
      const summary = await controller.getSummary();
      expect(summary).not.toHaveProperty('error');

      const alerts = await controller.getAlerts({});
      expect(alerts).not.toHaveProperty('error');

      const movement = await controller.getMovement({});
      expect(movement).not.toHaveProperty('error');

      const heatmap = await controller.getHeatmap();
      expect(heatmap).not.toHaveProperty('error');
    });

    it('[P0] all array responses should be valid arrays', async () => {
      const alerts = await controller.getAlerts({});
      expect(Array.isArray(alerts.data)).toBe(true);

      const movement = await controller.getMovement({});
      expect(Array.isArray(movement.data)).toBe(true);

      const heatmap = await controller.getHeatmap();
      expect(Array.isArray(heatmap.data)).toBe(true);
    });
  });

  // ============================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================

  describe('Edge Cases', () => {
    it('[P1] should handle empty query object', async () => {
      await expect(controller.getAlerts({})).resolves.toBeDefined();
      await expect(controller.getMovement({})).resolves.toBeDefined();
    });

    it('[P1] should handle undefined query parameters', async () => {
      const rawQuery: Record<string, unknown> = { days: undefined };

      // Should use default value
      const serviceSpy = vi.spyOn(service, 'getAlerts');
      await controller.getAlerts(rawQuery);

      expect(serviceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30, // Default value
        })
      );
    });

    it('[P1] should handle empty string severity', async () => {
      const rawQuery = { severity: '' };

      // Should fail Zod validation (empty string not in enum)
      await expect(controller.getAlerts(rawQuery)).rejects.toThrow();
    });

    it('[P1] should reject whitespace-padded severity', async () => {
      const rawQuery = { severity: '  critical  ' };

      // Zod enum validation does not trim by default
      // Should reject whitespace-padded values
      await expect(controller.getAlerts(rawQuery)).rejects.toThrow(ZodError);
    });

    it('[P2] should handle very large days value', async () => {
      const rawQuery = { days: '365' };

      const result = await controller.getMovement(rawQuery);

      expect(result.data.length).toBe(365);
    });

    it('[P2] should handle days=1 (minimum)', async () => {
      const rawQuery = { days: '1' };

      const result = await controller.getMovement(rawQuery);

      expect(result.data.length).toBe(1);
    });
  });

  // ============================================
  // CORS AND MIDDLEWARE COMPATIBILITY
  // ============================================

  describe('CORS and Middleware Compatibility', () => {
    it('[P1] all endpoints should be publicly callable (no auth for MVP)', async () => {
      // Test that endpoints don't throw auth errors
      await expect(controller.getSummary()).resolves.toBeDefined();
      await expect(controller.getAlerts({})).resolves.toBeDefined();
      await expect(controller.getMovement({})).resolves.toBeDefined();
      await expect(controller.getHeatmap()).resolves.toBeDefined();
    });

    it('[P1] response structure should be JSON-serializable', async () => {
      const summary = await controller.getSummary();
      const jsonString = JSON.stringify(summary);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual(summary);
    });

    it('[P1] should handle concurrent requests gracefully', async () => {
      const promises = [
        controller.getSummary(),
        controller.getAlerts({}),
        controller.getMovement({}),
        controller.getHeatmap(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result).toHaveProperty('data');
      });
    });
  });

  // ============================================
  // INTEGRATION WITH SERVICE LAYER
  // ============================================

  describe('Service Layer Integration', () => {
    it('[P0] controller should delegate to service for getSummary', async () => {
      const serviceSpy = vi.spyOn(service, 'getSummary');

      await controller.getSummary();

      expect(serviceSpy).toHaveBeenCalledTimes(1);
    });

    it('[P0] controller should delegate to service for getAlerts', async () => {
      const serviceSpy = vi.spyOn(service, 'getAlerts');
      const query: InventoryQueryDto = { days: 30, severity: 'critical' };

      await controller.getAlerts(query);

      expect(serviceSpy).toHaveBeenCalledWith(query);
    });

    it('[P0] controller should delegate to service for getMovement', async () => {
      const serviceSpy = vi.spyOn(service, 'getMovement');
      const query: InventoryQueryDto = { days: 7 };

      await controller.getMovement(query);

      expect(serviceSpy).toHaveBeenCalledWith(query);
    });

    it('[P0] controller should delegate to service for getHeatmap', async () => {
      const serviceSpy = vi.spyOn(service, 'getHeatmap');

      await controller.getHeatmap();

      expect(serviceSpy).toHaveBeenCalledTimes(1);
    });

    it('[P1] controller should not modify service response', async () => {
      const serviceResponse = {
        data: {
          total: 342,
          byLocation: { bolt_1: { count: 180, percentage: 52.6 } },
          byStatus: { available: 52, rented: 290, service: 0 },
        },
      };

      vi.spyOn(service, 'getSummary').mockResolvedValue(serviceResponse);

      const controllerResponse = await controller.getSummary();

      expect(controllerResponse).toEqual(serviceResponse);
    });
  });
});
