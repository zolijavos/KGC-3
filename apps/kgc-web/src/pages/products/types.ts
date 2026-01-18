// Cikk/Termék típusok

export type ProductStatus = 'active' | 'inactive' | 'discontinued';

export type ProductCategory =
  | 'power_tool' // Elektromos szerszám
  | 'hand_tool' // Kéziszerszám
  | 'accessory' // Tartozék
  | 'consumable' // Fogyóeszköz
  | 'spare_part' // Alkatrész
  | 'rental_equipment'; // Bérgép

export type VatRate = 27 | 18 | 5 | 0;

export interface ProductSupplier {
  id: string;
  name: string;
  code: string;
}

export interface Product {
  id: string;
  status: ProductStatus;
  category: ProductCategory;

  // Azonosítók
  sku: string; // Cikkszám (belső)
  barcode?: string; // Vonalkód (EAN)
  manufacturerCode?: string; // Gyártói cikkszám

  // Alapadatok
  name: string;
  shortName?: string;
  description?: string;
  brand?: string;
  model?: string;

  // Árazás
  purchasePrice: number; // Beszerzési ár (nettó)
  sellingPriceNet: number; // Eladási ár (nettó)
  sellingPriceGross: number; // Eladási ár (bruttó)
  vatRate: VatRate;
  marginPercent: number; // Árrés %

  // Készlet
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel: number;
  reorderQuantity: number;
  location?: string; // K-P-D helykód

  // Beszállító
  supplier?: ProductSupplier;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;

  // Képek
  imageUrl?: string;
  thumbnailUrl?: string;

  // Bérlési beállítások (ha rental_equipment)
  rentalDailyRate?: number;
  rentalWeeklyRate?: number;
  rentalMonthlyRate?: number;
  rentalDepositAmount?: number;

  // Meta
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProductListFilters {
  search: string;
  status: ProductStatus | 'all';
  category: ProductCategory | 'all';
  supplierId: string | 'all';
  lowStock: boolean;
}
