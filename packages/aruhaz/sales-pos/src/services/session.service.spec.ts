import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloseSessionDto, OpenSessionDto } from '../dto/session.dto.js';
import {
  CashRegisterStatus,
  ICashRegisterSession,
  ISessionRepository,
} from '../interfaces/session.interface.js';
import { IAuditService, SessionService } from './session.service.js';

const mockSessionRepository: ISessionRepository = {
  findById: vi.fn(),
  findBySessionNumber: vi.fn(),
  findCurrentByLocation: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  getNextSequenceNumber: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('SessionService', () => {
  let service: SessionService;

  const mockTenantId = '00000000-0000-0000-0000-000000000200';
  const mockUserId = '00000000-0000-0000-0000-000000000201';
  const mockLocationId = '00000000-0000-0000-0000-000000000001';
  const mockSessionId = '00000000-0000-0000-0000-000000000202';

  const mockOpenSession: ICashRegisterSession = {
    id: mockSessionId,
    tenantId: mockTenantId,
    locationId: mockLocationId,
    sessionNumber: 'KASSZA-2026-0001',
    openedAt: new Date('2026-01-26T08:00:00Z'),
    openingBalance: 50000,
    status: CashRegisterStatus.OPEN,
    openedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionService(mockSessionRepository, mockAuditService);
  });

  describe('openSession()', () => {
    describe('happy path', () => {
      it('should open a session successfully', async () => {
        const dto: OpenSessionDto = {
          locationId: mockLocationId,
          openingBalance: 50000,
        };

        (mockSessionRepository.findCurrentByLocation as ReturnType<typeof vi.fn>).mockResolvedValue(
          null
        );
        (mockSessionRepository.getNextSequenceNumber as ReturnType<typeof vi.fn>).mockResolvedValue(
          1
        );
        (mockSessionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockOpenSession
        );

        const result = await service.openSession(dto, mockTenantId, mockUserId);

        expect(result.sessionNumber).toMatch(/^KASSZA-\d{4}-\d{4}$/);
        expect(result.session.status).toBe(CashRegisterStatus.OPEN);
        expect(mockSessionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId,
            locationId: mockLocationId,
            openingBalance: 50000,
            status: CashRegisterStatus.OPEN,
            openedBy: mockUserId,
          })
        );
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'session_opened',
          })
        );
      });

      it('should generate correct session number format', async () => {
        const dto: OpenSessionDto = {
          locationId: mockLocationId,
          openingBalance: 50000,
        };

        (mockSessionRepository.findCurrentByLocation as ReturnType<typeof vi.fn>).mockResolvedValue(
          null
        );
        (mockSessionRepository.getNextSequenceNumber as ReturnType<typeof vi.fn>).mockResolvedValue(
          42
        );
        (mockSessionRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockOpenSession,
          sessionNumber: 'KASSZA-2026-0042',
        });

        const result = await service.openSession(dto, mockTenantId, mockUserId);

        expect(result.sessionNumber).toBe('KASSZA-2026-0042');
      });
    });

    describe('error handling', () => {
      it('should throw error if location already has an open session', async () => {
        const dto: OpenSessionDto = {
          locationId: mockLocationId,
          openingBalance: 50000,
        };

        (mockSessionRepository.findCurrentByLocation as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockOpenSession
        );

        await expect(service.openSession(dto, mockTenantId, mockUserId)).rejects.toThrow(
          'Location already has an open session'
        );
      });

      it('should throw error on invalid opening balance', async () => {
        const dto = {
          locationId: mockLocationId,
          openingBalance: -100,
        } as OpenSessionDto;

        await expect(service.openSession(dto, mockTenantId, mockUserId)).rejects.toThrow(
          'Validation failed'
        );
      });
    });
  });

  describe('getCurrentSession()', () => {
    it('should return current open session for location', async () => {
      (mockSessionRepository.findCurrentByLocation as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOpenSession
      );

      const result = await service.getCurrentSession(mockLocationId, mockTenantId);

      expect(result).toEqual(mockOpenSession);
      expect(mockSessionRepository.findCurrentByLocation).toHaveBeenCalledWith(mockLocationId);
    });

    it('should return null if no open session', async () => {
      (mockSessionRepository.findCurrentByLocation as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );

      const result = await service.getCurrentSession(mockLocationId, mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('suspendSession()', () => {
    it('should suspend an open session', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOpenSession
      );
      (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockOpenSession, ...data })
      );

      const result = await service.suspendSession(
        mockSessionId,
        'Lunch break',
        mockTenantId,
        mockUserId
      );

      expect(result.status).toBe(CashRegisterStatus.SUSPENDED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_suspended',
          metadata: expect.objectContaining({
            reason: 'Lunch break',
          }),
        })
      );
    });

    it('should suspend with undefined reason', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOpenSession
      );
      (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...mockOpenSession, ...data })
      );

      const result = await service.suspendSession(
        mockSessionId,
        undefined,
        mockTenantId,
        mockUserId
      );

      expect(result.status).toBe(CashRegisterStatus.SUSPENDED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_suspended',
          metadata: expect.objectContaining({
            reason: 'No reason provided',
          }),
        })
      );
    });

    it('should not suspend a closed session', async () => {
      const closedSession = { ...mockOpenSession, status: CashRegisterStatus.CLOSED };
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(closedSession);

      await expect(
        service.suspendSession(mockSessionId, 'Break', mockTenantId, mockUserId)
      ).rejects.toThrow('Can only suspend open sessions');
    });

    it('should throw error on tenant mismatch', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOpenSession
      );

      await expect(
        service.suspendSession(
          mockSessionId,
          'Break',
          '00000000-0000-0000-0000-000000000999',
          mockUserId
        )
      ).rejects.toThrow('Access denied');
    });
  });

  describe('resumeSession()', () => {
    it('should resume a suspended session', async () => {
      const suspendedSession = { ...mockOpenSession, status: CashRegisterStatus.SUSPENDED };
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        suspendedSession
      );
      (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
        async (id, data) => ({ ...suspendedSession, ...data })
      );

      const result = await service.resumeSession(mockSessionId, mockTenantId, mockUserId);

      expect(result.status).toBe(CashRegisterStatus.OPEN);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_resumed',
        })
      );
    });

    it('should not resume an open session', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOpenSession
      );

      await expect(service.resumeSession(mockSessionId, mockTenantId, mockUserId)).rejects.toThrow(
        'Can only resume suspended sessions'
      );
    });
  });

  describe('closeSession()', () => {
    describe('happy path', () => {
      it('should close session without variance', async () => {
        // Session had 50000 opening, and let's say no transactions (expectedBalance = 50000)
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockOpenSession
        );
        (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
          async (id, data) => ({ ...mockOpenSession, ...data })
        );

        const dto: CloseSessionDto = {
          closingBalance: 50000,
        };

        const result = await service.closeSession(mockSessionId, dto, mockTenantId, mockUserId);

        expect(result.status).toBe(CashRegisterStatus.CLOSED);
        expect(result.closingBalance).toBe(50000);
        expect(result.variance).toBe(0);
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'session_closed',
          })
        );
      });

      it('should close session with variance and note', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockOpenSession
        );
        (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockImplementation(
          async (id, data) => ({ ...mockOpenSession, ...data })
        );

        const dto: CloseSessionDto = {
          closingBalance: 49500,
          varianceNote: 'Missing 500 Ft, will investigate',
        };

        const result = await service.closeSession(mockSessionId, dto, mockTenantId, mockUserId);

        expect(result.variance).toBe(-500);
        expect(result.varianceNote).toBe('Missing 500 Ft, will investigate');
      });
    });

    describe('error handling', () => {
      it('should require variance note when variance exists', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockOpenSession
        );

        const dto: CloseSessionDto = {
          closingBalance: 49500, // 500 Ft variance, no note
        };

        await expect(
          service.closeSession(mockSessionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Variance note required when there is a difference');
      });

      it('should not close a suspended session', async () => {
        const suspendedSession = { ...mockOpenSession, status: CashRegisterStatus.SUSPENDED };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          suspendedSession
        );

        const dto: CloseSessionDto = {
          closingBalance: 50000,
        };

        await expect(
          service.closeSession(mockSessionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Can only close open sessions');
      });
    });
  });

  describe('getSessionById()', () => {
    it('should return session by id with tenant check', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOpenSession
      );

      const result = await service.getSessionById(mockSessionId, mockTenantId);

      expect(result).toEqual(mockOpenSession);
    });

    it('should throw error when session not found', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getSessionById(mockSessionId, mockTenantId)).rejects.toThrow(
        'Session not found'
      );
    });

    it('should throw error on tenant mismatch', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOpenSession
      );

      await expect(
        service.getSessionById(mockSessionId, '00000000-0000-0000-0000-000000000999')
      ).rejects.toThrow('Access denied');
    });
  });
});
