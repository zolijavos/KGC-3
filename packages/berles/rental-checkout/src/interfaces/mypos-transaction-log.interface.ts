/**
 * @kgc/rental-checkout - MyPOS Transaction Log Interfaces
 * Story 36-4: MyPOS Transaction Audit Log (ADR-047)
 */

/**
 * MyPOS Transaction Type
 */
export enum MyPosTransactionType {
  SALE = 'SALE',
  REFUND = 'REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  VOID = 'VOID',
}

/**
 * MyPOS Transaction Log Status
 */
export enum MyPosTransactionLogStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  VOID = 'VOID',
}

/**
 * MyPOS Transaction Log Entry
 */
export interface IMyPosTransactionLog {
  /** Unique ID (UUID) */
  id: string;
  /** Tenant ID (multi-tenant) */
  tenantId: string;
  /** MyPOS transaction ID */
  myposTxnId: string;
  /** Transaction type */
  type: MyPosTransactionType;
  /** Transaction status */
  status: MyPosTransactionLogStatus;
  /** Amount in HUF */
  amount: number;
  /** Currency (default: HUF) */
  currency: string;

  // Associations
  /** Rental ID (optional) */
  rentalId?: string;
  /** Deposit ID (optional) */
  depositId?: string;
  /** Reference transaction ID (for REFUND) */
  referenceTxnId?: string;

  // Card info (anonymized)
  /** Last 4 digits of card */
  cardLast4?: string;
  /** Card type (VISA, MASTERCARD, etc.) */
  cardType?: string;

  // Terminal info
  /** Terminal ID */
  terminalId: string;
  /** Operator user ID */
  operatorId: string;

  // Error handling
  /** Error code (if failed) */
  errorCode?: string;
  /** Error message (if failed) */
  errorMessage?: string;
  /** Retry count */
  retryCount: number;

  // Timestamps
  /** Created at */
  createdAt: Date;
  /** Completed at */
  completedAt?: Date;
}

/**
 * Create Transaction Log DTO
 */
export interface ICreateTransactionLogDto {
  tenantId: string;
  myposTxnId: string;
  type: MyPosTransactionType;
  status: MyPosTransactionLogStatus;
  amount: number;
  currency?: string;
  rentalId?: string;
  depositId?: string;
  referenceTxnId?: string;
  cardLast4?: string;
  cardType?: string;
  terminalId: string;
  operatorId: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
}

/**
 * Transaction Log Filter
 */
export interface ITransactionLogFilter {
  tenantId: string;
  rentalId?: string;
  depositId?: string;
  type?: MyPosTransactionType;
  status?: MyPosTransactionLogStatus;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Transaction Log Repository Interface
 */
export interface IMyPosTransactionLogRepository {
  create(data: ICreateTransactionLogDto): Promise<IMyPosTransactionLog>;
  findById(id: string, tenantId: string): Promise<IMyPosTransactionLog | null>;
  findByRentalId(rentalId: string, tenantId: string): Promise<IMyPosTransactionLog[]>;
  findByDepositId(depositId: string, tenantId: string): Promise<IMyPosTransactionLog[]>;
  findByDateRange(from: Date, to: Date, tenantId: string): Promise<IMyPosTransactionLog[]>;
  findByFilter(filter: ITransactionLogFilter): Promise<IMyPosTransactionLog[]>;
}

/**
 * Transaction Log Service Interface
 */
export interface IMyPosTransactionLogService {
  logTransaction(data: ICreateTransactionLogDto): Promise<IMyPosTransactionLog>;
  getByRental(rentalId: string, tenantId: string): Promise<IMyPosTransactionLog[]>;
  getByDeposit(depositId: string, tenantId: string): Promise<IMyPosTransactionLog[]>;
  getByDateRange(from: Date, to: Date, tenantId: string): Promise<IMyPosTransactionLog[]>;
  exportToCsv(filter: ITransactionLogFilter): Promise<string>;
}
