/**
 * Invoice Interfaces
 * Internal invoice representation for NAV integration
 * @package @kgc/nav-online
 */

import type { PaymentMethodCode, VatRate } from './szamlazz-hu.interface';

/**
 * Számla státusz
 */
export enum InvoiceStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SUCCESS = 'SUCCESS',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_PERMANENT = 'FAILED_PERMANENT',
  MANUAL_REQUIRED = 'MANUAL_REQUIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Számla típus
 */
export enum InvoiceType {
  CUSTOMER = 'CUSTOMER',
  PROFORMA = 'PROFORMA',
  CORRECTION = 'CORRECTION',
  STORNO = 'STORNO',
}

/**
 * Partner adat a számlához
 */
export interface InvoicePartner {
  /** Partner ID */
  id: string;
  /** Partner neve */
  name: string;
  /** Irányítószám */
  zipCode: string;
  /** Város */
  city: string;
  /** Cím */
  address: string;
  /** Adószám (opcionális) */
  taxNumber?: string;
  /** EU adószám */
  euTaxNumber?: string;
  /** Email */
  email?: string;
  /** Telefon */
  phone?: string;
  /** Céges-e */
  isCompany: boolean;
}

/**
 * Számla tétel
 */
export interface InvoiceItem {
  /** Tétel ID */
  id?: string;
  /** Megnevezés */
  name: string;
  /** Mennyiség */
  quantity: number;
  /** Mennyiségi egység */
  unit: string;
  /** Nettó egységár */
  unitPriceNet: number;
  /** ÁFA kulcs */
  vatRate: VatRate;
  /** Nettó összeg */
  netAmount: number;
  /** ÁFA összeg */
  vatAmount: number;
  /** Bruttó összeg */
  grossAmount: number;
  /** Kapcsolódó cikk ID */
  productId?: string;
}

/**
 * Belső számla reprezentáció
 */
export interface Invoice {
  /** Számla ID (belső) */
  id?: string;
  /** Tenant ID */
  tenantId: string;
  /** Belső számlaszám */
  internalNumber: string;
  /** Külső számlaszám (Számlázz.hu) */
  externalNumber?: string;
  /** NAV referencia */
  navReference?: string;

  /** Számla típus */
  type: InvoiceType;
  /** Státusz */
  status: InvoiceStatus;

  /** Partner adatok */
  partner: InvoicePartner;

  /** Kapcsolódó bérlés ID */
  rentalId?: string;
  /** Kapcsolódó munkalap ID */
  serviceOrderId?: string;

  /** Számla dátumok */
  invoiceDate: Date;
  /** Teljesítés dátuma */
  fulfillmentDate: Date;
  /** Fizetési határidő */
  dueDate: Date;

  /** Fizetési mód */
  paymentMethod: PaymentMethodCode;
  /** MyPos tranzakció ID */
  paymentTransactionId?: string;

  /** Összegek */
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;

  /** Tételek */
  items: InvoiceItem[];

  /** Megjegyzés */
  notes?: string;

  /** PDF URL */
  pdfUrl?: string;

  /** Hivatkozott számla (sztornó/helyesbítő esetén) */
  referencedInvoiceId?: string;
  referencedInvoiceNumber?: string;

  /** Audit */
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
}

/**
 * Számla létrehozási kérés
 */
export interface CreateInvoiceRequest {
  /** Tenant ID */
  tenantId: string;
  /** Partner ID */
  partnerId: string;
  /** Számla típus */
  type?: InvoiceType;

  /** Kapcsolódó entitások */
  rentalId?: string;
  serviceOrderId?: string;

  /** Dátumok */
  invoiceDate?: Date;
  fulfillmentDate?: Date;
  dueDate?: Date;

  /** Fizetés */
  paymentMethod: PaymentMethodCode;
  paymentTransactionId?: string;

  /** Tételek */
  items: Omit<InvoiceItem, 'id'>[];

  /** Megjegyzés */
  notes?: string;

  /** Létrehozó user */
  createdBy: string;
}

/**
 * Számla eredmény
 */
export interface InvoiceResult {
  /** Sikeres-e */
  success: boolean;
  /** Számla (siker esetén) */
  invoice?: Invoice;
  /** Hiba (hiba esetén) */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * NAV beküldés eredmény
 */
export interface NavSubmissionResult {
  /** Sikeres-e */
  success: boolean;
  /** NAV tranzakció ID */
  transactionId?: string;
  /** NAV státusz */
  navStatus?: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  /** Hiba */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
