import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';

/**
 * TDD Tests for TenantContextMiddleware
 * RED phase - ezeknek a teszteknek FAILELNIÜK kell, amíg az implementáció nincs kész
 * Minimum 8 teszt (TDD követelmény)
 */

// Valid UUID v4 format
const VALID_TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

// Mock tenant
const mockActiveTenant = {
  id: VALID_TENANT_ID,
  name: 'KGC Szeged',
  slug: 'kgc-szeged',
  status: TenantStatus.ACTIVE,
  settings: DEFAULT_TENANT_SETTINGS,
  parentTenantId: null,
  schemaName: 'tenant_kgc_szeged',
  schemaCreatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockInactiveTenant = {
  ...mockActiveTenant,
  status: TenantStatus.INACTIVE,
};

// Mock services
const mockRlsService = {
  setTenantContext: vi.fn(),
  clearTenantContext: vi.fn(),
};

const mockTenantService = {
  getTenantById: vi.fn(),
};

// Mock Express objects
const createMockRequest = (options: {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  user?: { tenantId?: string };
}) => ({
  headers: options.headers ?? {},
  query: options.query ?? {},
  user: options.user,
  tenant: undefined as any,
});

const createMockResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
});

const createMockNext = () => vi.fn();

describe('TenantContextMiddleware', () => {
  let middleware: TenantContextMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    middleware = new TenantContextMiddleware(
      mockRlsService as any,
      mockTenantService as any
    );
  });

  // =========================================
  // TENANT EXTRACTION TESTS (3 tesztek)
  // =========================================
  describe('Tenant Extraction', () => {
    it('should extract tenant_id from x-tenant-id header', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(mockActiveTenant);
      mockRlsService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req as any, res as any, next);

      expect(mockRlsService.setTenantContext).toHaveBeenCalledWith(VALID_TENANT_ID);
      expect(next).toHaveBeenCalled();
    });

    it('should extract tenant_id from JWT user payload', async () => {
      const req = createMockRequest({
        user: { tenantId: VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(mockActiveTenant);
      mockRlsService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req as any, res as any, next);

      expect(mockRlsService.setTenantContext).toHaveBeenCalledWith(VALID_TENANT_ID);
    });

    it('should extract tenant_id from query parameter', async () => {
      const req = createMockRequest({
        query: { tenantId: VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(mockActiveTenant);
      mockRlsService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req as any, res as any, next);

      expect(mockRlsService.setTenantContext).toHaveBeenCalledWith(VALID_TENANT_ID);
    });
  });

  // =========================================
  // VALIDATION TESTS (3 tesztek)
  // =========================================
  describe('Tenant Validation', () => {
    it('should throw 400 if tenant_id is missing', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();

      await expect(middleware.use(req as any, res as any, next))
        .rejects.toThrow('Tenant azonosító szükséges');
    });

    it('should throw 400 for invalid UUID format', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': 'invalid-uuid' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await expect(middleware.use(req as any, res as any, next))
        .rejects.toThrow('Érvénytelen tenant ID formátum');
    });

    it('should throw 403 for inactive tenant', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(mockInactiveTenant);

      await expect(middleware.use(req as any, res as any, next))
        .rejects.toThrow('Tenant nem elérhető');
    });
  });

  // =========================================
  // CONTEXT SETTING TESTS (2 tesztek)
  // =========================================
  describe('Context Setting', () => {
    it('should set RLS context with valid tenant', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(mockActiveTenant);
      mockRlsService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req as any, res as any, next);

      expect(mockRlsService.setTenantContext).toHaveBeenCalledWith(VALID_TENANT_ID);
      expect(req.tenant).toEqual(mockActiveTenant);
    });

    it('should attach tenant to request object', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(mockActiveTenant);
      mockRlsService.setTenantContext.mockResolvedValue(undefined);

      await middleware.use(req as any, res as any, next);

      expect(req.tenant).toBeDefined();
      expect(req.tenant.id).toBe(VALID_TENANT_ID);
    });
  });

  // =========================================
  // ERROR HANDLING TESTS (2 tesztek)
  // =========================================
  describe('Error Handling', () => {
    it('should throw 404 if tenant not found', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(null);

      await expect(middleware.use(req as any, res as any, next))
        .rejects.toThrow('Tenant nem található');
    });

    it('should propagate RLS service errors', async () => {
      const req = createMockRequest({
        headers: { 'x-tenant-id': VALID_TENANT_ID },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockTenantService.getTenantById.mockResolvedValue(mockActiveTenant);
      mockRlsService.setTenantContext.mockRejectedValue(new Error('DB error'));

      await expect(middleware.use(req as any, res as any, next))
        .rejects.toThrow('DB error');
    });
  });
});
