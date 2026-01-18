// Árajánlat típusok

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuotationItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceNet: number;
  vatRate: number;
  totalNet: number;
  totalGross: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;

  // Kapcsolatok
  worksheetId?: string;
  worksheetNumber?: string;
  partnerId: string;
  partnerName: string;
  partnerEmail?: string;
  partnerPhone?: string;

  // Dátumok
  createdAt: string;
  sentAt?: string;
  validUntil: string;
  respondedAt?: string;

  // Tételek
  items: QuotationItem[];

  // Összegek
  subtotalNet: number;
  vatAmount: number;
  totalGross: number;

  // Egyéb
  notes?: string;
  internalNotes?: string;
  createdBy: string;
}

export interface QuotationListFilters {
  search: string;
  status: QuotationStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
}
