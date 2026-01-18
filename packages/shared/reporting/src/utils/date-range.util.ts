/**
 * @kgc/reporting - Date Range Utility
 * Epic 27: Common date range calculation
 */

import { DateRange } from '../interfaces/reporting.interface';

export function calculateDateRange(
  range: string,
  customStart?: Date,
  customEnd?: Date,
): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (range) {
    case DateRange.TODAY:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case DateRange.YESTERDAY:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case DateRange.THIS_WEEK:
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      break;
    case DateRange.LAST_WEEK:
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay());
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      startDate = lastWeekStart;
      endDate = lastWeekEnd;
      break;
    case DateRange.THIS_MONTH:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case DateRange.LAST_MONTH:
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case DateRange.THIS_QUARTER:
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case DateRange.THIS_YEAR:
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case DateRange.CUSTOM:
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires startDate and endDate');
      }
      startDate = customStart;
      endDate = customEnd;
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { startDate, endDate };
}
