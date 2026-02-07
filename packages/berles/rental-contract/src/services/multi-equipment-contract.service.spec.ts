/**
 * @kgc/rental-contract - MultiEquipmentContractService Tests
 * Story 42-1: Több gép szerződés csomagok
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ContractStatus } from '../interfaces/contract.interface';
import {
  ContractItemStatus,
  CreateMultiEquipmentContractDto,
  MultiEquipmentContract,
} from '../interfaces/multi-equipment-contract.interface';
import { MultiEquipmentContractService } from './multi-equipment-contract.service';

describe('MultiEquipmentContractService', () => {
  let service: MultiEquipmentContractService;

  beforeEach(() => {
    service = new MultiEquipmentContractService();
  });

  describe('createMultiEquipmentContract', () => {
    it('should create a contract with multiple equipment items', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          {
            equipmentId: 'eq-1',
            equipmentName: 'Fúró-001',
            equipmentSerialNumber: 'SN001',
            equipmentValue: 100000,
            dailyRate: 5000,
          },
          {
            equipmentId: 'eq-2',
            equipmentName: 'Csiszoló-002',
            equipmentSerialNumber: 'SN002',
            equipmentValue: 80000,
            dailyRate: 4000,
          },
          {
            equipmentId: 'eq-3',
            equipmentName: 'Vágó-003',
            equipmentSerialNumber: 'SN003',
            equipmentValue: 120000,
            dailyRate: 6000,
          },
        ],
        startDate: new Date('2026-02-01'),
      };

      const result = await service.createMultiEquipmentContract(dto, 'user-1');

      expect(result.items).toHaveLength(3);
      expect(result.status).toBe(ContractStatus.DRAFT);
      expect(result.isFullyReturned).toBe(false);
    });

    it('should calculate aggregated deposit from all equipment values', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          { equipmentId: 'eq-1', equipmentName: 'Gép 1', equipmentValue: 100000, dailyRate: 5000 },
          { equipmentId: 'eq-2', equipmentName: 'Gép 2', equipmentValue: 200000, dailyRate: 8000 },
        ],
        startDate: new Date(),
        depositRate: 0.3, // 30%
      };

      const result = await service.createMultiEquipmentContract(dto, 'user-1');

      // Total value: 300000, deposit rate: 30% = 90000
      expect(result.totalDepositAmount).toBe(90000);
      expect(result.depositRate).toBe(0.3);
    });

    it('should use default deposit rate of 30% if not specified', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          { equipmentId: 'eq-1', equipmentName: 'Gép 1', equipmentValue: 100000, dailyRate: 5000 },
        ],
        startDate: new Date(),
        // No depositRate specified
      };

      const result = await service.createMultiEquipmentContract(dto, 'user-1');

      expect(result.depositRate).toBe(0.3);
      expect(result.totalDepositAmount).toBe(30000);
    });

    it('should set all items to RENTED status initially', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          { equipmentId: 'eq-1', equipmentName: 'Gép 1', equipmentValue: 100000, dailyRate: 5000 },
          { equipmentId: 'eq-2', equipmentName: 'Gép 2', equipmentValue: 100000, dailyRate: 5000 },
        ],
        startDate: new Date(),
      };

      const result = await service.createMultiEquipmentContract(dto, 'user-1');

      expect(result.items.every(item => item.status === ContractItemStatus.RENTED)).toBe(true);
    });

    it('should throw error if no equipment items provided', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [],
        startDate: new Date(),
      };

      await expect(service.createMultiEquipmentContract(dto, 'user-1')).rejects.toThrow(
        'At least one equipment item is required'
      );
    });
  });

  describe('returnItem', () => {
    let contract: MultiEquipmentContract;

    beforeEach(async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          {
            equipmentId: 'eq-1',
            equipmentName: 'Fúró-001',
            equipmentValue: 100000,
            dailyRate: 5000,
          },
          {
            equipmentId: 'eq-2',
            equipmentName: 'Csiszoló-002',
            equipmentValue: 80000,
            dailyRate: 4000,
          },
          {
            equipmentId: 'eq-3',
            equipmentName: 'Vágó-003',
            equipmentValue: 120000,
            dailyRate: 6000,
          },
        ],
        startDate: new Date('2026-02-01'),
      };
      contract = await service.createMultiEquipmentContract(dto, 'user-1');
    });

    it('should allow partial return of single item', async () => {
      const itemId = contract.items[0]?.id ?? '';

      const result = await service.returnItem({
        contractId: contract.id,
        itemId,
        returnedBy: 'user-2',
        returnNotes: 'Good condition',
      });

      expect(result.returnedItem.status).toBe(ContractItemStatus.RETURNED);
      expect(result.returnedItem.returnedBy).toBe('user-2');
      expect(result.isContractClosed).toBe(false);
      expect(result.remainingItemsCount).toBe(2);
    });

    it('should keep contract open when items remain', async () => {
      const itemId = contract.items[0]?.id ?? '';

      const result = await service.returnItem({
        contractId: contract.id,
        itemId,
        returnedBy: 'user-2',
      });

      expect(result.contract.status).toBe(ContractStatus.SIGNED); // Still active
      expect(result.contract.isFullyReturned).toBe(false);
    });

    it('should close contract when last item is returned', async () => {
      // Return all items one by one
      for (const item of contract.items) {
        await service.returnItem({
          contractId: contract.id,
          itemId: item.id,
          returnedBy: 'user-2',
        });
      }

      const updatedContract = await service.getContractById(contract.id, 'tenant-1');

      expect(updatedContract.isFullyReturned).toBe(true);
      expect(updatedContract.status).toBe(ContractStatus.EXPIRED); // Contract completed
    });

    it('should include deposit to release when contract closes', async () => {
      // Create a simple 1-item contract for easier testing
      const singleItemDto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          {
            equipmentId: 'eq-single',
            equipmentName: 'Single Equipment',
            equipmentValue: 100000,
            dailyRate: 5000,
          },
        ],
        startDate: new Date(),
        depositRate: 0.3,
      };
      const singleContract = await service.createMultiEquipmentContract(singleItemDto, 'user-1');
      const itemId = singleContract.items[0]?.id ?? '';

      const result = await service.returnItem({
        contractId: singleContract.id,
        itemId,
        returnedBy: 'user-2',
      });

      expect(result.isContractClosed).toBe(true);
      expect(result.depositToRelease).toBe(30000); // 100000 * 0.3
    });

    it('should record return timestamp and notes', async () => {
      const itemId = contract.items[0]?.id ?? '';
      const beforeReturn = new Date();

      const result = await service.returnItem({
        contractId: contract.id,
        itemId,
        returnedBy: 'user-2',
        returnNotes: 'Minor scratches noted',
      });

      expect(result.returnedItem.returnedAt).toBeDefined();
      expect(result.returnedItem.returnedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeReturn.getTime()
      );
      expect(result.returnedItem.returnNotes).toBe('Minor scratches noted');
    });

    it('should throw error if item already returned', async () => {
      const itemId = contract.items[0]?.id ?? '';

      // First return
      await service.returnItem({
        contractId: contract.id,
        itemId,
        returnedBy: 'user-2',
      });

      // Second return attempt
      await expect(
        service.returnItem({
          contractId: contract.id,
          itemId,
          returnedBy: 'user-2',
        })
      ).rejects.toThrow('Item already returned');
    });

    it('should throw error if item not found', async () => {
      await expect(
        service.returnItem({
          contractId: contract.id,
          itemId: 'non-existent-item',
          returnedBy: 'user-2',
        })
      ).rejects.toThrow('Item not found');
    });
  });

  describe('calculateDeposit', () => {
    it('should calculate correct deposit for multiple items', () => {
      const items = [
        { equipmentId: 'eq-1', equipmentValue: 100000 },
        { equipmentId: 'eq-2', equipmentValue: 200000 },
        { equipmentId: 'eq-3', equipmentValue: 150000 },
      ];
      const depositRate = 0.25; // 25%

      const result = service.calculateDeposit(items, depositRate);

      expect(result.totalEquipmentValue).toBe(450000);
      expect(result.depositRate).toBe(0.25);
      expect(result.depositAmount).toBe(112500); // 450000 * 0.25
      expect(result.itemBreakdown).toHaveLength(3);
    });

    it('should provide per-item deposit contribution breakdown', () => {
      const items = [
        { equipmentId: 'eq-1', equipmentValue: 100000 },
        { equipmentId: 'eq-2', equipmentValue: 200000 },
      ];
      const depositRate = 0.3;

      const result = service.calculateDeposit(items, depositRate);

      expect(result.itemBreakdown[0]?.depositContribution).toBe(30000);
      expect(result.itemBreakdown[1]?.depositContribution).toBe(60000);
    });

    it('should handle empty items array', () => {
      const result = service.calculateDeposit([], 0.3);

      expect(result.totalEquipmentValue).toBe(0);
      expect(result.depositAmount).toBe(0);
      expect(result.itemBreakdown).toHaveLength(0);
    });
  });

  describe('getContractById', () => {
    it('should return contract by id and tenant', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          { equipmentId: 'eq-1', equipmentName: 'Gép 1', equipmentValue: 100000, dailyRate: 5000 },
        ],
        startDate: new Date(),
      };
      const created = await service.createMultiEquipmentContract(dto, 'user-1');

      const found = await service.getContractById(created.id, 'tenant-1');

      expect(found.id).toBe(created.id);
      expect(found.items).toHaveLength(1);
    });

    it('should throw error if contract not found', async () => {
      await expect(service.getContractById('non-existent', 'tenant-1')).rejects.toThrow(
        'Contract not found'
      );
    });

    it('should throw error if tenant mismatch', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          { equipmentId: 'eq-1', equipmentName: 'Gép 1', equipmentValue: 100000, dailyRate: 5000 },
        ],
        startDate: new Date(),
      };
      const created = await service.createMultiEquipmentContract(dto, 'user-1');

      await expect(service.getContractById(created.id, 'different-tenant')).rejects.toThrow(
        'Contract not found'
      );
    });
  });

  describe('getRemainingItems', () => {
    it('should return only items that are still rented', async () => {
      const dto: CreateMultiEquipmentContractDto = {
        tenantId: 'tenant-1',
        templateId: 'template-1',
        partnerId: 'partner-1',
        equipmentItems: [
          { equipmentId: 'eq-1', equipmentName: 'Gép 1', equipmentValue: 100000, dailyRate: 5000 },
          { equipmentId: 'eq-2', equipmentName: 'Gép 2', equipmentValue: 100000, dailyRate: 5000 },
          { equipmentId: 'eq-3', equipmentName: 'Gép 3', equipmentValue: 100000, dailyRate: 5000 },
        ],
        startDate: new Date(),
      };
      const contract = await service.createMultiEquipmentContract(dto, 'user-1');

      // Return first item
      await service.returnItem({
        contractId: contract.id,
        itemId: contract.items[0]?.id ?? '',
        returnedBy: 'user-2',
      });

      const remaining = await service.getRemainingItems(contract.id, 'tenant-1');

      expect(remaining).toHaveLength(2);
      expect(remaining.every(item => item.status === ContractItemStatus.RENTED)).toBe(true);
    });
  });
});
