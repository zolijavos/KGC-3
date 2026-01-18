// Partner típusok

export type PartnerType = 'individual' | 'company';

export type PartnerStatus = 'active' | 'inactive' | 'blocked';

export type PartnerCategory =
  | 'retail' // Kiskereskedelmi vevő
  | 'wholesale' // Nagykereskedelmi vevő
  | 'rental' // Bérlő
  | 'service' // Szerviz ügyfél
  | 'supplier' // Beszállító
  | 'contractor'; // Alvállalkozó

export interface PartnerAddress {
  id: string;
  type: 'billing' | 'shipping' | 'other';
  isDefault: boolean;
  country: string;
  postalCode: string;
  city: string;
  street: string;
  building?: string;
}

export interface PartnerContact {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

export interface Partner {
  id: string;
  type: PartnerType;
  status: PartnerStatus;
  categories: PartnerCategory[];

  // Azonosítók
  code: string; // Belső partnerkód (P-0001)
  taxNumber?: string; // Adószám (cég esetén)
  euVatNumber?: string; // EU ÁFA szám
  registrationNumber?: string; // Cégjegyzékszám

  // Név
  name: string; // Cégnév vagy Teljes név
  shortName?: string; // Rövid név

  // Kapcsolat
  email?: string;
  phone?: string;
  website?: string;

  // Címek és kapcsolattartók
  addresses: PartnerAddress[];
  contacts: PartnerContact[];

  // Pénzügyi beállítások
  paymentTermDays: number; // Fizetési határidő (nap)
  creditLimit?: number; // Hitelkeret
  discountPercent?: number; // Alapkedvezmény %
  priceListId?: string; // Árlista ID

  // Bérlési beállítások
  rentalDepositPercent?: number; // Kaució %
  rentalBlocked: boolean; // Bérlés tiltva

  // Megjegyzések
  notes?: string;
  internalNotes?: string;

  // Statisztikák
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalRentals: number;
    totalServiceOrders: number;
    lastOrderDate?: string;
    lastRentalDate?: string;
    outstandingBalance: number;
  };

  // Meta
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PartnerListFilters {
  search: string;
  type: PartnerType | 'all';
  status: PartnerStatus | 'all';
  category: PartnerCategory | 'all';
}
