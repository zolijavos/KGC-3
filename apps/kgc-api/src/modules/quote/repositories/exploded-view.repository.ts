/**
 * Exploded View Repository
 * Epic 18: Story 18-2 - Robbantott ábra alapú alkatrész kiválasztás
 *
 * MVP Implementation: JSON-based mock data
 * TODO: Add Prisma ExplodedView model for production
 */

import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Injection token for ExplodedView repository */
export const EXPLODED_VIEW_REPOSITORY = 'EXPLODED_VIEW_REPOSITORY';

/** Hotspot on an exploded diagram */
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

/** Exploded view diagram for a machine model */
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

/** Part selection from exploded view */
export interface IPartSelection {
  hotspotId: string;
  position: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
}

/** Filter options for exploded view search */
export interface ExplodedViewFilterDto {
  manufacturer?: string;
  machineModelId?: string;
  searchTerm?: string;
  isActive?: boolean;
}

/** Repository interface */
export interface IExplodedViewRepository {
  findByMachineModelId(machineModelId: string, tenantId: string): Promise<IExplodedView | null>;
  findByManufacturer(manufacturer: string, tenantId: string): Promise<IExplodedView[]>;
  searchMachineModels(
    tenantId: string,
    filter: ExplodedViewFilterDto
  ): Promise<{ id: string; name: string; manufacturer: string }[]>;
  getHotspotParts(explodedViewId: string, tenantId: string): Promise<IExplodedViewHotspot[]>;
}

/**
 * MVP Implementation using Product table for parts lookup
 * In production, this would use a dedicated ExplodedView Prisma model
 */
@Injectable()
export class PrismaExplodedViewRepository implements IExplodedViewRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Find exploded view by machine model ID
   * MVP: Returns mock data structure populated from Product table
   */
  async findByMachineModelId(
    machineModelId: string,
    tenantId: string
  ): Promise<IExplodedView | null> {
    // MVP: Look for products matching the model
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        model: machineModelId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        model: true,
        sellingPrice: true,
      },
      take: 100,
    });

    if (products.length === 0) {
      return null;
    }

    const firstProduct = products[0];
    if (!firstProduct) {
      return null;
    }

    // Build exploded view from products
    const hotspots: IExplodedViewHotspot[] = products.map((product, index) => ({
      id: `hotspot-${product.id}`,
      position: `P${String(index + 1).padStart(3, '0')}`,
      x: (index % 10) * 50,
      y: Math.floor(index / 10) * 50,
      width: 40,
      height: 40,
      itemId: product.id,
      itemCode: product.sku,
      itemName: product.name,
      unitPrice: product.sellingPrice ? Number(product.sellingPrice) : 0,
      stockQuantity: 100, // TODO: Get real stock from inventory
    }));

    return {
      id: `ev-${machineModelId}`,
      tenantId,
      machineModelId,
      machineModelName: firstProduct.model ?? machineModelId,
      manufacturer: firstProduct.brand ?? 'Unknown',
      hotspots,
      version: '1.0.0',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Find all exploded views for a manufacturer
   */
  async findByManufacturer(manufacturer: string, tenantId: string): Promise<IExplodedView[]> {
    // Get distinct models for the manufacturer
    const models = await this.prisma.product.findMany({
      where: {
        tenantId,
        brand: {
          contains: manufacturer,
          mode: 'insensitive',
        },
        status: 'ACTIVE',
      },
      select: {
        model: true,
        brand: true,
      },
      distinct: ['model'],
    });

    const results: IExplodedView[] = [];
    for (const modelInfo of models) {
      if (modelInfo.model) {
        const explodedView = await this.findByMachineModelId(modelInfo.model, tenantId);
        if (explodedView) {
          results.push(explodedView);
        }
      }
    }

    return results;
  }

  /**
   * Search for machine models that have exploded views
   */
  async searchMachineModels(
    tenantId: string,
    filter: ExplodedViewFilterDto
  ): Promise<{ id: string; name: string; manufacturer: string }[]> {
    const where: Record<string, unknown> = {
      tenantId,
      status: 'ACTIVE',
      model: { not: null },
    };

    if (filter.manufacturer) {
      where['brand'] = {
        contains: filter.manufacturer,
        mode: 'insensitive',
      };
    }

    if (filter.searchTerm) {
      where['OR'] = [
        { model: { contains: filter.searchTerm, mode: 'insensitive' } },
        { brand: { contains: filter.searchTerm, mode: 'insensitive' } },
        { name: { contains: filter.searchTerm, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      select: {
        model: true,
        brand: true,
      },
      distinct: ['model'],
      take: 50,
    });

    return products
      .filter((p): p is { model: string; brand: string | null } => p.model !== null)
      .map(p => ({
        id: p.model,
        name: p.model,
        manufacturer: p.brand ?? 'Unknown',
      }));
  }

  /**
   * Get all hotspot parts for an exploded view
   */
  async getHotspotParts(explodedViewId: string, tenantId: string): Promise<IExplodedViewHotspot[]> {
    // Extract model ID from exploded view ID
    const machineModelId = explodedViewId.replace('ev-', '');
    const explodedView = await this.findByMachineModelId(machineModelId, tenantId);
    return explodedView?.hotspots ?? [];
  }
}
