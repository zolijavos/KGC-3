import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from '../services/feature-flag.service';
import { FeatureFlag } from '../interfaces/feature-flag.interface';
import { Tenant } from '../interfaces/tenant.interface';

export const FEATURE_FLAG_KEY = 'required_feature';

/**
 * Request interface with tenant
 */
interface RequestWithTenant extends Request {
  tenant?: Tenant;
}

/**
 * RequireFeatureGuard - Enforces feature flag requirements on routes
 * @kgc/tenant - Feature flag access control
 *
 * Usage:
 * @RequireFeature(FeatureFlag.BERLES)
 * @Controller('berles')
 * export class BerlesController { ... }
 */
@Injectable()
export class RequireFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required feature from decorator metadata
    const requiredFeature = this.reflector.getAllAndOverride<FeatureFlag>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()]
    );

    // No feature requirement - allow access
    if (!requiredFeature) {
      return true;
    }

    // Get tenant from request
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const tenant = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('Tenant azonosítás szükséges');
    }

    // Check if feature is enabled
    const isEnabled = await this.featureFlagService.isFeatureEnabled(
      tenant.id,
      requiredFeature
    );

    if (!isEnabled) {
      throw new ForbiddenException(
        `A(z) "${requiredFeature}" funkció nincs engedélyezve a tenant számára`
      );
    }

    return true;
  }
}
