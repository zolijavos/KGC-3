// Mock data for Rental Wizard
import type { Equipment, Partner, Rental } from './types';
import {
  EquipmentCategory,
  EquipmentCondition,
  EquipmentStatus,
  PricingTier,
  RentalStatus,
} from './types';

export const MOCK_PARTNERS: Partner[] = [
  {
    id: '1',
    name: 'Kovács János',
    email: 'kovacs.janos@email.hu',
    phone: '+36 30 123 4567',
    type: 'INDIVIDUAL',
    address: '1111 Budapest, Fő utca 1.',
    isVip: false,
    creditLimit: 0,
    balance: 0,
  },
  {
    id: '2',
    name: 'Nagy Építő Kft.',
    email: 'info@nagyepito.hu',
    phone: '+36 1 234 5678',
    type: 'COMPANY',
    taxNumber: '12345678-2-42',
    address: '2000 Szentendre, Ipari park 5.',
    isVip: true,
    creditLimit: 500000,
    balance: -125000,
  },
  {
    id: '3',
    name: 'Szabó Péter',
    email: 'szabo.peter@gmail.com',
    phone: '+36 70 987 6543',
    type: 'INDIVIDUAL',
    address: '3000 Hatvan, Kossuth tér 10.',
    isVip: false,
    creditLimit: 0,
    balance: 0,
  },
  {
    id: '4',
    name: 'Horváth és Társa Bt.',
    email: 'horvath.bt@company.hu',
    phone: '+36 20 111 2222',
    type: 'COMPANY',
    taxNumber: '87654321-2-13',
    address: '1052 Budapest, Váci utca 12.',
    isVip: true,
    creditLimit: 1000000,
    balance: 0,
  },
  {
    id: '5',
    name: 'Tóth Mária',
    email: 'toth.maria@freemail.hu',
    phone: '+36 30 555 6666',
    type: 'INDIVIDUAL',
    address: '4031 Debrecen, Petőfi utca 8.',
    isVip: false,
    creditLimit: 0,
    balance: 15000,
  },
];

export const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: 'eq1',
    name: 'Makita akkus fúrócsavarozó DDF484',
    serialNumber: 'MAK-2024-001',
    category: EquipmentCategory.POWER_TOOL,
    brand: 'Makita',
    model: 'DDF484',
    status: EquipmentStatus.AVAILABLE,
    condition: EquipmentCondition.EXCELLENT,
    dailyRate: 3500,
    weeklyRate: 18000,
    monthlyRate: 55000,
    depositAmount: 50000,
    imageUrl: '/equipment/drill.jpg',
  },
  {
    id: 'eq2',
    name: 'Bosch sarokcsiszoló GWS 22-230',
    serialNumber: 'BOS-2024-015',
    category: EquipmentCategory.POWER_TOOL,
    brand: 'Bosch',
    model: 'GWS 22-230',
    status: EquipmentStatus.AVAILABLE,
    condition: EquipmentCondition.GOOD,
    dailyRate: 4500,
    weeklyRate: 25000,
    monthlyRate: 75000,
    depositAmount: 60000,
  },
  {
    id: 'eq3',
    name: 'Stihl benzinmotoros fűkasza FS 131',
    serialNumber: 'STI-2023-042',
    category: EquipmentCategory.GARDEN,
    brand: 'Stihl',
    model: 'FS 131',
    status: EquipmentStatus.AVAILABLE,
    condition: EquipmentCondition.GOOD,
    dailyRate: 6000,
    weeklyRate: 35000,
    monthlyRate: 100000,
    depositAmount: 80000,
  },
  {
    id: 'eq4',
    name: 'Husqvarna robotfűnyíró Automower 305',
    serialNumber: 'HUS-2024-003',
    category: EquipmentCategory.GARDEN,
    brand: 'Husqvarna',
    model: 'Automower 305',
    status: EquipmentStatus.RENTED,
    condition: EquipmentCondition.EXCELLENT,
    dailyRate: 8000,
    weeklyRate: 45000,
    monthlyRate: 130000,
    depositAmount: 150000,
  },
  {
    id: 'eq5',
    name: 'Kärcher magasnyomású mosó K5 Premium',
    serialNumber: 'KAR-2024-008',
    category: EquipmentCategory.CLEANING,
    brand: 'Kärcher',
    model: 'K5 Premium',
    status: EquipmentStatus.AVAILABLE,
    condition: EquipmentCondition.EXCELLENT,
    dailyRate: 5000,
    weeklyRate: 28000,
    monthlyRate: 85000,
    depositAmount: 70000,
  },
  {
    id: 'eq6',
    name: 'Wacker Neuson betonkeverő',
    serialNumber: 'WAC-2023-021',
    category: EquipmentCategory.CONSTRUCTION,
    brand: 'Wacker Neuson',
    model: 'HM 180',
    status: EquipmentStatus.IN_SERVICE,
    condition: EquipmentCondition.FAIR,
    dailyRate: 12000,
    weeklyRate: 65000,
    monthlyRate: 180000,
    depositAmount: 100000,
  },
  {
    id: 'eq7',
    name: 'DeWalt körfűrész DWE576K',
    serialNumber: 'DEW-2024-033',
    category: EquipmentCategory.POWER_TOOL,
    brand: 'DeWalt',
    model: 'DWE576K',
    status: EquipmentStatus.AVAILABLE,
    condition: EquipmentCondition.GOOD,
    dailyRate: 5500,
    weeklyRate: 30000,
    monthlyRate: 90000,
    depositAmount: 65000,
  },
  {
    id: 'eq8',
    name: 'Hilti fúrókalapács TE 30-A36',
    serialNumber: 'HIL-2024-007',
    category: EquipmentCategory.CONSTRUCTION,
    brand: 'Hilti',
    model: 'TE 30-A36',
    status: EquipmentStatus.AVAILABLE,
    condition: EquipmentCondition.EXCELLENT,
    dailyRate: 9000,
    weeklyRate: 50000,
    monthlyRate: 150000,
    depositAmount: 120000,
  },
];

