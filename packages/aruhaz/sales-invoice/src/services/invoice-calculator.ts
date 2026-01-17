/**
 * Invoice Calculator Service
 * Story 10-2: Számla Tétel Kezelés
 * @package @kgc/sales-invoice
 *
 * TDD Implementation - Összeg számítások
 */

import { calculateVatAmount, VatRate, isValidVatRate } from './vat-calculator';

/**
 * Kedvezmény típus
 */
export interface Discount {
  type: 'percent' | 'fixed';
  value: number;
}

/**
 * Számla tétel input
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: VatRate | string;
  discount?: Discount;
}

/**
 * Számított tétel összegek
 */
export interface ItemAmounts {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

/**
 * ÁFA bontás
 */
export interface VatBreakdownEntry {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

/**
 * Számla összesítők
 */
export interface InvoiceTotals {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatBreakdown?: Record<string, VatBreakdownEntry>;
}

/**
 * Tétel összeg számítása
 */
export function calculateItemAmount(input: {
  quantity: number;
  unitPriceNet: number;
  vatRate: VatRate | string;
  discount?: Discount;
}): ItemAmounts {
  // Validate vatRate
  const vatRateStr = input.vatRate;
  if (!isValidVatRate(vatRateStr)) {
    throw new Error(`Invalid VAT rate: ${vatRateStr}`);
  }

  let netAmount = input.quantity * input.unitPriceNet;

  // Kedvezmény alkalmazása
  if (input.discount) {
    netAmount = applyDiscount(netAmount, input.discount);
  }

  const vatAmount = calculateVatAmount(netAmount, vatRateStr);
  const grossAmount = netAmount + vatAmount;

  return {
    netAmount,
    vatAmount,
    grossAmount,
  };
}

/**
 * Kedvezmény alkalmazása
 */
export function applyDiscount(amount: number, discount: Discount): number {
  if (discount.value < 0) {
    throw new Error('Discount cannot be negative');
  }

  if (discount.type === 'percent') {
    if (discount.value > 100) {
      throw new Error('Discount cannot exceed 100%');
    }
    const discountAmount = amount * (discount.value / 100);
    return Math.max(0, amount - discountAmount);
  }

  // Fixed discount
  return Math.max(0, amount - discount.value);
}

/**
 * Számla összesítők számítása
 */
export function calculateInvoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  if (items.length === 0) {
    return {
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
    };
  }

  const vatBreakdown: Record<string, VatBreakdownEntry> = {};
  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  for (const item of items) {
    const itemInput: {
      quantity: number;
      unitPriceNet: number;
      vatRate: VatRate | string;
      discount?: Discount;
    } = {
      quantity: item.quantity,
      unitPriceNet: item.unitPriceNet,
      vatRate: item.vatRate,
    };
    if (item.discount !== undefined) {
      itemInput.discount = item.discount;
    }
    const amounts = calculateItemAmount(itemInput);

    totalNet += amounts.netAmount;
    totalVat += amounts.vatAmount;
    totalGross += amounts.grossAmount;

    // ÁFA bontás
    const vatKey = String(item.vatRate);
    const existingEntry = vatBreakdown[vatKey];
    if (existingEntry) {
      existingEntry.netAmount += amounts.netAmount;
      existingEntry.vatAmount += amounts.vatAmount;
      existingEntry.grossAmount += amounts.grossAmount;
    } else {
      vatBreakdown[vatKey] = {
        netAmount: amounts.netAmount,
        vatAmount: amounts.vatAmount,
        grossAmount: amounts.grossAmount,
      };
    }
  }

  return {
    netAmount: totalNet,
    vatAmount: totalVat,
    grossAmount: totalGross,
    vatBreakdown,
  };
}
