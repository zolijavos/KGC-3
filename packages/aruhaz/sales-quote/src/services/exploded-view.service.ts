/**
 * @kgc/sales-quote - ExplodedViewService
 * Epic 18: Story 18-2 - Robbantott abra alapu alkatresz kivalasztas
 */

import { Injectable } from '@nestjs/common';
import { IExplodedView, IPartSelection } from '../interfaces/exploded-view.interface';

export interface IExplodedViewRepository {
  findByMachineModelId(machineModelId: string): Promise<IExplodedView | null>;
}

@Injectable()
export class ExplodedViewService {
  constructor(private readonly repository: IExplodedViewRepository) {}

  async getByMachineModel(machineModelId: string): Promise<IExplodedView | null> {
    return this.repository.findByMachineModelId(machineModelId);
  }

  selectPart(explodedView: IExplodedView, hotspotId: string, quantity: number): IPartSelection {
    const hotspot = explodedView.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot) {
      throw new Error('Hotspot not found');
    }
    if (hotspot.stockQuantity < quantity) {
      throw new Error('Insufficient stock');
    }
    return {
      hotspotId,
      position: hotspot.position,
      itemId: hotspot.itemId,
      itemCode: hotspot.itemCode,
      itemName: hotspot.itemName,
      quantity,
      unitPrice: hotspot.unitPrice,
    };
  }
}
