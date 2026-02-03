import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService();
    controller = new InventoryController(service);
  });

  describe('getSummary', () => {
    it('should call service.getSummary', async () => {
      const spy = vi.spyOn(service, 'getSummary');

      await controller.getSummary();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return stock summary response', async () => {
      const result = await controller.getSummary();

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.byLocation).toBeDefined();
      expect(result.byStatus).toBeDefined();
    });

    it('should return valid byStatus structure', async () => {
      const result = await controller.getSummary();

      expect(result.byStatus.available).toBeGreaterThanOrEqual(0);
      expect(result.byStatus.rented).toBeGreaterThanOrEqual(0);
      expect(result.byStatus.service).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAlerts', () => {
    it('should call service.getAlerts with parsed query', async () => {
      const spy = vi.spyOn(service, 'getAlerts');
      const rawQuery = { days: '30', severity: 'critical' };

      await controller.getAlerts(rawQuery);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        days: 30,
        severity: 'critical',
      });
    });

    it('should return alerts array', async () => {
      const rawQuery = { days: '30' };
      const result = await controller.getAlerts(rawQuery);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle severity filter', async () => {
      const rawQuery = { days: '30', severity: 'warning' };
      const result = await controller.getAlerts(rawQuery);

      result.forEach((alert) => {
        expect(alert.severity).toBe('warning');
      });
    });

    it('should validate query parameters with Zod', async () => {
      const rawQuery = { days: '30', severity: 'critical' };

      await expect(controller.getAlerts(rawQuery)).resolves.toBeDefined();
    });

    it('should throw on invalid severity', async () => {
      const rawQuery = { days: '30', severity: 'invalid' };

      await expect(controller.getAlerts(rawQuery)).rejects.toThrow();
    });

    it('should throw on invalid days (negative)', async () => {
      const rawQuery = { days: '-5' };

      await expect(controller.getAlerts(rawQuery)).rejects.toThrow();
    });

    it('should throw on invalid days (zero)', async () => {
      const rawQuery = { days: '0' };

      await expect(controller.getAlerts(rawQuery)).rejects.toThrow();
    });

    it('should use default days=30 when not provided', async () => {
      const spy = vi.spyOn(service, 'getAlerts');
      const rawQuery = {};

      await controller.getAlerts(rawQuery);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30,
        }),
      );
    });
  });

  describe('getMovement', () => {
    it('should call service.getMovement with parsed query', async () => {
      const spy = vi.spyOn(service, 'getMovement');
      const rawQuery = { days: '7' };

      await controller.getMovement(rawQuery);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        days: 7,
      });
    });

    it('should return movement data array', async () => {
      const rawQuery = { days: '30' };
      const result = await controller.getMovement(rawQuery);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should validate days parameter', async () => {
      const rawQuery = { days: '30' };

      await expect(controller.getMovement(rawQuery)).resolves.toBeDefined();
    });

    it('should use default days=30', async () => {
      const spy = vi.spyOn(service, 'getMovement');
      const rawQuery = {};

      await controller.getMovement(rawQuery);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          days: 30,
        }),
      );
    });
  });

  describe('getHeatmap', () => {
    it('should call service.getHeatmap', async () => {
      const spy = vi.spyOn(service, 'getHeatmap');

      await controller.getHeatmap();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should return heatmap data array', async () => {
      const result = await controller.getHeatmap();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return valid heatmap structure', async () => {
      const result = await controller.getHeatmap();

      result.forEach((data) => {
        expect(data.machineType).toBeDefined();
        expect(data.location).toBeDefined();
        expect(typeof data.count).toBe('number');
        expect(typeof data.utilizationPercent).toBe('number');
      });
    });
  });

  describe('RBAC and Validation', () => {
    it('should have all endpoints accessible', async () => {
      // Test that all endpoints are callable (RBAC will be enforced via guards)
      await expect(controller.getSummary()).resolves.toBeDefined();
      await expect(controller.getAlerts({})).resolves.toBeDefined();
      await expect(controller.getMovement({})).resolves.toBeDefined();
      await expect(controller.getHeatmap()).resolves.toBeDefined();
    });
  });
});