// Utility function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Calculate pricing based on dates
export function calculatePricing(
  equipment: Equipment,
  startDate: Date,
  endDate: Date
): {
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
} {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  let tier: PricingTier;
  let grossAmount: number;

  if (durationDays >= 30) {
    tier = PricingTier.MONTHLY;
    const months = Math.floor(durationDays / 30);
    const remainingDays = durationDays % 30;
    grossAmount = months * equipment.monthlyRate + remainingDays * equipment.dailyRate;
  } else if (durationDays >= 7) {
    tier = PricingTier.WEEKLY;
    const weeks = Math.floor(durationDays / 7);
    const remainingDays = durationDays % 7;
    grossAmount = weeks * equipment.weeklyRate + remainingDays * equipment.dailyRate;
  } else {
    tier = PricingTier.DAILY;
    grossAmount = durationDays * equipment.dailyRate;
  }

  const discountAmount = 0; // No discounts for now
  const netAmount = grossAmount - discountAmount;
  const vatRate = 0.27;
  const vatAmount = Math.round(netAmount * vatRate);
  const totalAmount = netAmount + vatAmount;

  return {
    tier,
    durationDays,
    dailyRate: equipment.dailyRate,
    grossAmount,
    discountAmount,
    netAmount,
    vatRate,
    vatAmount,
    totalAmount,
    depositAmount: equipment.depositAmount,
  };
}

// Active rentals for return processing
export const MOCK_ACTIVE_RENTALS: Rental[] = [
  {
    id: 'r-001',
    contractNumber: 'BER-2026-0001',
    partner: MOCK_PARTNERS[1]!, // Nagy Építő Kft.
    equipment: { ...MOCK_EQUIPMENT[3]!, status: EquipmentStatus.RENTED }, // Husqvarna
    startDate: '2026-01-10',
    endDate: '2026-01-20',
    status: RentalStatus.ACTIVE,
    pricing: {
      tier: PricingTier.WEEKLY,
      durationDays: 11,
      dailyRate: 8000,
      grossAmount: 77000,
      discountAmount: 0,
      netAmount: 77000,
      vatRate: 0.27,
      vatAmount: 20790,
      totalAmount: 97790,
      depositAmount: 150000,
    },
    depositPaid: 150000,
    rentalPaid: 97790,
    lateFee: 0,
    damageCharge: 0,
    createdAt: '2026-01-10T09:30:00Z',
    createdBy: 'Nagy Éva',
  },
  {
    id: 'r-002',
    contractNumber: 'BER-2026-0002',
    partner: MOCK_PARTNERS[0]!, // Kovács János
    equipment: { ...MOCK_EQUIPMENT[0]!, status: EquipmentStatus.RENTED }, // Makita fúró
    startDate: '2026-01-15',
    endDate: '2026-01-17',
    status: RentalStatus.ACTIVE,
    pricing: {
      tier: PricingTier.DAILY,
      durationDays: 3,
      dailyRate: 3500,
      grossAmount: 10500,
      discountAmount: 0,
      netAmount: 10500,
      vatRate: 0.27,
      vatAmount: 2835,
      totalAmount: 13335,
      depositAmount: 50000,
    },
    depositPaid: 50000,
    rentalPaid: 13335,
    lateFee: 0,
    damageCharge: 0,
    createdAt: '2026-01-15T14:00:00Z',
    createdBy: 'Kovács János',
  },
  {
    id: 'r-003',
    contractNumber: 'BER-2026-0003',
    partner: MOCK_PARTNERS[3]!, // Horváth és Társa Bt.
    equipment: { ...MOCK_EQUIPMENT[7]!, status: EquipmentStatus.RENTED }, // Hilti fúrókalapács
    startDate: '2026-01-05',
    endDate: '2026-01-15',
    status: RentalStatus.OVERDUE, // Lejárt!
    pricing: {
      tier: PricingTier.WEEKLY,
      durationDays: 11,
      dailyRate: 9000,
      grossAmount: 86000,
      discountAmount: 0,
      netAmount: 86000,
      vatRate: 0.27,
      vatAmount: 23220,
      totalAmount: 109220,
      depositAmount: 120000,
    },
    depositPaid: 120000,
    rentalPaid: 109220,
    lateFee: 27000, // 3 nap késés × 9000 Ft/nap
    damageCharge: 0,
    createdAt: '2026-01-05T10:00:00Z',
    createdBy: 'Szabó Péter',
  },
  {
    id: 'r-004',
    contractNumber: 'BER-2026-0004',
    partner: MOCK_PARTNERS[2]!, // Szabó Péter
    equipment: { ...MOCK_EQUIPMENT[4]!, status: EquipmentStatus.RENTED }, // Kärcher
    startDate: '2026-01-16',
    endDate: '2026-01-18',
    status: RentalStatus.ACTIVE,
    pricing: {
      tier: PricingTier.DAILY,
      durationDays: 3,
      dailyRate: 5000,
      grossAmount: 15000,
      discountAmount: 0,
      netAmount: 15000,
      vatRate: 0.27,
      vatAmount: 4050,
      totalAmount: 19050,
      depositAmount: 70000,
    },
    depositPaid: 70000,
    rentalPaid: 19050,
    lateFee: 0,
    damageCharge: 0,
    createdAt: '2026-01-16T08:30:00Z',
    createdBy: 'Nagy Éva',
  },
];
