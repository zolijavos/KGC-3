// Worksheet Wizard Store - Zustand state management
import { create } from 'zustand';
import type { Partner } from '../rental/types';
import { calculateItemTotal, calculateLaborPrice } from './mock-data';
import type { LaborNorm, Part, Product, WorksheetItem } from './types';
import { WorksheetPriority, WorksheetType } from './types';

interface WorksheetWizardState {
  // Navigation
  step: number;

  // Step 1: Partner
  partner: Partner | null;

  // Step 2: Product
  product: Product | null;
  deviceName: string;
  serialNumber: string;

  // Step 3: Problem
  worksheetType: WorksheetType;
  priority: WorksheetPriority;
  faultDescription: string;
  costLimit: number | null;

  // Step 4: Diagnostics & Items
  diagnosis: string;
  workPerformed: string;
  items: WorksheetItem[];

  // Step 5: Summary
  estimatedCompletionDate: Date | null;
  internalNote: string;

  // Computed
  totals: {
    netTotal: number;
    vatTotal: number;
    grossTotal: number;
    partsCount: number;
    laborCount: number;
  };

  // Actions
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;

  setPartner: (partner: Partner | null) => void;
  setProduct: (product: Product | null) => void;
  setDeviceInfo: (name: string, serial: string) => void;

  setProblemInfo: (
    type: WorksheetType,
    priority: WorksheetPriority,
    description: string,
    costLimit: number | null
  ) => void;

  setDiagnostics: (diagnosis: string, workPerformed: string) => void;
  addPart: (part: Part, quantity: number) => void;
  addLabor: (norm: LaborNorm, quantity: number) => void;
  addCustomItem: (description: string, unitPrice: number, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;

  setSummaryInfo: (completionDate: Date | null, note: string) => void;

  canProceed: () => boolean;
  reset: () => void;
}

const initialState = {
  step: 0,
  partner: null,
  product: null,
  deviceName: '',
  serialNumber: '',
  worksheetType: WorksheetType.FIZETOS,
  priority: WorksheetPriority.NORMAL,
  faultDescription: '',
  costLimit: null,
  diagnosis: '',
  workPerformed: '',
  items: [] as WorksheetItem[],
  estimatedCompletionDate: null,
  internalNote: '',
  totals: {
    netTotal: 0,
    vatTotal: 0,
    grossTotal: 0,
    partsCount: 0,
    laborCount: 0,
  },
};

function calculateTotals(items: WorksheetItem[]) {
  const netTotal = items.reduce((sum, item) => sum + item.netAmount, 0);
  const grossTotal = items.reduce((sum, item) => sum + item.grossAmount, 0);
  const vatTotal = grossTotal - netTotal;
  const partsCount = items.filter(i => i.type === 'ALKATRESZ').length;
  const laborCount = items.filter(i => i.type === 'MUNKADIJ').length;

  return { netTotal, vatTotal, grossTotal, partsCount, laborCount };
}

export const useWorksheetWizardStore = create<WorksheetWizardState>((set, get) => ({
  ...initialState,

  // Navigation
  nextStep: () => set(state => ({ step: Math.min(state.step + 1, 4) })),
  prevStep: () => set(state => ({ step: Math.max(state.step - 1, 0) })),
  goToStep: step => set({ step: Math.max(0, Math.min(step, 4)) }),

  // Partner
  setPartner: partner => set({ partner }),

  // Product
  setProduct: product =>
    set({
      product,
      deviceName: product?.name ?? '',
      serialNumber: product?.serialNumber ?? '',
    }),
  setDeviceInfo: (deviceName, serialNumber) => set({ deviceName, serialNumber }),

  // Problem
  setProblemInfo: (worksheetType, priority, faultDescription, costLimit) =>
    set({
      worksheetType,
      priority,
      faultDescription,
      costLimit,
    }),

  // Diagnostics
  setDiagnostics: (diagnosis, workPerformed) => set({ diagnosis, workPerformed }),

  addPart: (part, quantity) =>
    set(state => {
      const { netAmount, grossAmount } = calculateItemTotal(part.unitPrice, quantity);
      const newItem: WorksheetItem = {
        id: `part-${Date.now()}`,
        type: 'ALKATRESZ',
        description: part.name,
        quantity,
        unitPrice: part.unitPrice,
        vatRate: 27,
        netAmount,
        grossAmount,
        partId: part.id,
      };
      const items = [...state.items, newItem];
      return { items, totals: calculateTotals(items) };
    }),

  addLabor: (norm, quantity) =>
    set(state => {
      const laborPrice = calculateLaborPrice(norm, quantity);
      const { netAmount, grossAmount } = calculateItemTotal(laborPrice, 1);
      const newItem: WorksheetItem = {
        id: `labor-${Date.now()}`,
        type: 'MUNKADIJ',
        description: `${norm.code} - ${norm.description} (${norm.minutes} perc)`,
        quantity,
        unitPrice: laborPrice,
        vatRate: 27,
        netAmount,
        grossAmount,
        normId: norm.id,
      };
      const items = [...state.items, newItem];
      return { items, totals: calculateTotals(items) };
    }),

  addCustomItem: (description, unitPrice, quantity) =>
    set(state => {
      const { netAmount, grossAmount } = calculateItemTotal(unitPrice, quantity);
      const newItem: WorksheetItem = {
        id: `custom-${Date.now()}`,
        type: 'EGYEB',
        description,
        quantity,
        unitPrice,
        vatRate: 27,
        netAmount,
        grossAmount,
      };
      const items = [...state.items, newItem];
      return { items, totals: calculateTotals(items) };
    }),

  removeItem: itemId =>
    set(state => {
      const items = state.items.filter(i => i.id !== itemId);
      return { items, totals: calculateTotals(items) };
    }),

  updateItemQuantity: (itemId, quantity) =>
    set(state => {
      const items = state.items.map(item => {
        if (item.id !== itemId) return item;
        const { netAmount, grossAmount } = calculateItemTotal(item.unitPrice, quantity);
        return { ...item, quantity, netAmount, grossAmount };
      });
      return { items, totals: calculateTotals(items) };
    }),

  // Summary
  setSummaryInfo: (estimatedCompletionDate, internalNote) =>
    set({
      estimatedCompletionDate,
      internalNote,
    }),

  // Validation
  canProceed: () => {
    const state = get();
    switch (state.step) {
      case 0: // Partner
        return state.partner !== null;
      case 1: // Product
        return state.deviceName.trim().length > 0;
      case 2: // Problem
        return state.faultDescription.trim().length > 0;
      case 3: // Diagnostics
        return state.diagnosis.trim().length > 0;
      case 4: // Summary
        return true;
      default:
        return false;
    }
  },

  reset: () => set(initialState),
}));
