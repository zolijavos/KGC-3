/**
 * @kgc/sales-pos - SessionService
 * Epic 22: Story 22-1 - Kassza Session Management
 */

import { Injectable } from '@nestjs/common';
import {
  CloseSessionDto,
  CloseSessionSchema,
  OpenSessionDto,
  OpenSessionSchema,
} from '../dto/session.dto.js';
import {
  CashRegisterStatus,
  ICashRegisterSession,
  ISessionCreateResult,
  ISessionRepository,
} from '../interfaces/session.interface.js';

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly auditService: IAuditService
  ) {}

  /**
   * Open a new cash register session
   * AC1: Only one open session per location allowed
   */
  async openSession(
    input: OpenSessionDto,
    tenantId: string,
    userId: string
  ): Promise<ISessionCreateResult> {
    const validationResult = OpenSessionSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Check for existing open session at this location
    const existingSession = await this.sessionRepository.findCurrentByLocation(
      validInput.locationId
    );
    if (existingSession) {
      throw new Error('Location already has an open session');
    }

    // Generate session number: KASSZA-YYYY-NNNN
    const year = new Date().getFullYear();
    const sequence = await this.sessionRepository.getNextSequenceNumber(tenantId, year);
    const sessionNumber = `KASSZA-${year}-${String(sequence).padStart(4, '0')}`;

    const session = await this.sessionRepository.create({
      tenantId,
      locationId: validInput.locationId,
      sessionNumber,
      openedAt: new Date(),
      openingBalance: validInput.openingBalance,
      status: CashRegisterStatus.OPEN,
      openedBy: userId,
    });

    await this.auditService.log({
      action: 'session_opened',
      entityType: 'cash_register_session',
      entityId: session.id,
      userId,
      tenantId,
      metadata: {
        sessionNumber,
        locationId: validInput.locationId,
        openingBalance: validInput.openingBalance,
      },
    });

    return { session, sessionNumber };
  }

  /**
   * Get current open session for a location
   */
  async getCurrentSession(
    locationId: string,
    tenantId: string
  ): Promise<ICashRegisterSession | null> {
    const session = await this.sessionRepository.findCurrentByLocation(locationId);
    if (session && session.tenantId !== tenantId) {
      return null;
    }
    return session;
  }

  /**
   * Get session by ID with tenant validation
   */
  async getSessionById(sessionId: string, tenantId: string): Promise<ICashRegisterSession> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return session;
  }

  /**
   * Suspend session (temporary pause)
   */
  async suspendSession(
    sessionId: string,
    reason: string | undefined,
    tenantId: string,
    userId: string
  ): Promise<ICashRegisterSession> {
    const session = await this.getSessionById(sessionId, tenantId);

    if (session.status !== CashRegisterStatus.OPEN) {
      throw new Error('Can only suspend open sessions');
    }

    const updatedSession = await this.sessionRepository.update(sessionId, {
      status: CashRegisterStatus.SUSPENDED,
    });

    await this.auditService.log({
      action: 'session_suspended',
      entityType: 'cash_register_session',
      entityId: sessionId,
      userId,
      tenantId,
      metadata: {
        sessionNumber: session.sessionNumber,
        reason: reason ?? 'No reason provided',
      },
    });

    return updatedSession;
  }

  /**
   * Resume a suspended session
   */
  async resumeSession(
    sessionId: string,
    tenantId: string,
    userId: string
  ): Promise<ICashRegisterSession> {
    const session = await this.getSessionById(sessionId, tenantId);

    if (session.status !== CashRegisterStatus.SUSPENDED) {
      throw new Error('Can only resume suspended sessions');
    }

    const updatedSession = await this.sessionRepository.update(sessionId, {
      status: CashRegisterStatus.OPEN,
    });

    await this.auditService.log({
      action: 'session_resumed',
      entityType: 'cash_register_session',
      entityId: sessionId,
      userId,
      tenantId,
      metadata: {
        sessionNumber: session.sessionNumber,
      },
    });

    return updatedSession;
  }

  /**
   * Close session with final balance reconciliation
   */
  async closeSession(
    sessionId: string,
    input: CloseSessionDto,
    tenantId: string,
    userId: string
  ): Promise<ICashRegisterSession> {
    const validationResult = CloseSessionSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const session = await this.getSessionById(sessionId, tenantId);

    if (session.status !== CashRegisterStatus.OPEN) {
      throw new Error('Can only close open sessions');
    }

    // Calculate expected balance (opening + cash sales - cash returns)
    // For now, simplified: expectedBalance = openingBalance
    // Full calculation will be in Story 22-2 (with payments)
    const expectedBalance = session.openingBalance;
    const variance = validInput.closingBalance - expectedBalance;

    // Require variance note if there is a difference
    if (variance !== 0 && !validInput.varianceNote) {
      throw new Error('Variance note required when there is a difference');
    }

    const updateData: Partial<ICashRegisterSession> = {
      status: CashRegisterStatus.CLOSED,
      closedAt: new Date(),
      closedBy: userId,
      closingBalance: validInput.closingBalance,
      expectedBalance,
      variance,
    };
    if (validInput.varianceNote !== undefined) {
      updateData.varianceNote = validInput.varianceNote;
    }

    const updatedSession = await this.sessionRepository.update(sessionId, updateData);

    await this.auditService.log({
      action: 'session_closed',
      entityType: 'cash_register_session',
      entityId: sessionId,
      userId,
      tenantId,
      metadata: {
        sessionNumber: session.sessionNumber,
        openingBalance: session.openingBalance,
        closingBalance: validInput.closingBalance,
        expectedBalance,
        variance,
      },
    });

    return updatedSession;
  }
}
