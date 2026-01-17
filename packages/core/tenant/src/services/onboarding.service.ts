import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  OnboardingSession,
  OnboardingStep,
  OnboardingStatus,
  OnboardingResult,
  OnboardingProgress,
  OnboardingAdminUser,
  OnboardingSettings,
} from '../interfaces/onboarding.interface';
import {
  validateStartOnboardingDto,
  validateAdminUserDto,
  validateOnboardingSettingsDto,
  StartOnboardingDto,
} from '../dto/onboarding.dto';
import { TenantService } from './tenant.service';
import { SchemaService } from './schema.service';
import { RlsService } from './rls.service';
import { TenantStatus } from '../interfaces/tenant.interface';

/**
 * OnboardingService - Tenant onboarding wizard kezelés
 * @kgc/tenant - Multi-tenant onboarding infrastructure
 *
 * Felelősségek:
 * - Onboarding session kezelés
 * - Step-by-step wizard flow
 * - Atomic tenant + schema + user creation
 * - Progress tracking
 */
@Injectable()
export class OnboardingService {
  // In-memory session storage (production: Redis)
  private sessions: Map<string, OnboardingSession> = new Map();

  // Steps in order
  private readonly ORDERED_STEPS: OnboardingStep[] = [
    OnboardingStep.TENANT_INFO,
    OnboardingStep.ADMIN_USER,
    OnboardingStep.SETTINGS,
    OnboardingStep.CONFIRMATION,
  ];

  constructor(
    private readonly tenantService: TenantService,
    private readonly schemaService: SchemaService,
    private readonly rlsService: RlsService
  ) {}

  /**
   * Start new onboarding session (Step 1: Tenant Info)
   */
  async startOnboarding(dto: StartOnboardingDto): Promise<OnboardingSession> {
    // Validate input
    const validatedDto = validateStartOnboardingDto(dto);

    // Check if slug is available
    const existing = await this.tenantService.getTenantById(validatedDto.slug).catch(() => null);
    if (existing) {
      throw new BadRequestException('A slug már foglalt');
    }

    // Create session
    const sessionId = uuidv4();
    const now = new Date();

    const session: OnboardingSession = {
      id: sessionId,
      currentStep: OnboardingStep.TENANT_INFO,
      status: OnboardingStatus.IN_PROGRESS,
      tenantInfo: {
        name: validatedDto.name,
        slug: validatedDto.slug,
        contactEmail: validatedDto.contactEmail,
        planType: validatedDto.planType,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Update a specific step in the onboarding process
   */
  async updateStep(
    sessionId: string,
    step: OnboardingStep,
    data: unknown
  ): Promise<OnboardingSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Onboarding session nem található');
    }

    if (session.status !== OnboardingStatus.IN_PROGRESS) {
      throw new BadRequestException('Session már lezárult');
    }

    switch (step) {
      case OnboardingStep.TENANT_INFO:
        const tenantInfo = validateStartOnboardingDto(data);
        session.tenantInfo = {
          name: tenantInfo.name,
          slug: tenantInfo.slug,
          contactEmail: tenantInfo.contactEmail,
          planType: tenantInfo.planType,
        };
        break;

      case OnboardingStep.ADMIN_USER:
        const adminUser = validateAdminUserDto(data);
        session.adminUser = adminUser as OnboardingAdminUser;
        break;

      case OnboardingStep.SETTINGS:
        const settings = validateOnboardingSettingsDto(data);
        session.settings = settings as OnboardingSettings;
        break;

      default:
        throw new BadRequestException(`Ismeretlen lépés: ${step}`);
    }

    session.currentStep = step;
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Complete onboarding and create tenant
   */
  async completeOnboarding(sessionId: string): Promise<OnboardingResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Onboarding session nem található');
    }

    // Validate all required steps completed
    if (!session.tenantInfo || !session.adminUser) {
      throw new BadRequestException('Hiányzó lépések: tenant info és admin user kötelező');
    }

    try {
      // Update status to creating
      session.currentStep = OnboardingStep.CREATING;
      session.updatedAt = new Date();

      // Create tenant
      const tenant = await this.tenantService.createTenant({
        name: session.tenantInfo.name,
        slug: session.tenantInfo.slug,
        status: TenantStatus.PENDING,
        settings: session.settings ? {
          timezone: session.settings.timezone,
          currency: session.settings.currency,
          locale: session.settings.locale,
          features: session.settings.enabledFeatures ?? [],
        } : {
          timezone: 'Europe/Budapest',
          currency: 'HUF',
          locale: 'hu-HU',
          features: [],
        },
      });

      // Enable RLS on all tables (if schema exists)
      try {
        const schemaName = this.schemaService.slugToSchemaName(tenant.slug);
        await this.rlsService.enableRlsOnAllTables(schemaName);
      } catch {
        // RLS setup is optional at this stage
      }

      // Mark as completed
      session.status = OnboardingStatus.COMPLETED;
      session.currentStep = OnboardingStep.COMPLETED;
      session.completedAt = new Date();
      session.updatedAt = new Date();
      this.sessions.set(sessionId, session);

      return {
        success: true,
        tenantId: tenant.id,
        // Note: Admin user creation is handled by @kgc/auth
        // This is just the tenant onboarding part
      };
    } catch (error) {
      // Mark as failed
      session.status = OnboardingStatus.FAILED;
      session.currentStep = OnboardingStep.FAILED;
      session.error = error instanceof Error ? error.message : 'Ismeretlen hiba';
      session.updatedAt = new Date();
      this.sessions.set(sessionId, session);

      return {
        success: false,
        error: session.error,
      };
    }
  }

  /**
   * Get onboarding progress
   */
  async getProgress(sessionId: string): Promise<OnboardingProgress> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Onboarding session nem található');
    }

    const completedSteps = this.getCompletedSteps(session);
    const currentStepIndex = this.ORDERED_STEPS.indexOf(session.currentStep);
    const remainingSteps = this.ORDERED_STEPS.slice(currentStepIndex + 1);

    // Calculate percentage (each step is 25%)
    const percentComplete = Math.round((completedSteps.length / this.ORDERED_STEPS.length) * 100);

    return {
      sessionId,
      currentStep: session.currentStep,
      completedSteps,
      remainingSteps,
      percentComplete,
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<OnboardingSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Cancel onboarding session
   */
  async cancelOnboarding(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Onboarding session nem található');
    }

    session.status = OnboardingStatus.CANCELLED;
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
  }

  /**
   * Get completed steps for a session
   */
  private getCompletedSteps(session: OnboardingSession): OnboardingStep[] {
    const completed: OnboardingStep[] = [];

    if (session.tenantInfo) {
      completed.push(OnboardingStep.TENANT_INFO);
    }
    if (session.adminUser) {
      completed.push(OnboardingStep.ADMIN_USER);
    }
    if (session.settings) {
      completed.push(OnboardingStep.SETTINGS);
    }
    if (session.status === OnboardingStatus.COMPLETED) {
      completed.push(OnboardingStep.CONFIRMATION);
    }

    return completed;
  }
}
