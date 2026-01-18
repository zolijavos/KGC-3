// Worksheet Wizard Types - Based on @kgc/service-worksheet interfaces

// Re-use Partner from rental
export type { Partner } from '../rental/types';

/**
 * Munkalap státuszok
 */
export enum WorksheetStatus {
  FELVEVE = 'FELVEVE',
  FOLYAMATBAN = 'FOLYAMATBAN',
  VARHATO = 'VARHATO',
  KESZ = 'KESZ',
  SZAMLAZANDO = 'SZAMLAZANDO',
  LEZART = 'LEZART',
  TOROLVE = 'TOROLVE',
}

/**
 * Munkalap típusok
 */
export enum WorksheetType {
  FIZETOS = 'FIZETOS',
  GARANCIALIS = 'GARANCIALIS',
  BERLESI = 'BERLESI',
  KARBANTARTAS = 'KARBANTARTAS',
}

/**
 * Prioritások
 */
export enum WorksheetPriority {
  SURGOS = 'SURGOS',
  NORMAL = 'NORMAL',
  GARANCIALIS = 'GARANCIALIS',
}

/**
 * Termék/Gép a szervizhez
 */
export interface Product {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  category: ProductCategory;
  warrantyExpiry?: Date;
  purchaseDate?: Date;
}

export enum ProductCategory {
  POWER_TOOL = 'POWER_TOOL',
  GARDEN = 'GARDEN',
  CONSTRUCTION = 'CONSTRUCTION',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER',
}

/**
 * Alkatrész
 */
export interface Part {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  inStock: number;
  category: string;
}

/**
 * Munkadíj norma (Makita style)
 */
export interface LaborNorm {
  id: string;
  code: string;
  description: string;
  minutes: number;
  hourlyRate: number;
  calculatedPrice: number;
}

/**
 * Munkalap tétel (alkatrész vagy munkadíj)
 */
export interface WorksheetItem {
  id: string;
  type: 'ALKATRESZ' | 'MUNKADIJ' | 'EGYEB';
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  grossAmount: number;
  partId?: string;
  normId?: string;
}

/**
 * Wizard állapot
 */
export interface WorksheetWizardState {
  step: number;
  // Partner
  partnerId: string | null;
  partnerName: string;
  // Gép
  product: Product | null;
  deviceName: string;
  serialNumber: string;
  // Probléma
  worksheetType: WorksheetType;
  priority: WorksheetPriority;
  faultDescription: string;
  costLimit: number | null;
  // Diagnosztika
  diagnosis: string;
  workPerformed: string;
  items: WorksheetItem[];
  // Összesítés
  estimatedCompletionDate: Date | null;
  internalNote: string;
}

// Labels
export const STATUS_LABELS: Record<WorksheetStatus, string> = {
  [WorksheetStatus.FELVEVE]: 'Felvéve',
  [WorksheetStatus.FOLYAMATBAN]: 'Folyamatban',
  [WorksheetStatus.VARHATO]: 'Várakozó',
  [WorksheetStatus.KESZ]: 'Kész',
  [WorksheetStatus.SZAMLAZANDO]: 'Számlázandó',
  [WorksheetStatus.LEZART]: 'Lezárt',
  [WorksheetStatus.TOROLVE]: 'Törölve',
};

export const TYPE_LABELS: Record<WorksheetType, string> = {
  [WorksheetType.FIZETOS]: 'Fizetős javítás',
  [WorksheetType.GARANCIALIS]: 'Garanciális',
  [WorksheetType.BERLESI]: 'Bérlési szerviz',
  [WorksheetType.KARBANTARTAS]: 'Karbantartás',
};

export const PRIORITY_LABELS: Record<WorksheetPriority, string> = {
  [WorksheetPriority.SURGOS]: 'Sürgős (+20%)',
  [WorksheetPriority.NORMAL]: 'Normál',
  [WorksheetPriority.GARANCIALIS]: 'Garanciális',
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.POWER_TOOL]: 'Elektromos szerszám',
  [ProductCategory.GARDEN]: 'Kerti gép',
  [ProductCategory.CONSTRUCTION]: 'Építőipari',
  [ProductCategory.CLEANING]: 'Takarítógép',
  [ProductCategory.OTHER]: 'Egyéb',
};

/**
 * Teljes munkalap rekord (wizard state-ből generált)
 */
export interface Worksheet {
  id: string;
  worksheetNumber: string;
  // Partner
  partnerId: string;
  partnerName: string;
  partnerPhone?: string;
  partnerEmail?: string;
  // Gép/Termék
  product: Product;
  // Munka részletek
  worksheetType: WorksheetType;
  priority: WorksheetPriority;
  status: WorksheetStatus;
  faultDescription: string;
  diagnosis: string;
  workPerformed: string;
  // Tételek
  items: WorksheetItem[];
  // Pénzügyi
  costLimit: number | null;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  depositPaid: number;
  // Dátumok
  createdAt: string;
  updatedAt: string;
  estimatedCompletionDate: string | null;
  completedAt: string | null;
  invoicedAt: string | null;
  // Személyek
  createdBy: string;
  assignedTo: string | null;
  // Megjegyzések
  internalNote: string;
  customerNote: string;
  // Történet
  history: WorksheetHistoryEntry[];
}

/**
 * Munkalap történet bejegyzés
 */
export interface WorksheetHistoryEntry {
  id: string;
  timestamp: string;
  action: WorksheetHistoryAction;
  description: string;
  userId: string;
  userName: string;
  oldValue?: string;
  newValue?: string;
}

export enum WorksheetHistoryAction {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_REMOVED = 'ITEM_REMOVED',
  ASSIGNED = 'ASSIGNED',
  NOTE_ADDED = 'NOTE_ADDED',
  INVOICED = 'INVOICED',
  COMPLETED = 'COMPLETED',
}

export const HISTORY_ACTION_LABELS: Record<WorksheetHistoryAction, string> = {
  [WorksheetHistoryAction.CREATED]: 'Létrehozva',
  [WorksheetHistoryAction.STATUS_CHANGED]: 'Státusz változás',
  [WorksheetHistoryAction.ITEM_ADDED]: 'Tétel hozzáadva',
  [WorksheetHistoryAction.ITEM_REMOVED]: 'Tétel törölve',
  [WorksheetHistoryAction.ASSIGNED]: 'Hozzárendelve',
  [WorksheetHistoryAction.NOTE_ADDED]: 'Megjegyzés',
  [WorksheetHistoryAction.INVOICED]: 'Számlázva',
  [WorksheetHistoryAction.COMPLETED]: 'Befejezve',
};
