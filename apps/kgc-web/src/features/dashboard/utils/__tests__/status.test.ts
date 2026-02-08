import { describe, expect, it } from 'vitest';
import {
  calculateBusinessHealth,
  calculateWidgetStatus,
  getHealthIcon,
  getStatusColors,
  type WidgetStatus,
} from '../status';

describe('calculateWidgetStatus', () => {
  describe('normal thresholds (higher is better)', () => {
    const thresholds = { warningAt: 80, criticalAt: 60 };

    it('should return healthy when value is above warning threshold', () => {
      expect(calculateWidgetStatus(90, 100, thresholds)).toBe('healthy');
      expect(calculateWidgetStatus(100, 100, thresholds)).toBe('healthy');
      expect(calculateWidgetStatus(81, 100, thresholds)).toBe('healthy');
    });

    it('should return warning when value is between critical and warning', () => {
      expect(calculateWidgetStatus(80, 100, thresholds)).toBe('warning');
      expect(calculateWidgetStatus(70, 100, thresholds)).toBe('warning');
      expect(calculateWidgetStatus(61, 100, thresholds)).toBe('warning');
    });

    it('should return critical when value is at or below critical threshold', () => {
      expect(calculateWidgetStatus(60, 100, thresholds)).toBe('critical');
      expect(calculateWidgetStatus(50, 100, thresholds)).toBe('critical');
      expect(calculateWidgetStatus(0, 100, thresholds)).toBe('critical');
    });

    it('should return neutral when target is zero', () => {
      expect(calculateWidgetStatus(100, 0, thresholds)).toBe('neutral');
    });
  });

  describe('inverse thresholds (lower is better)', () => {
    const thresholds = { warningAt: 80, criticalAt: 100, inverse: true };

    it('should return healthy when value is below warning threshold', () => {
      expect(calculateWidgetStatus(50, 100, thresholds)).toBe('healthy');
      expect(calculateWidgetStatus(79, 100, thresholds)).toBe('healthy');
    });

    it('should return warning when value is between warning and critical', () => {
      expect(calculateWidgetStatus(80, 100, thresholds)).toBe('warning');
      expect(calculateWidgetStatus(90, 100, thresholds)).toBe('warning');
      expect(calculateWidgetStatus(99, 100, thresholds)).toBe('warning');
    });

    it('should return critical when value is at or above critical threshold', () => {
      expect(calculateWidgetStatus(100, 100, thresholds)).toBe('critical');
      expect(calculateWidgetStatus(120, 100, thresholds)).toBe('critical');
    });
  });

  describe('edge cases', () => {
    it('should handle exact boundary values correctly', () => {
      const thresholds = { warningAt: 80, criticalAt: 60 };

      // Exactly at warning threshold
      expect(calculateWidgetStatus(80, 100, thresholds)).toBe('warning');

      // Exactly at critical threshold
      expect(calculateWidgetStatus(60, 100, thresholds)).toBe('critical');
    });

    it('should handle large values correctly', () => {
      const thresholds = { warningAt: 80, criticalAt: 60 };
      expect(calculateWidgetStatus(1500000, 1000000, thresholds)).toBe('healthy');
    });
  });
});

describe('calculateBusinessHealth', () => {
  describe('basic scenarios', () => {
    it('should return excellent when all KPIs are healthy', () => {
      const statuses: WidgetStatus[] = ['healthy', 'healthy', 'healthy', 'healthy'];
      expect(calculateBusinessHealth(statuses)).toBe('excellent');
    });

    it('should return good when max 1 warning', () => {
      const statuses: WidgetStatus[] = ['healthy', 'healthy', 'warning', 'healthy'];
      expect(calculateBusinessHealth(statuses)).toBe('good');
    });

    it('should return attention when 2+ warnings', () => {
      const statuses: WidgetStatus[] = ['healthy', 'warning', 'warning', 'healthy'];
      expect(calculateBusinessHealth(statuses)).toBe('attention');
    });

    it('should return attention when 1 critical', () => {
      const statuses: WidgetStatus[] = ['healthy', 'healthy', 'critical', 'healthy'];
      expect(calculateBusinessHealth(statuses)).toBe('attention');
    });

    it('should return problem when 2+ critical', () => {
      const statuses: WidgetStatus[] = ['healthy', 'critical', 'critical', 'healthy'];
      expect(calculateBusinessHealth(statuses)).toBe('problem');
    });

    it('should return critical when 3+ critical', () => {
      const statuses: WidgetStatus[] = ['critical', 'critical', 'critical', 'healthy'];
      expect(calculateBusinessHealth(statuses)).toBe('critical');
    });
  });

  describe('critical alert override', () => {
    it('should return critical when hasCriticalAlert is true', () => {
      const statuses: WidgetStatus[] = ['healthy', 'healthy', 'healthy', 'healthy'];
      expect(calculateBusinessHealth(statuses, true)).toBe('critical');
    });

    it('should return critical even with all healthy KPIs if hasCriticalAlert', () => {
      expect(calculateBusinessHealth(['healthy'], true)).toBe('critical');
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      expect(calculateBusinessHealth([])).toBe('excellent');
    });

    it('should handle single status', () => {
      expect(calculateBusinessHealth(['critical'])).toBe('attention');
      expect(calculateBusinessHealth(['warning'])).toBe('good');
      expect(calculateBusinessHealth(['healthy'])).toBe('excellent');
    });
  });
});

describe('getHealthIcon', () => {
  it('should return correct icon for each health status', () => {
    expect(getHealthIcon('excellent')).toEqual({ emoji: '☀️', label: 'Kiváló' });
    expect(getHealthIcon('good')).toEqual({ emoji: '🌤️', label: 'Jó' });
    expect(getHealthIcon('attention')).toEqual({ emoji: '⛅', label: 'Figyelj' });
    expect(getHealthIcon('problem')).toEqual({ emoji: '🌧️', label: 'Problémás' });
    expect(getHealthIcon('critical')).toEqual({ emoji: '⛈️', label: 'Kritikus' });
  });
});

describe('getStatusColors', () => {
  it('should return correct CSS classes for each status', () => {
    expect(getStatusColors('healthy')).toEqual({
      border: 'border-status-healthy',
      bg: 'bg-status-healthy-bg',
      text: 'text-status-healthy',
    });

    expect(getStatusColors('warning')).toEqual({
      border: 'border-status-warning',
      bg: 'bg-status-warning-bg',
      text: 'text-status-warning',
    });

    expect(getStatusColors('critical')).toEqual({
      border: 'border-status-critical',
      bg: 'bg-status-critical-bg',
      text: 'text-status-critical',
    });

    expect(getStatusColors('neutral')).toEqual({
      border: 'border-status-neutral',
      bg: 'bg-status-neutral-bg',
      text: 'text-status-neutral',
    });
  });
});
