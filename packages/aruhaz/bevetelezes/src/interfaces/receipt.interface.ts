/**
 * @kgc/bevetelezes - Receipt Interfaces
 * Epic 21: Goods Receipt management
 */

export enum ReceiptStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DISCREPANCY = 'DISCREPANCY',
}

export enum DiscrepancyType {
  SHORTAGE = 'SHORTAGE',
  SURPLUS = 'SURPLUS',
  DAMAGED = 'DAMAGED',
  WRONG_ITEM = 'WRONG_ITEM',
}

export interface IReceipt {
  id: string;
  tenantId: string;
  receiptNumber: string;
  avizoId?: string;
  supplierId: string;
  supplierName: string;
  receivedDate: Date;
  status: ReceiptStatus;
  totalItems: number;
  totalQuantity: number;
  hasDiscrepancy: boolean;
  processedBy: string;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReceiptItem {
  id: string;
  receiptId: string;
  tenantId: string;
  avizoItemId?: string;
  productId: string;
  productCode: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  locationCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscrepancy {
  id: string;
  receiptId: string;
  receiptItemId: string;
  tenantId: string;
  type: DiscrepancyType;
  expectedQuantity: number;
  actualQuantity: number;
  difference: number;
  reason?: string;
  supplierNotified: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Tolerance for automatic approval: ±0.5% */
export const RECEIPT_TOLERANCE_PERCENT = 0.5;
