import { create } from 'zustand';
import { calculatePricing } from './mock-data';
import type { Equipment, Partner, RentalPricing } from './types';

interface WizardStore {
  // Current step (0-3)
  step: number;

  // Selected data
  partner: Partner | null;
  equipment: Equipment | null;
  startDate: Date | null;
  endDate: Date | null;
  pricing: RentalPricing | null;
  notes: string;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPartner: (partner: Partner | null) => void;
  setEquipment: (equipment: Equipment | null) => void;
  setDates: (startDate: Date, endDate: Date) => void;
  setNotes: (notes: string) => void;
  reset: () => void;

  // Computed
  canProceed: () => boolean;
}

const initialState = {
  step: 0,
  partner: null,
  equipment: null,
  startDate: null,
  endDate: null,
  pricing: null,
  notes: '',
};

export const useWizardStore = create<WizardStore>((set, get) => ({
  ...initialState,

  setStep: step => set({ step }),

  nextStep: () => {
    const { step } = get();
    if (step < 3) {
      set({ step: step + 1 });
    }
  },

  prevStep: () => {
    const { step } = get();
    if (step > 0) {
      set({ step: step - 1 });
    }
  },

  setPartner: partner => set({ partner }),

  setEquipment: equipment => set({ equipment }),

  setDates: (startDate, endDate) => {
    const { equipment } = get();
    let pricing: RentalPricing | null = null;

    if (equipment && startDate && endDate) {
      pricing = calculatePricing(equipment, startDate, endDate);
    }

    set({ startDate, endDate, pricing });
  },

  setNotes: notes => set({ notes }),

  reset: () => set(initialState),

  canProceed: () => {
    const { step, partner, equipment, startDate, endDate } = get();

    switch (step) {
      case 0:
        return partner !== null;
      case 1:
        return equipment !== null;
      case 2:
        return startDate !== null && endDate !== null;
      case 3:
        return true; // Summary step, always can submit
      default:
        return false;
    }
  },
}));
