/**
 * @kgc/sales-pos - Cash Register Session Interfaces
 * Epic 22: Point of Sale - Story 22-1
 */

export enum CashRegisterStatus {
  OPEN = 'OPEN',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  CLOSED = 'CLOSED',
}

export interface ICashRegisterSession {
  id: string;
  tenantId: string;
  locationId: string;
  sessionNumber: string;
  openedAt: Date;
  closedAt?: Date;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  variance?: number;
  varianceNote?: string;
  openedBy: string;
  closedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  approverNote?: string;
  status: CashRegisterStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionCreateResult {
  session: ICashRegisterSession;
  sessionNumber: string;
}

/**
 * Repository interface for CashRegisterSession
 * Implemented in apps/kgc-api with Prisma
 */
export interface ISessionRepository {
  findById(id: string): Promise<ICashRegisterSession | null>;
  findBySessionNumber(sessionNumber: string): Promise<ICashRegisterSession | null>;
  findCurrentByLocation(locationId: string): Promise<ICashRegisterSession | null>;
  create(
    data: Omit<ICashRegisterSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ICashRegisterSession>;
  update(id: string, data: Partial<ICashRegisterSession>): Promise<ICashRegisterSession>;
  getNextSequenceNumber(tenantId: string, year: number): Promise<number>;
}
