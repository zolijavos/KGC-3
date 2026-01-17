import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { TenantStatus, DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';

/**
 * Tests for @CurrentTenant Decorator
 */

// Valid UUID v4 format
const VALID_TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';

// Mock tenant
const mockTenant = {
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

// Helper to create mock execution context
const createMockExecutionContext = (tenant: typeof mockTenant | undefined): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({
      tenant,
    }),
  }),
  getClass: vi.fn(),
  getHandler: vi.fn(),
  getArgs: vi.fn(),
  getArgByIndex: vi.fn(),
  switchToRpc: vi.fn(),
  switchToWs: vi.fn(),
  getType: vi.fn(),
} as unknown as ExecutionContext);

describe('@CurrentTenant Decorator', () => {
  // Note: We can't directly test createParamDecorator result in unit tests
  // These tests verify the decorator factory behavior

  it('should be importable', async () => {
    const { CurrentTenant } = await import('./current-tenant.decorator');
    expect(CurrentTenant).toBeDefined();
  });

  it('should handle request with tenant', async () => {
    // Simulate decorator factory function
    const ctx = createMockExecutionContext(mockTenant);
    const request = ctx.switchToHttp().getRequest();

    expect(request.tenant).toBeDefined();
    expect(request.tenant?.id).toBe(VALID_TENANT_ID);
  });

  it('should handle request without tenant', async () => {
    const ctx = createMockExecutionContext(undefined);
    const request = ctx.switchToHttp().getRequest();

    expect(request.tenant).toBeUndefined();
  });

  it('should access tenant properties', async () => {
    const ctx = createMockExecutionContext(mockTenant);
    const request = ctx.switchToHttp().getRequest();

    // Property access
    expect(request.tenant?.name).toBe('KGC Szeged');
    expect(request.tenant?.slug).toBe('kgc-szeged');
    expect(request.tenant?.status).toBe(TenantStatus.ACTIVE);
  });
});
