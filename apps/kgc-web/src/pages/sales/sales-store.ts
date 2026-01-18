import { create } from 'zustand';
import type { CartItem, Customer, Product } from './types';
import { PaymentMethod } from './types';

interface SalesState {
  // Cart
  cart: CartItem[];
  customer: Customer | null;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  globalDiscount: number;

  // Computed-like
  getSubtotal: () => number;
  getVatAmount: () => number;
  getTotal: () => number;
  getChange: () => number;

  // Actions
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, discount: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashReceived: (amount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  clearCart: () => void;
  reset: () => void;
}

const calculateLineTotal = (product: Product, quantity: number, discount: number): number => {
  const basePrice = product.price * quantity;
  return Math.max(0, basePrice - discount);
};

export const useSalesStore = create<SalesState>((set, get) => ({
  cart: [],
  customer: null,
  paymentMethod: PaymentMethod.CASH,
  cashReceived: 0,
  globalDiscount: 0,

  getSubtotal: () => {
    return get().cart.reduce((sum, item) => sum + item.lineTotal, 0);
  },

  getVatAmount: () => {
    return get().cart.reduce((sum, item) => {
      const vatRate = item.product.vatRate / 100;
      const netPrice = item.lineTotal / (1 + vatRate);
      return sum + (item.lineTotal - netPrice);
    }, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const globalDiscount = get().globalDiscount;
    return Math.max(0, subtotal - globalDiscount);
  },

  getChange: () => {
    const total = get().getTotal();
    const cashReceived = get().cashReceived;
    return Math.max(0, cashReceived - total);
  },

  addToCart: (product, quantity = 1) => {
    set(state => {
      const existingIndex = state.cart.findIndex(item => item.product.id === product.id);

      if (existingIndex >= 0) {
        // Update quantity if already in cart
        const updatedCart = [...state.cart];
        const existingItem = updatedCart[existingIndex];
        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          existingItem.quantity = newQuantity;
          existingItem.lineTotal = calculateLineTotal(product, newQuantity, existingItem.discount);
        }
        return { cart: updatedCart };
      }

      // Add new item
      const newItem: CartItem = {
        product,
        quantity,
        discount: 0,
        lineTotal: calculateLineTotal(product, quantity, 0),
      };
      return { cart: [...state.cart, newItem] };
    });
  },

  removeFromCart: productId => {
    set(state => ({
      cart: state.cart.filter(item => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }

    set(state => ({
      cart: state.cart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              lineTotal: calculateLineTotal(item.product, quantity, item.discount),
            }
          : item
      ),
    }));
  },

  setItemDiscount: (productId, discount) => {
    set(state => ({
      cart: state.cart.map(item =>
        item.product.id === productId
          ? {
              ...item,
              discount,
              lineTotal: calculateLineTotal(item.product, item.quantity, discount),
            }
          : item
      ),
    }));
  },

  setCustomer: customer => set({ customer }),
  setPaymentMethod: paymentMethod => set({ paymentMethod }),
  setCashReceived: cashReceived => set({ cashReceived }),
  setGlobalDiscount: globalDiscount => set({ globalDiscount }),

  clearCart: () => set({ cart: [], globalDiscount: 0, cashReceived: 0 }),

  reset: () =>
    set({
      cart: [],
      customer: null,
      paymentMethod: PaymentMethod.CASH,
      cashReceived: 0,
      globalDiscount: 0,
    }),
}));
