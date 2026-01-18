import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExplodedViewService, IExplodedViewRepository } from './exploded-view.service';
import { IExplodedView } from '../interfaces/exploded-view.interface';

const mockExplodedViewRepository: IExplodedViewRepository = {
  findByMachineModelId: vi.fn(),
};

describe('ExplodedViewService', () => {
  let service: ExplodedViewService;

  const mockExplodedView: IExplodedView = {
    id: 'view-1',
    tenantId: 'tenant-1',
    machineModelId: 'model-1',
    machineModelName: 'Makita HR2470',
    manufacturer: 'Makita',
    version: '1.0',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    hotspots: [
      {
        id: 'hotspot-1',
        position: '15',
        x: 10,
        y: 20,
        width: 5,
        height: 5,
        itemId: 'item-1',
        itemCode: 'SKF-6202',
        itemName: 'Golyoscsapagy',
        unitPrice: 2500,
        stockQuantity: 10,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ExplodedViewService(mockExplodedViewRepository);
  });

  it('should get exploded view by machine model', async () => {
    (mockExplodedViewRepository.findByMachineModelId as ReturnType<typeof vi.fn>).mockResolvedValue(mockExplodedView);
    const result = await service.getByMachineModel('model-1');
    expect(result).toEqual(mockExplodedView);
  });

  it('should select a part from a hotspot', () => {
    const selection = service.selectPart(mockExplodedView, 'hotspot-1', 2);
    expect(selection.itemId).toBe('item-1');
    expect(selection.quantity).toBe(2);
  });

  it('should throw error if hotspot not found', () => {
    expect(() => service.selectPart(mockExplodedView, 'hotspot-2', 1)).toThrow('Hotspot not found');
  });

  it('should throw error if insufficient stock', () => {
    expect(() => service.selectPart(mockExplodedView, 'hotspot-1', 11)).toThrow('Insufficient stock');
  });

  it('should return null when no exploded view exists', async () => {
    (mockExplodedViewRepository.findByMachineModelId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await service.getByMachineModel('nonexistent');
    expect(result).toBeNull();
  });
});
