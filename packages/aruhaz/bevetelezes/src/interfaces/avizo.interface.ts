/**
 * @kgc/bevetelezes - Avizo Interfaces
 * Epic 21: Goods Receipt management
 */

export enum AvizoStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export interface IAvizo {
  id: string;
  tenantId: string;
  avizoNumber: string;
  supplierId: string;
  supplierName: string;
  expectedDate: Date;
  status: AvizoStatus;
  totalItems: number;
  totalQuantity: number;
  pdfUrl?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAvizoItem {
  id: string;
  avizoId: string;
  tenantId: string;
  productId: string;
  productCode: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAvizoCreateResult {
  avizo: IAvizo;
  avizoNumber: string;
}
