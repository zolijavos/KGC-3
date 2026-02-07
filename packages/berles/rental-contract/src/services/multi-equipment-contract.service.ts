/**
 * @kgc/rental-contract - MultiEquipmentContractService
 * Story 42-1: Több gép szerződés csomagok
 *
 * Service for handling contracts with multiple equipment items
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractStatus } from '../interfaces/contract.interface';
import {
  ContractItemStatus,
  ContractReturnResult,
  CreateMultiEquipmentContractDto,
  DepositCalculation,
  MultiEquipmentContract,
  RentalContractItem,
  ReturnContractItemDto,
} from '../interfaces/multi-equipment-contract.interface';

/** Default deposit rate (30% of equipment value) */
const DEFAULT_DEPOSIT_RATE = 0.3;

export class MultiEquipmentContractService {
  private contracts: Map<string, MultiEquipmentContract> = new Map();
  private contractIdCounter = 0;
  private itemIdCounter = 0;
  private contractNumberCounter = 0;

  /**
   * Create a new multi-equipment contract
   */
  async createMultiEquipmentContract(
    dto: CreateMultiEquipmentContractDto,
    createdBy: string
  ): Promise<MultiEquipmentContract> {
    // Validate equipment items
    if (!dto.equipmentItems || dto.equipmentItems.length === 0) {
      throw new BadRequestException('At least one equipment item is required');
    }

    const depositRate = dto.depositRate ?? DEFAULT_DEPOSIT_RATE;
    const now = new Date();
    const contractId = `multi-contract_${++this.contractIdCounter}_${Date.now()}`;

    // Create contract items
    const items: RentalContractItem[] = dto.equipmentItems.map(eq => ({
      id: `item_${++this.itemIdCounter}_${Date.now()}`,
      contractId,
      equipmentId: eq.equipmentId,
      equipmentName: eq.equipmentName,
      equipmentSerialNumber: eq.equipmentSerialNumber,
      equipmentValue: eq.equipmentValue,
      dailyRate: eq.dailyRate,
      status: ContractItemStatus.RENTED,
      rentedAt: dto.startDate,
    }));

    // Calculate deposit
    const depositCalc = this.calculateDeposit(
      dto.equipmentItems.map(eq => ({
        equipmentId: eq.equipmentId,
        equipmentValue: eq.equipmentValue,
      })),
      depositRate
    );

    const contract: MultiEquipmentContract = {
      id: contractId,
      tenantId: dto.tenantId,
      rentalId: `rental-${contractId}`, // Generated rental reference
      templateId: dto.templateId,
      contractNumber: this.generateContractNumber(dto.tenantId),
      status: ContractStatus.DRAFT,
      variables: {
        partnerName: '',
        partnerAddress: '',
        rentalId: `rental-${contractId}`,
        rentalStartDate: dto.startDate.toISOString(),
        rentalDailyRate: items.reduce((sum, item) => sum + item.dailyRate, 0),
        equipmentName: items.map(i => i.equipmentName).join(', '),
        companyName: '',
        companyAddress: '',
        companyTaxNumber: '',
        currentDate: now.toISOString(),
        contractNumber: '',
        depositAmount: depositCalc.depositAmount,
      },
      items,
      totalDepositAmount: depositCalc.depositAmount,
      depositRate,
      isFullyReturned: false,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.contracts.set(contractId, contract);

    return contract;
  }

  /**
   * Return a single item from a multi-equipment contract
   */
  async returnItem(dto: ReturnContractItemDto): Promise<ContractReturnResult> {
    const contract = this.contracts.get(dto.contractId);

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const item = contract.items.find(i => i.id === dto.itemId);

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.status === ContractItemStatus.RETURNED) {
      throw new BadRequestException('Item already returned');
    }

    // Update item status
    item.status = ContractItemStatus.RETURNED;
    item.returnedAt = new Date();
    item.returnedBy = dto.returnedBy;
    item.returnNotes = dto.returnNotes;

    // Check if all items are returned
    const remainingItems = contract.items.filter(i => i.status === ContractItemStatus.RENTED);
    const isContractClosed = remainingItems.length === 0;

    if (isContractClosed) {
      contract.isFullyReturned = true;
      contract.status = ContractStatus.EXPIRED; // Contract completed
    } else {
      // Ensure contract is in SIGNED status (active)
      if (contract.status === ContractStatus.DRAFT) {
        contract.status = ContractStatus.SIGNED;
      }
    }

    contract.updatedAt = new Date();
    this.contracts.set(dto.contractId, contract);

    return {
      contract,
      returnedItem: item,
      isContractClosed,
      remainingItemsCount: remainingItems.length,
      depositToRelease: isContractClosed ? contract.totalDepositAmount : undefined,
    };
  }

  /**
   * Calculate deposit amount based on equipment values
   */
  calculateDeposit(
    items: { equipmentId: string; equipmentValue: number }[],
    depositRate: number
  ): DepositCalculation {
    const totalEquipmentValue = items.reduce((sum, item) => sum + item.equipmentValue, 0);
    const depositAmount = Math.round(totalEquipmentValue * depositRate);

    const itemBreakdown = items.map(item => ({
      equipmentId: item.equipmentId,
      equipmentValue: item.equipmentValue,
      depositContribution: Math.round(item.equipmentValue * depositRate),
    }));

    return {
      totalEquipmentValue,
      depositRate,
      depositAmount,
      itemBreakdown,
    };
  }

  /**
   * Get contract by ID and tenant
   */
  async getContractById(id: string, tenantId: string): Promise<MultiEquipmentContract> {
    const contract = this.contracts.get(id);

    if (!contract || contract.tenantId !== tenantId) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  /**
   * Get remaining (still rented) items from a contract
   */
  async getRemainingItems(contractId: string, tenantId: string): Promise<RentalContractItem[]> {
    const contract = await this.getContractById(contractId, tenantId);

    return contract.items.filter(item => item.status === ContractItemStatus.RENTED);
  }

  /**
   * Generate contract number
   */
  private generateContractNumber(tenantId: string): string {
    const year = new Date().getFullYear();
    const sequence = String(++this.contractNumberCounter).padStart(5, '0');
    const prefix = tenantId.substring(0, 3).toUpperCase() || 'KGC';

    return `${prefix}-MC-${year}-${sequence}`;
  }
}
