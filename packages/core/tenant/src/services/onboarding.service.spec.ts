import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingStatus, OnboardingStep } from '../interfaces/onboarding.interface';
import { DEFAULT_TENANT_SETTINGS, TenantStatus } from '../interfaces/tenant.interface';
import { OnboardingService } from './onboarding.service';

/**
 * TDD Tests for OnboardingService
 * RED phase - ezeknek a teszteknek FAILELNIÜK kell, amíg az implementáció nincs kész
 * Minimum 8 teszt (TDD követelmény)
 */

// Valid UUID v4 format
const VALID_TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const _VALID_SESSION_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';
const _VALID_USER_ID = 'c3d4e5f6-a7b8-4012-9def-123456789012';

// Mock services
const mockTenantService = {
  createTenant: vi.fn(),
  getTenantById: vi.fn(),
};

const mockSchemaService = {
  createTenantSchema: vi.fn(),
  slugToSchemaName: vi.fn((slug: string) => `tenant_${slug.replace(/-/g, '_')}`),
};

const mockRlsService = {
  enableRlsOnAllTables: vi.fn(),
  setTenantContext: vi.fn(),
};

// Mock created tenant
const mockCreatedTenant = {
  id: VALID_TENANT_ID,
  name: 'KGC Szeged',
  slug: 'kgc-szeged',
  status: TenantStatus.PENDING,
  settings: DEFAULT_TENANT_SETTINGS,
  parentTenantId: null,
  schemaName: 'tenant_kgc_szeged',
  schemaCreatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('OnboardingService', () => {
  let onboardingService: OnboardingService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: slug is available (no existing tenant)
    mockTenantService.getTenantById.mockResolvedValue(null);
    onboardingService = new OnboardingService(
      mockTenantService as any,
      mockSchemaService as any,
      mockRlsService as any
    );
  });

  // =========================================
  // START ONBOARDING TESTS (3 tesztek)
  // =========================================
  describe('startOnboarding()', () => {
    it('should create a new onboarding session', async () => {
      const dto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };

      const session = await onboardingService.startOnboarding(dto);

      expect(session.id).toBeDefined();
      expect(session.currentStep).toBe(OnboardingStep.TENANT_INFO);
      expect(session.status).toBe(OnboardingStatus.IN_PROGRESS);
      expect(session.tenantInfo?.name).toBe('KGC Szeged');
    });

    it('should validate tenant info on start', async () => {
      const invalidDto = {
        name: '', // Invalid - empty
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };

      await expect(onboardingService.startOnboarding(invalidDto)).rejects.toThrow();
    });

    it('should validate slug format', async () => {
      const invalidDto = {
        name: 'KGC Szeged',
        slug: 'Invalid Slug!', // Invalid characters
        contactEmail: 'admin@kgc-szeged.hu',
      };

      await expect(onboardingService.startOnboarding(invalidDto)).rejects.toThrow();
    });
  });

  // =========================================
  // UPDATE STEP TESTS (2 tesztek)
  // =========================================
  describe('updateStep()', () => {
    it('should update admin user step', async () => {
      // First start onboarding
      const startDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };
      const session = await onboardingService.startOnboarding(startDto);

      // Update with admin user
      const adminUserDto = {
        name: 'Admin User',
        email: 'admin@kgc-szeged.hu',
        password: 'SecurePass123',
      };

      const updatedSession = await onboardingService.updateStep(
        session.id,
        OnboardingStep.ADMIN_USER,
        adminUserDto
      );

      expect(updatedSession.adminUser?.name).toBe('Admin User');
      expect(updatedSession.currentStep).toBe(OnboardingStep.ADMIN_USER);
    });

    it('should validate admin user password strength', async () => {
      const startDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };
      const session = await onboardingService.startOnboarding(startDto);

      const weakPasswordDto = {
        name: 'Admin User',
        email: 'admin@kgc-szeged.hu',
        password: 'weak', // Too weak
      };

      await expect(
        onboardingService.updateStep(session.id, OnboardingStep.ADMIN_USER, weakPasswordDto)
      ).rejects.toThrow();
    });
  });

  // =========================================
  // COMPLETE ONBOARDING TESTS (3 tesztek)
  // =========================================
  describe('completeOnboarding()', () => {
    it('should complete onboarding and create tenant', async () => {
      // Setup complete session
      const startDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };
      const session = await onboardingService.startOnboarding(startDto);

      await onboardingService.updateStep(session.id, OnboardingStep.ADMIN_USER, {
        name: 'Admin User',
        email: 'admin@kgc-szeged.hu',
        password: 'SecurePass123',
      });

      await onboardingService.updateStep(session.id, OnboardingStep.SETTINGS, {
        timezone: 'Europe/Budapest',
        currency: 'HUF',
        locale: 'hu-HU',
      });

      // Mock successful tenant creation
      mockTenantService.createTenant.mockResolvedValue(mockCreatedTenant);
      mockSchemaService.createTenantSchema.mockResolvedValue(true);
      mockRlsService.enableRlsOnAllTables.mockResolvedValue({ tablesSuccessful: 3 });

      const result = await onboardingService.completeOnboarding(session.id);

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe(VALID_TENANT_ID);
      expect(mockTenantService.createTenant).toHaveBeenCalled();
    });

    it('should fail if session not found', async () => {
      await expect(onboardingService.completeOnboarding('non-existent-session')).rejects.toThrow(
        'Onboarding session nem található'
      );
    });

    it('should fail if required steps not completed', async () => {
      const startDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };
      const session = await onboardingService.startOnboarding(startDto);

      // Try to complete without admin user step
      await expect(onboardingService.completeOnboarding(session.id)).rejects.toThrow(
        'Hiányzó lépések'
      );
    });
  });

  // =========================================
  // PROGRESS TRACKING TESTS (2 tesztek)
  // =========================================
  describe('getProgress()', () => {
    it('should return progress for session', async () => {
      const startDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };
      const session = await onboardingService.startOnboarding(startDto);

      const progress = await onboardingService.getProgress(session.id);

      expect(progress.sessionId).toBe(session.id);
      expect(progress.currentStep).toBe(OnboardingStep.TENANT_INFO);
      expect(progress.percentComplete).toBeGreaterThan(0);
    });

    it('should calculate percentage correctly', async () => {
      const startDto = {
        name: 'KGC Szeged',
        slug: 'kgc-szeged',
        contactEmail: 'admin@kgc-szeged.hu',
      };
      const session = await onboardingService.startOnboarding(startDto);

      await onboardingService.updateStep(session.id, OnboardingStep.ADMIN_USER, {
        name: 'Admin User',
        email: 'admin@kgc-szeged.hu',
        password: 'SecurePass123',
      });

      const progress = await onboardingService.getProgress(session.id);

      // Should be 50% (2 of 4 steps)
      expect(progress.percentComplete).toBe(50);
    });
  });
});
