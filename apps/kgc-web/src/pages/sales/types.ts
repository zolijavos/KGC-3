// Sales/POS types

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  MIXED = 'MIXED',
}

export enum SaleStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  vatRate: number;
  stock: number;
  unit: string;
  barcode?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
  type: 'INDIVIDUAL' | 'COMPANY';
}

export interface Sale {
  id: string;
  saleNumber: string;
  date: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  vatAmount: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  cashierId: string;
  cashierName: string;
  receiptNumber?: string;
}
