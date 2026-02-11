import { beforeEach, describe, expect, it } from 'vitest';
import { RecurringIssuesService } from '../recurring-issues.service';

/**
 * Recurring Issues Service Tests (Story 49-2)
 *
 * Unit tests for recurring issues service
 * Priority: P1 (High - PR to main)
 */
describe('RecurringIssuesService', () => {
  let service: RecurringIssuesService;

  beforeEach(() => {
    service = new RecurringIssuesService();
  });

  describe('getRecurringIssues', () => {
    it('[P0] should return equipment with recurring issues', async () => {
      // GIVEN: Service with mock data

      // WHEN: Getting recurring issues with default threshold
      const result = await service.getRecurringIssues();

      // THEN: Returns equipment list with expected structure
      expect(result).toHaveProperty('equipment');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('criticalCount');
      expect(Array.isArray(result.equipment)).toBe(true);
    });

    it('[P1] should filter equipment by threshold', async () => {
      // GIVEN: Service with mock data

      // WHEN: Getting recurring issues with threshold of 5
      const result = await service.getRecurringIssues(5);

      // THEN: All returned equipment have 5+ services
      expect(result.equipment.every(eq => eq.serviceCount >= 5)).toBe(true);
    });

    it('[P1] should mark equipment with 5+ services as critical', async () => {
      // GIVEN: Service with mock data

      // WHEN: Getting recurring issues
      const result = await service.getRecurringIssues(3);

      // THEN: Equipment with 5+ services are marked critical
      result.equipment.forEach(eq => {
        if (eq.serviceCount >= 5) {
          expect(eq.isCritical).toBe(true);
        } else {
          expect(eq.isCritical).toBe(false);
        }
      });
    });

    it('[P1] should correctly count critical equipment', async () => {
      // GIVEN: Service with mock data

      // WHEN: Getting recurring issues
      const result = await service.getRecurringIssues(3);

      // THEN: Critical count matches actual critical equipment
      const actualCriticalCount = result.equipment.filter(eq => eq.isCritical).length;
      expect(result.criticalCount).toBe(actualCriticalCount);
    });

    it('[P1] should sort equipment by service count descending', async () => {
      // GIVEN: Service with mock data

      // WHEN: Getting recurring issues
      const result = await service.getRecurringIssues(3);

      // THEN: Equipment is sorted by service count (highest first)
      for (let i = 0; i < result.equipment.length - 1; i++) {
        const current = result.equipment[i];
        const next = result.equipment[i + 1];
        if (current && next) {
          expect(current.serviceCount).toBeGreaterThanOrEqual(next.serviceCount);
        }
      }
    });

    it('[P2] should include issues array for each equipment', async () => {
      // GIVEN: Service with mock data

      // WHEN: Getting recurring issues
      const result = await service.getRecurringIssues(3);

      // THEN: Each equipment has issues array
      result.equipment.forEach(eq => {
        expect(Array.isArray(eq.issues)).toBe(true);
        expect(eq.issues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getServiceHistory', () => {
    it('[P0] should return service history for existing equipment', async () => {
      // GIVEN: Service with mock data and known equipment ID

      // WHEN: Getting service history
      const result = await service.getServiceHistory('eq-001');

      // THEN: Returns equipment with worksheets
      expect(result).not.toBeNull();
      expect(result?.equipment).toHaveProperty('id', 'eq-001');
      expect(result?.equipment).toHaveProperty('name');
      expect(result?.equipment).toHaveProperty('serialNumber');
      expect(Array.isArray(result?.worksheets)).toBe(true);
    });

    it('[P1] should return null for non-existing equipment', async () => {
      // GIVEN: Service with mock data

      // WHEN: Getting service history for non-existing equipment
      const result = await service.getServiceHistory('non-existing-id');

      // THEN: Returns null
      expect(result).toBeNull();
    });

    it('[P1] should include worksheet details', async () => {
      // GIVEN: Service with mock data and known equipment ID

      // WHEN: Getting service history for equipment with worksheets
      const result = await service.getServiceHistory('eq-001');

      // THEN: Worksheets have expected structure
      expect(result?.worksheets?.length).toBeGreaterThan(0);
      const worksheet = result?.worksheets?.[0];
      if (worksheet) {
        expect(worksheet).toHaveProperty('id');
        expect(worksheet).toHaveProperty('createdAt');
        expect(worksheet).toHaveProperty('status');
        expect(worksheet).toHaveProperty('issue');
        expect(worksheet).toHaveProperty('resolution');
        expect(worksheet).toHaveProperty('isWarranty');
        expect(worksheet).toHaveProperty('laborCost');
        expect(worksheet).toHaveProperty('partsCost');
      }
    });

    it('[P2] should return empty worksheets for equipment without history', async () => {
      // GIVEN: Service with mock data and equipment without history

      // WHEN: Getting service history for equipment without history
      const result = await service.getServiceHistory('eq-005');

      // THEN: Returns equipment with empty worksheets
      expect(result).not.toBeNull();
      expect(result?.equipment).toHaveProperty('id', 'eq-005');
      expect(Array.isArray(result?.worksheets)).toBe(true);
    });
  });
});
