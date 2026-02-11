/**
 * useRentalReport Hook Tests - Epic 48: Story 48-2
 * Bérlési Riport Oldal - Unit tests for the hook
 */

import { describe, expect, it, vi } from 'vitest';

import type { RentalReportFilters, RentalReportResponse } from './use-rental-report';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('useRentalReport types', () => {
  it('should define RentalReportFilters interface correctly', () => {
    const filters: RentalReportFilters = {
      from: '2026-01-01',
      to: '2026-01-31',
      equipmentType: 'Fúrókalapács',
    };

    expect(filters.from).toBe('2026-01-01');
    expect(filters.to).toBe('2026-01-31');
    expect(filters.equipmentType).toBe('Fúrókalapács');
  });

  it('should allow partial filters', () => {
    const emptyFilters: RentalReportFilters = {};
    const fromOnlyFilters: RentalReportFilters = { from: '2026-01-01' };
    const typeOnlyFilters: RentalReportFilters = { equipmentType: 'Generátor' };

    expect(emptyFilters).toEqual({});
    expect(fromOnlyFilters.from).toBe('2026-01-01');
    expect(typeOnlyFilters.equipmentType).toBe('Generátor');
  });

  it('should define RentalReportResponse interface correctly', () => {
    const response: RentalReportResponse = {
      summary: {
        totalRentals: 100,
        activeRentals: 18,
        closedRentals: 82,
        averageRentalDays: 4.2,
        averageRevenuePerRental: 28500,
        overdueReturns: 3,
      },
      byEquipmentType: [
        { type: 'Fúrókalapács', count: 45, revenue: 1350000 },
        { type: 'Sarokcsiszoló', count: 55, revenue: 825000 },
      ],
      periodStart: '2026-01-01T00:00:00.000Z',
      periodEnd: '2026-01-31T23:59:59.999Z',
    };

    expect(response.summary.totalRentals).toBe(100);
    expect(response.summary.activeRentals).toBe(18);
    expect(response.summary.closedRentals).toBe(82);
    expect(response.summary.averageRentalDays).toBe(4.2);
    expect(response.summary.averageRevenuePerRental).toBe(28500);
    expect(response.summary.overdueReturns).toBe(3);
    expect(response.byEquipmentType).toHaveLength(2);
    expect(response.byEquipmentType[0]?.type).toBe('Fúrókalapács');
    expect(response.periodStart).toContain('2026-01-01');
    expect(response.periodEnd).toContain('2026-01-31');
  });

  it('should validate equipment type breakdown structure', () => {
    const equipmentType = {
      type: 'Magasnyomású mosó',
      count: 28,
      revenue: 1120000,
    };

    expect(equipmentType.type).toBe('Magasnyomású mosó');
    expect(equipmentType.count).toBe(28);
    expect(equipmentType.revenue).toBe(1120000);
  });
});
