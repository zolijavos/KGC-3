/**
 * @kgc/sales-quote - Exploded View Interfaces
 * Story 18-2: Robbantott abra alapu alkatresz kivalasztas
 */

export interface IExplodedViewHotspot {
  id: string;
  position: string;
  svgPath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitPrice: number;
  stockQuantity: number;
}

export interface IExplodedView {
  id: string;
  tenantId: string;
  machineModelId: string;
  machineModelName: string;
  manufacturer: string;
  svgContent?: string;
  imageUrl?: string;
  hotspots: IExplodedViewHotspot[];
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPartSelection {
  hotspotId: string;
  position: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
}
