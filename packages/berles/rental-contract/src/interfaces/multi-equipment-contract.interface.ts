/**
 * @kgc/rental-contract - Multi-Equipment Contract Interfaces
 * Story 42-1: Több gép szerződés csomagok
 *
 * Supports multiple equipment items on a single contract
 */

import { Contract } from './contract.interface';

/**
 * Item status within a multi-equipment contract
 */
export enum ContractItemStatus {
  /** Equipment is currently rented out */
  RENTED = 'RENTED',
  /** Equipment has been returned */
  RETURNED = 'RETURNED',
  /** Equipment return is overdue */
  OVERDUE = 'OVERDUE',
}

/**
 * Single equipment item within a multi-equipment contract
 */
export interface RentalContractItem {
  id: string;
  contractId: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSerialNumber?: string | undefined;
  /** Estimated value for deposit calculation */
  equipmentValue: number;
  /** Daily rental rate for this equipment */
  dailyRate: number;
  status: ContractItemStatus;
  /** When the equipment was rented out */
  rentedAt: Date;
  /** When the equipment was returned (null if still rented) */
  returnedAt?: Date | undefined;
  /** User who processed the return */
  returnedBy?: string | undefined;
  /** Notes about equipment condition at return */
  returnNotes?: string | undefined;
}

/**
 * Multi-equipment contract extending base Contract
 */
export interface MultiEquipmentContract extends Contract {
  /** List of equipment items in this contract */
  items: RentalContractItem[];
  /** Total deposit amount (sum of equipment values * deposit rate) */
  totalDepositAmount: number;
  /** Deposit rate (e.g., 0.3 = 30% of equipment value) */
  depositRate: number;
  /** Whether all items have been returned */
  isFullyReturned: boolean;
}

/**
 * DTO for creating a multi-equipment contract
 */
export interface CreateMultiEquipmentContractDto {
  tenantId: string;
  templateId: string;
  partnerId: string;
  /** Equipment items to include in the contract */
  equipmentItems: {
    equipmentId: string;
    equipmentName: string;
    equipmentSerialNumber?: string | undefined;
    equipmentValue: number;
    dailyRate: number;
  }[];
  /** Rental start date */
  startDate: Date;
  /** Expected end date */
  endDate?: Date | undefined;
  /** Deposit rate (default 0.3 = 30%) */
  depositRate?: number | undefined;
}

/**
 * DTO for returning a single item from a multi-equipment contract
 */
export interface ReturnContractItemDto {
  contractId: string;
  itemId: string;
  returnedBy: string;
  returnNotes?: string | undefined;
}

/**
 * Result of a partial or full return operation
 */
export interface ContractReturnResult {
  contract: MultiEquipmentContract;
  returnedItem: RentalContractItem;
  /** Whether this was the last item, closing the contract */
  isContractClosed: boolean;
  /** Remaining items count that are still rented */
  remainingItemsCount: number;
  /** Deposit amount to be released (if contract is closed) */
  depositToRelease?: number | undefined;
}

/**
 * Deposit calculation result
 */
export interface DepositCalculation {
  /** Total equipment value */
  totalEquipmentValue: number;
  /** Deposit rate applied */
  depositRate: number;
  /** Calculated deposit amount */
  depositAmount: number;
  /** Per-item breakdown */
  itemBreakdown: {
    equipmentId: string;
    equipmentValue: number;
    depositContribution: number;
  }[];
}
