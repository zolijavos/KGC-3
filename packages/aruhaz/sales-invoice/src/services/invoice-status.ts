/**
 * Invoice Status State Machine
 * Story 10-4: Számla Státusz Workflow
 * @package @kgc/sales-invoice
 *
 * TDD Implementation - State machine átmenetek
 */

/**
 * Számla státuszok
 */
export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED';

/**
 * Státusz átmenet hiba
 */
export class InvoiceStatusError extends Error {
  public readonly code = 'INVALID_STATUS_TRANSITION';

  constructor(from: InvoiceStatus, to: InvoiceStatus) {
    super(`Invalid status transition from ${from} to ${to}`);
    this.name = 'InvoiceStatusError';
  }
}

/**
 * Engedélyezett státusz átmenetek
 */
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['SENT', 'PAID', 'PARTIALLY_PAID', 'CANCELLED'],
  SENT: ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE'],
  OVERDUE: ['PAID', 'PARTIALLY_PAID'],
  PAID: [], // Final state
  CANCELLED: [], // Final state
};

/**
 * Ellenőrzi, hogy az átmenet engedélyezett-e
 */
export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  const allowedNextStatuses = ALLOWED_TRANSITIONS[from];
  return allowedNextStatuses?.includes(to) ?? false;
}

/**
 * Visszaadja a lehetséges következő státuszokat
 */
export function getNextStatuses(currentStatus: InvoiceStatus): InvoiceStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

/**
 * Validálja az átmenetet, hibát dob ha nem engedélyezett
 */
export function validateTransition(from: InvoiceStatus, to: InvoiceStatus): void {
  if (!canTransition(from, to)) {
    throw new InvoiceStatusError(from, to);
  }
}

/**
 * Végső (final) státusz-e
 */
export function isFinalStatus(status: InvoiceStatus): boolean {
  return getNextStatuses(status).length === 0;
}

/**
 * Sztornózható-e a számla ebben a státuszban
 */
export function canCancel(status: InvoiceStatus): boolean {
  return canTransition(status, 'CANCELLED');
}
