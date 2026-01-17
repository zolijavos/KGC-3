/**
 * VAT Calculator Service
 * Story 10-2: Számla Tétel Kezelés
 * @package @kgc/sales-invoice
 *
 * TDD Implementation - Pénzügyi számítás
 */

/**
 * Magyar ÁFA kulcsok
 */
export type VatRate =
  | 'RATE_27'
  | 'RATE_18'
  | 'RATE_5'
  | 'RATE_0'
  | 'AAM'
  | 'TAM'
  | 'EU'
  | 'EUK'
  | 'MAA';

/**
 * ÁFA kulcs -> százalék mapping
 */
const VAT_PERCENTAGES: Record<VatRate, number> = {
  RATE_27: 27,
  RATE_18: 18,
  RATE_5: 5,
  RATE_0: 0,
  AAM: 0, // Alanyi adómentes
  TAM: 0, // Tárgyi adómentes
  EU: 0, // EU értékesítés
  EUK: 0, // EU szolgáltatás
  MAA: 0, // Mentes az adó alól
};

/**
 * Ellenőrzi, hogy az adott string érvényes VatRate-e
 */
export function isValidVatRate(value: string): value is VatRate {
  return value in VAT_PERCENTAGES;
}

/**
 * ÁFA kulcs százalékának lekérése
 */
export function getVatPercentage(vatRate: VatRate): number {
  const percentage = VAT_PERCENTAGES[vatRate];

  if (percentage === undefined) {
    throw new Error(`Invalid VAT rate: ${vatRate}`);
  }

  return percentage;
}

/**
 * ÁFA összeg számítása nettó összegből
 * Bankers rounding (round half to even) a pontosságért
 */
export function calculateVatAmount(netAmount: number, vatRate: VatRate): number {
  const percentage = getVatPercentage(vatRate);
  const vatAmount = netAmount * (percentage / 100);

  return roundToHuf(vatAmount);
}

/**
 * Bruttó összeg számítása nettóból
 */
export function calculateGrossAmount(netAmount: number, vatRate: VatRate): number {
  const vatAmount = calculateVatAmount(netAmount, vatRate);
  return netAmount + vatAmount;
}

/**
 * Nettó összeg számítása bruttóból
 */
export function calculateNetFromGross(grossAmount: number, vatRate: VatRate): number {
  const percentage = getVatPercentage(vatRate);

  if (percentage === 0) {
    return grossAmount;
  }

  const netAmount = grossAmount / (1 + percentage / 100);
  return roundToHuf(netAmount);
}

/**
 * Kerekítés HUF-ra (Bankers rounding - round half to even)
 * Ez a pénzügyi szabvány a kerekítési hibák minimalizálására
 */
export function roundToHuf(amount: number): number {
  // Handle negative numbers correctly
  const sign = amount < 0 ? -1 : 1;
  const absAmount = Math.abs(amount);

  const intPart = Math.floor(absAmount);
  const decimalPart = absAmount - intPart;

  // Use small epsilon for floating point comparison
  const EPSILON = 1e-9;

  // Check if exactly .5 (within floating point tolerance)
  if (Math.abs(decimalPart - 0.5) < EPSILON) {
    // Bankers rounding: round to nearest even
    const result = intPart % 2 === 0 ? intPart : intPart + 1;
    return sign * result;
  }

  // Standard rounding for non-.5 cases
  return sign * Math.round(absAmount);
}
