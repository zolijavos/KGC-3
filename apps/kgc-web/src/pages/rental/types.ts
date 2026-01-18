// Rental Wizard Types - Based on @kgc/rental-core interfaces

export interface Partner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  taxNumber?: string;
  address?: string;
  isVip: boolean;
  creditLimit: number;
  balance: number;
}

export interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  depositAmount: number;
  imageUrl?: string;
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  IN_SERVICE = 'IN_SERVICE',
  RESERVED = 'RESERVED',
}

export enum EquipmentCategory {
  POWER_TOOL = 'POWER_TOOL',
  GARDEN = 'GARDEN',
  CONSTRUCTION = 'CONSTRUCTION',
  CLEANING = 'CLEANING',
}

export enum EquipmentCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
}

export enum PricingTier {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface RentalPricing {
  tier: PricingTier;
  durationDays: number;
  dailyRate: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  depositAmount: number;
}

export interface WizardState {
  step: number;
  partner: Partner | null;
  equipment: Equipment | null;
  startDate: Date | null;
  endDate: Date | null;
  pricing: RentalPricing | null;
  notes: string;
}

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  [EquipmentCategory.POWER_TOOL]: 'Elektromos szerszám',
  [EquipmentCategory.GARDEN]: 'Kerti gép',
  [EquipmentCategory.CONSTRUCTION]: 'Építőipari',
  [EquipmentCategory.CLEANING]: 'Takarítógép',
};

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.AVAILABLE]: 'Szabad',
  [EquipmentStatus.RENTED]: 'Kiadva',
  [EquipmentStatus.IN_SERVICE]: 'Szervizben',
  [EquipmentStatus.RESERVED]: 'Foglalt',
};

export const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  [EquipmentCondition.EXCELLENT]: 'Kiváló',
  [EquipmentCondition.GOOD]: 'Jó',
  [EquipmentCondition.FAIR]: 'Megfelelő',
};

// Rental (Active rental contract)
export enum RentalStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export interface Rental {
  id: string;
  contractNumber: string;
  partner: Partner;
  equipment: Equipment;
  startDate: string;
  endDate: string;
  actualReturnDate?: string;
  status: RentalStatus;
  pricing: RentalPricing;
  depositPaid: number;
  rentalPaid: number;
  lateFee: number;
  damageCharge: number;
  returnNotes?: string;
  returnCondition?: EquipmentCondition;
  createdAt: string;
  createdBy: string;
}

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  [RentalStatus.ACTIVE]: 'Aktív',
  [RentalStatus.OVERDUE]: 'Lejárt',
  [RentalStatus.RETURNED]: 'Visszavéve',
  [RentalStatus.CANCELLED]: 'Lemondva',
};
