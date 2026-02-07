/**
 * @kgc/sales-invoice - ReceivablesService
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * Service for generating receivables aging reports.
 * ADR-052: Kintlévőség Rendszerezés
 *
 * AGING BUCKETS (days since due date):
 * - 0-30 nap: Friss kintlévőség
 * - 31-60 nap: Figyelmeztetés
 * - 61-90 nap: Kritikus
 * - 90+ nap: Veszélyes
 *
 * ÜZLETI SZABÁLY:
 * - A dueDate-től számított napok száma határozza meg a bucket-et
 * - Top 5 legnagyobb adós listázása összeg szerint csökkenő sorrendben
 * - Egy partner több számlája összevontan jelenik meg
 */

/**
 * Aging bucket label type
 */
export type AgingBucketLabel = '0-30' | '31-60' | '61-90' | '90+';

/**
 * Invoice data for aging calculation
 */
export interface AgingInvoice {
  /** Invoice unique ID */
  id: string;
  /** Tenant ID (multi-tenancy ADR-001) */
  tenantId: string;
  /** Invoice number (számla szám) */
  invoiceNumber: string;
  /** Partner ID */
  partnerId: string;
  /** Partner name */
  partnerName: string;
  /** Due date (fizetési határidő) */
  dueDate: Date;
  /** Balance due (fennálló tartozás) */
  balanceDue: number;
  /** Original total amount */
  totalAmount: number;
  /** Invoice status */
  status: string;
}

/**
 * Aging bucket with invoices
 */
export interface AgingBucket {
  /** Bucket label */
  label: AgingBucketLabel;
  /** Number of invoices in bucket */
  count: number;
  /** Total amount in bucket */
  totalAmount: number;
  /** Invoices in this bucket */
  invoices: AgingInvoice[];
}

/**
 * Partner debt summary
 */
export interface PartnerDebt {
  /** Partner ID */
  partnerId: string;
  /** Partner name */
  partnerName: string;
  /** Total debt across all invoices */
  totalDebt: number;
  /** Number of unpaid invoices */
  invoiceCount: number;
  /** Oldest invoice due date */
  oldestDueDate: Date;
}

/**
 * Receivables aging report result
 */
export interface ReceivablesAgingReport {
  /** Report generation timestamp */
  generatedAt: Date;
  /** Total receivables amount */
  totalReceivables: number;
  /** Aging buckets (0-30, 31-60, 61-90, 90+) */
  buckets: AgingBucket[];
  /** Top 5 debtors */
  topDebtors: PartnerDebt[];
}

/**
 * Filters for aging report
 */
export interface ReceivablesAgingFilters {
  /** Filter by partner ID */
  partnerId?: string;
  /** Filter by date range start */
  fromDate?: Date;
  /** Filter by date range end */
  toDate?: Date;
}

/**
 * Repository interface for receivables data
 */
export interface IReceivablesRepository {
  /**
   * Get unpaid invoices for aging calculation
   * @param tenantId Tenant ID (ADR-001)
   * @param filters Optional filters
   * @returns Array of unpaid invoices
   */
  getUnpaidInvoices(tenantId: string, filters?: ReceivablesAgingFilters): Promise<AgingInvoice[]>;
}

/**
 * Receivables Service
 *
 * Generates aging reports for accounts receivable.
 * Uses TDD-developed logic per Story 41-1.
 */
export class ReceivablesService {
  /** All bucket labels in order */
  private static readonly BUCKET_LABELS: AgingBucketLabel[] = ['0-30', '31-60', '61-90', '90+'];

  constructor(private readonly repository: IReceivablesRepository) {}

  /**
   * Generate aging report
   *
   * @param tenantId Tenant ID (ADR-001)
   * @param filters Optional filters (partnerId, date range)
   * @returns Aging report with buckets and top debtors
   */
  async getAgingReport(
    tenantId: string,
    filters?: ReceivablesAgingFilters
  ): Promise<ReceivablesAgingReport> {
    // Fetch all unpaid invoices
    let invoices = await this.repository.getUnpaidInvoices(tenantId, filters);

    // Apply partner filter if provided
    if (filters?.partnerId) {
      invoices = invoices.filter(inv => inv.partnerId === filters.partnerId);
    }

    // Initialize empty buckets
    const buckets = this.initializeBuckets();

    // Categorize invoices into buckets
    const now = new Date();
    for (const invoice of invoices) {
      const daysOverdue = this.calculateDaysOverdue(invoice.dueDate, now);
      const bucketLabel = this.getBucketLabel(daysOverdue);
      const bucket = buckets.find(b => b.label === bucketLabel);

      if (bucket) {
        bucket.count++;
        bucket.totalAmount += invoice.balanceDue;
        bucket.invoices.push(invoice);
      }
    }

    // Round bucket amounts to avoid floating point issues
    for (const bucket of buckets) {
      bucket.totalAmount = Math.round(bucket.totalAmount * 100) / 100;
    }

    // Calculate total receivables
    const totalReceivables =
      Math.round(buckets.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100;

    // Calculate top debtors (aggregate by partner)
    const topDebtors = this.calculateTopDebtors(invoices);

    return {
      generatedAt: now,
      totalReceivables,
      buckets,
      topDebtors,
    };
  }

  /**
   * Initialize empty aging buckets
   */
  private initializeBuckets(): AgingBucket[] {
    return ReceivablesService.BUCKET_LABELS.map(label => ({
      label,
      count: 0,
      totalAmount: 0,
      invoices: [],
    }));
  }

  /**
   * Calculate days since due date
   * @param dueDate Invoice due date
   * @param now Current date
   * @returns Number of days (0 if not yet due)
   */
  private calculateDaysOverdue(dueDate: Date, now: Date): number {
    const diffMs = now.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Determine bucket label based on days overdue
   * @param daysOverdue Days since due date
   * @returns Bucket label
   */
  private getBucketLabel(daysOverdue: number): AgingBucketLabel {
    if (daysOverdue <= 30) return '0-30';
    if (daysOverdue <= 60) return '31-60';
    if (daysOverdue <= 90) return '61-90';
    return '90+';
  }

  /**
   * Calculate top 5 debtors aggregated by partner
   * @param invoices All unpaid invoices
   * @returns Top 5 partners by total debt
   */
  private calculateTopDebtors(invoices: AgingInvoice[]): PartnerDebt[] {
    // Aggregate by partner
    const partnerMap = new Map<string, PartnerDebt>();

    for (const invoice of invoices) {
      const existing = partnerMap.get(invoice.partnerId);

      if (existing) {
        existing.totalDebt += invoice.balanceDue;
        existing.invoiceCount++;
        if (invoice.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = invoice.dueDate;
        }
      } else {
        partnerMap.set(invoice.partnerId, {
          partnerId: invoice.partnerId,
          partnerName: invoice.partnerName,
          totalDebt: invoice.balanceDue,
          invoiceCount: 1,
          oldestDueDate: invoice.dueDate,
        });
      }
    }

    // Sort by total debt descending and take top 5
    const sortedDebtors = Array.from(partnerMap.values())
      .map(d => ({
        ...d,
        totalDebt: Math.round(d.totalDebt * 100) / 100,
      }))
      .sort((a, b) => b.totalDebt - a.totalDebt);

    return sortedDebtors.slice(0, 5);
  }
}
