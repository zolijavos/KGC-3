/**
 * @kgc/partner - PaymentReminderService Property-Based Tests
 * Epic 44: Story 44-1 - Fizetési emlékeztetők
 *
 * Property-based tests for reminder level determination
 * YOLO Pipeline - Auto-generated
 */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PaymentReminderService } from './payment-reminder.service';

describe('PaymentReminderService - Property-Based Tests', () => {
  describe('determineSuggestedLevel', () => {
    const service = new PaymentReminderService();

    it('Property: Days < 7 never suggests a reminder', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 6 }), daysOverdue => {
          const level = service.determineSuggestedLevel(daysOverdue, []);
          expect(level).toBeNull();
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Days 7-13 with no previous reminders suggests FIRST', () => {
      fc.assert(
        fc.property(fc.integer({ min: 7, max: 13 }), daysOverdue => {
          const level = service.determineSuggestedLevel(daysOverdue, []);
          expect(level).toBe('FIRST');
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Days 7-13 with FIRST already sent suggests null', () => {
      fc.assert(
        fc.property(fc.integer({ min: 7, max: 13 }), daysOverdue => {
          const level = service.determineSuggestedLevel(daysOverdue, ['FIRST']);
          expect(level).toBeNull();
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Days 14-29 with FIRST sent suggests SECOND', () => {
      fc.assert(
        fc.property(fc.integer({ min: 14, max: 29 }), daysOverdue => {
          const level = service.determineSuggestedLevel(daysOverdue, ['FIRST']);
          expect(level).toBe('SECOND');
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Days 14-29 without FIRST suggests FIRST first', () => {
      fc.assert(
        fc.property(fc.integer({ min: 14, max: 29 }), daysOverdue => {
          const level = service.determineSuggestedLevel(daysOverdue, []);
          expect(level).toBe('FIRST');
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Days 30+ with FIRST and SECOND sent suggests FINAL', () => {
      fc.assert(
        fc.property(fc.integer({ min: 30, max: 365 }), daysOverdue => {
          const level = service.determineSuggestedLevel(daysOverdue, ['FIRST', 'SECOND']);
          expect(level).toBe('FINAL');
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Days 30+ without all previous suggests the missing one', () => {
      fc.assert(
        fc.property(fc.integer({ min: 30, max: 365 }), daysOverdue => {
          // No previous reminders - should suggest FIRST
          const level1 = service.determineSuggestedLevel(daysOverdue, []);
          expect(level1).toBe('FIRST');

          // Only FIRST - should suggest SECOND
          const level2 = service.determineSuggestedLevel(daysOverdue, ['FIRST']);
          expect(level2).toBe('SECOND');
        }),
        { numRuns: 30 }
      );
    });

    it('Property: All levels sent returns null regardless of days', () => {
      fc.assert(
        fc.property(fc.integer({ min: 30, max: 365 }), daysOverdue => {
          const level = service.determineSuggestedLevel(daysOverdue, ['FIRST', 'SECOND', 'FINAL']);
          expect(level).toBeNull();
        }),
        { numRuns: 30 }
      );
    });

    it('Property: Level progression is always FIRST -> SECOND -> FINAL', () => {
      fc.assert(
        fc.property(fc.integer({ min: 30, max: 365 }), daysOverdue => {
          // Test all progression scenarios
          const level1 = service.determineSuggestedLevel(daysOverdue, []);
          const level2 = service.determineSuggestedLevel(daysOverdue, ['FIRST']);
          const level3 = service.determineSuggestedLevel(daysOverdue, ['FIRST', 'SECOND']);
          const level4 = service.determineSuggestedLevel(daysOverdue, ['FIRST', 'SECOND', 'FINAL']);

          expect(level1).toBe('FIRST');
          expect(level2).toBe('SECOND');
          expect(level3).toBe('FINAL');
          expect(level4).toBeNull();
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('getDaysOverdue', () => {
    const service = new PaymentReminderService();

    it('Property: Future dates return 0', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 365 }), daysInFuture => {
          const now = new Date('2026-02-07');
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + daysInFuture);

          const days = service.getDaysOverdue(dueDate, now);
          expect(days).toBe(0);
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Past dates return positive days', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 365 }), daysInPast => {
          const now = new Date('2026-02-07');
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() - daysInPast);

          const days = service.getDaysOverdue(dueDate, now);
          expect(days).toBe(daysInPast);
        }),
        { numRuns: 50 }
      );
    });

    it('Property: Same date returns 0', () => {
      const now = new Date('2026-02-07');
      const days = service.getDaysOverdue(now, now);
      expect(days).toBe(0);
    });

    it('Property: Days calculation is monotonic', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 180 }),
          fc.integer({ min: 1, max: 180 }),
          (days1, days2) => {
            const now = new Date('2026-02-07');
            const dueDate1 = new Date(now);
            dueDate1.setDate(dueDate1.getDate() - days1);
            const dueDate2 = new Date(now);
            dueDate2.setDate(dueDate2.getDate() - days2);

            const result1 = service.getDaysOverdue(dueDate1, now);
            const result2 = service.getDaysOverdue(dueDate2, now);

            if (days1 > days2) {
              expect(result1).toBeGreaterThan(result2);
            } else if (days1 < days2) {
              expect(result1).toBeLessThan(result2);
            } else {
              expect(result1).toBe(result2);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('getEmailTemplate', () => {
    const service = new PaymentReminderService();

    it('Property: FIRST level has polite tone', () => {
      const template = service.getEmailTemplate('FIRST');
      expect(template.tone).toBe('polite');
      expect(template.subject).toContain('emlékeztető');
    });

    it('Property: SECOND level has firm tone', () => {
      const template = service.getEmailTemplate('SECOND');
      expect(template.tone).toBe('firm');
      expect(template.subject).toContain('felszólítás');
    });

    it('Property: FINAL level has warning tone with suspension mention', () => {
      const template = service.getEmailTemplate('FINAL');
      expect(template.tone).toBe('warning');
      expect(template.body).toContain('felfüggesztés');
    });

    it('Property: All templates contain amount and date placeholders', () => {
      const levels = ['FIRST', 'SECOND', 'FINAL'] as const;

      for (const level of levels) {
        const template = service.getEmailTemplate(level);
        expect(template.body).toContain('{{amount}}');
        expect(template.body).toContain('{{dueDate}}');
      }
    });
  });
});
