// Szerződés típusok

export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export type ContractType = 'rental' | 'service' | 'sales';

export interface ContractItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  dailyRate?: number;
  totalAmount: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  type: ContractType;
  status: ContractStatus;

  // Kapcsolatok
  rentalId?: string;
  rentalNumber?: string;
  partnerId: string;
  partnerName: string;
  partnerAddress?: string;
  partnerPhone?: string;
  partnerIdNumber?: string; // Személyi igazolvány szám

  // Dátumok
  createdAt: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  signedAt?: string;

  // Tételek
  items: ContractItem[];

  // Összegek
  totalAmount: number;
  depositAmount: number;
  depositPaid: boolean;

  // Egyéb
  terms?: string;
  notes?: string;
  createdBy: string;
  signedByPartner?: boolean;
  signedByStaff?: boolean;
}

export interface ContractListFilters {
  search: string;
  status: ContractStatus | 'all';
  type: ContractType | 'all';
}
