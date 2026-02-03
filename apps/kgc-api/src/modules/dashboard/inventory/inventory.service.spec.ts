import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryService } from './inventory.service';
import type { InventoryQueryDto } from './dto/inventory-query.dto';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService();
  });

  describe('getSummary', () => {
    it('should return stock summary with total count', async () => {
      const result = await service.getSummary();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.total).toBeGreaterThanOrEqual(0);
      expect(typeof result.data.total).toBe('number');
    });

    it('should return byLocation with at least one location', async () => {
      const result = await service.getSummary();

      expect(result.data.byLocation).toBeDefined();
      expect(Object.keys(result.data.byLocation).length).toBeGreaterThan(0);
    });

    it('should calculate location percentages correctly', async () => {
      const result = await service.getSummary();

      const totalPercentage = Object.values(result.data.byLocation).reduce(
        (sum, loc) => sum + loc.percentage,
        0,
      );

      // Allow small floating point error
      expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.1);
    });

    it('should return location counts that sum to total', async () => {
      const result = await service.getSummary();

      const totalCount = Object.values(result.data.byLocation).reduce(
        (sum, loc) => sum + loc.count,
        0,
      );

      expect(totalCount).toBe(result.data.total);
    });

    it('should return byStatus with all three status types', async () => {
      const result = await service.getSummary();

      expect(result.data.byStatus).toBeDefined();
      expect(result.data.byStatus.available).toBeGreaterThanOrEqual(0);
      expect(result.data.byStatus.rented).toBeGreaterThanOrEqual(0);
      expect(result.data.byStatus.service).toBeGreaterThanOrEqual(0);
    });

    it('should have status counts sum to total', async () => {
      const result = await service.getSummary();

      const statusTotal =
        result.data.byStatus.available +
        result.data.byStatus.rented +
        result.data.byStatus.service;

      expect(statusTotal).toBe(result.data.total);
    });
  });

  describe('getAlerts', () => {
    it('should return array of stock alerts', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getAlerts(query);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter by critical severity', async () => {
      const query: InventoryQueryDto = { days: 30, severity: 'critical' };
      const result = await service.getAlerts(query);

      expect(Array.isArray(result.data)).toBe(true);
      result.data.forEach((alert) => {
        expect(alert.severity).toBe('critical');
      });
    });

    it('should filter by warning severity', async () => {
      const query: InventoryQueryDto = { days: 30, severity: 'warning' };
      const result = await service.getAlerts(query);

      expect(Array.isArray(result.data)).toBe(true);
      result.data.forEach((alert) => {
        expect(alert.severity).toBe('warning');
      });
    });

    it('should return all alerts when severity is "all"', async () => {
      const query: InventoryQueryDto = { days: 30, severity: 'all' };
      const result = await service.getAlerts(query);

      expect(Array.isArray(result.data)).toBe(true);
      // Should contain both critical and warning
      const hasCritical = result.data.some((a) => a.severity === 'critical');
      const hasWarning = result.data.some((a) => a.severity === 'warning');
      expect(hasCritical || hasWarning).toBe(true);
    });

    it('should limit alerts to max 10', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getAlerts(query);

      expect(result.data.length).toBeLessThanOrEqual(10);
    });

    it('should mark critical when currentStock < 50% threshold', async () => {
      const query: InventoryQueryDto = { days: 30, severity: 'critical' };
      const result = await service.getAlerts(query);

      result.data.forEach((alert) => {
        if (alert.severity === 'critical') {
          expect(alert.currentStock).toBeLessThan(alert.minimumThreshold * 0.5);
        }
      });
    });

    it('should mark warning when currentStock is 50-100% threshold', async () => {
      const query: InventoryQueryDto = { days: 30, severity: 'warning' };
      const result = await service.getAlerts(query);

      result.data.forEach((alert) => {
        if (alert.severity === 'warning') {
          expect(alert.currentStock).toBeGreaterThanOrEqual(alert.minimumThreshold * 0.5);
          expect(alert.currentStock).toBeLessThan(alert.minimumThreshold);
        }
      });
    });

    it('should have valid alert structure', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getAlerts(query);

      result.data.forEach((alert) => {
        expect(alert.id).toBeDefined();
        expect(alert.model).toBeDefined();
        expect(alert.type).toBeDefined();
        expect(typeof alert.currentStock).toBe('number');
        expect(typeof alert.minimumThreshold).toBe('number');
        expect(['critical', 'warning']).toContain(alert.severity);
      });
    });
  });

  describe('getMovement', () => {
    it('should return movement data for specified days', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getMovement(query);

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(30);
    });

    it('should return 7 days when days=7', async () => {
      const query: InventoryQueryDto = { days: 7 };
      const result = await service.getMovement(query);

      expect(result.data.length).toBe(7);
    });

    it('should have valid movement structure', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getMovement(query);

      result.data.forEach((movement) => {
        expect(movement.date).toBeDefined();
        expect(typeof movement.inbound).toBe('number');
        expect(typeof movement.outbound).toBe('number');
        expect(typeof movement.net).toBe('number');
        expect(movement.inbound).toBeGreaterThanOrEqual(0);
        expect(movement.outbound).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate net correctly (inbound - outbound)', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getMovement(query);

      result.data.forEach((movement) => {
        expect(movement.net).toBe(movement.inbound - movement.outbound);
      });
    });

    it('should have dates in descending order (newest first)', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getMovement(query);

      for (let i = 0; i < result.data.length - 1; i++) {
        const currentDate = new Date(result.data[i]!.date);
        const nextDate = new Date(result.data[i + 1]!.date);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    it('should have valid ISO date format', async () => {
      const query: InventoryQueryDto = { days: 30 };
      const result = await service.getMovement(query);

      result.data.forEach((movement) => {
        const date = new Date(movement.date);
        expect(date.toString()).not.toBe('Invalid Date');
      });
    });
  });

  describe('getHeatmap', () => {
    it('should return heatmap data array', async () => {
      const result = await service.getHeatmap();

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should have valid heatmap structure', async () => {
      const result = await service.getHeatmap();

      result.data.forEach((data) => {
        expect(data.machineType).toBeDefined();
        expect(data.location).toBeDefined();
        expect(typeof data.count).toBe('number');
        expect(typeof data.utilizationPercent).toBe('number');
        expect(data.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have utilization percentage between 0 and 100', async () => {
      const result = await service.getHeatmap();

      result.data.forEach((data) => {
        expect(data.utilizationPercent).toBeGreaterThanOrEqual(0);
        expect(data.utilizationPercent).toBeLessThanOrEqual(100);
      });
    });

    it('should contain multiple machine types', async () => {
      const result = await service.getHeatmap();

      const machineTypes = new Set(result.data.map((d) => d.machineType));
      expect(machineTypes.size).toBeGreaterThan(1);
    });

    it('should contain multiple locations', async () => {
      const result = await service.getHeatmap();

      const locations = new Set(result.data.map((d) => d.location));
      expect(locations.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle default days=30 when not provided', async () => {
      const query: InventoryQueryDto = {};
      const result = await service.getMovement(query);

      expect(result.data.length).toBe(30);
    });

    it('should not throw on empty query object', async () => {
      const query: InventoryQueryDto = {};

      await expect(service.getSummary()).resolves.toBeDefined();
      await expect(service.getAlerts(query)).resolves.toBeDefined();
      await expect(service.getMovement(query)).resolves.toBeDefined();
      await expect(service.getHeatmap()).resolves.toBeDefined();
    });
  });
});
