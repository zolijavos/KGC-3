// Számla típusok

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';

export type InvoiceType = 'normal' | 'proforma' | 'correction' | 'cancellation';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mypos';

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number; // 27, 18, 5, 0
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;

  // Kapcsolatok
  partnerId: string;
  partnerName: string;
  partnerAddress: string;
  partnerTaxNumber?: string;
  contractId?: string;
  contractNumber?: string;
  rentalId?: string;
  rentalNumber?: string;
  worksheetId?: string;
  worksheetNumber?: string;

  // Dátumok
  createdAt: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  cancelledAt?: string;

  // Tételek
  items: InvoiceItem[];

  // Összegek
  netTotal: number;
  vatTotal: number;
  grossTotal: number;

  // Fizetés
  paymentMethod: PaymentMethod;
  paidAmount: number;
  remainingAmount: number;

  // NAV
  navStatus?: 'pending' | 'sent' | 'accepted' | 'rejected';
  navTransactionId?: string;

  // Egyéb
  notes?: string;
  createdBy: string;
  correctionOf?: string; // Eredeti számla ID helyesbítésnél
}

export interface InvoiceListFilters {
  search: string;
  status: InvoiceStatus | 'all';
  type: InvoiceType | 'all';
  dateFrom?: string;
  dateTo?: string;
}
