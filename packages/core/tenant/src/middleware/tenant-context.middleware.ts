import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { validate as isValidUuid } from 'uuid';
import { RlsService } from '../services/rls.service';
import { TenantService } from '../services/tenant.service';
import { Tenant, TenantStatus } from '../interfaces/tenant.interface';

/**
 * Express request tenant extension
 */
declare module 'express' {
  interface Request {
    tenant?: Tenant;
    user?: { tenantId?: string };
  }
}

/**
 * TenantContextMiddleware - Automatikus tenant context beállítás
 * @kgc/tenant - Multi-tenant request handling
 *
 * Felelősségek:
 * - Tenant ID kinyerés (header, JWT, query)
 * - Tenant validálás (létezik, aktív)
 * - RLS context beállítás
 * - Tenant hozzáadása request-hez
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly rlsService: RlsService,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Middleware use method
   */
  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // 1. Extract tenant ID from various sources
    const tenantId = this.extractTenantId(req);

    // 2. Validate tenant ID is present
    if (!tenantId) {
      throw new BadRequestException('Tenant azonosító szükséges');
    }

    // 3. Validate UUID format
    if (!isValidUuid(tenantId)) {
      throw new BadRequestException('Érvénytelen tenant ID formátum');
    }

    // 4. Get tenant from database
    const tenant = await this.tenantService.getTenantById(tenantId);

    // 5. Validate tenant exists
    if (!tenant) {
      throw new NotFoundException('Tenant nem található');
    }

    // 6. Validate tenant is active
    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException('Tenant nem elérhető');
    }

    // 7. Set RLS context
    await this.rlsService.setTenantContext(tenantId);

    // 8. Attach tenant to request for decorators
    req.tenant = tenant;

    // 9. Continue to next middleware/handler
    next();
  }

  /**
   * Extract tenant ID from request
   * Priority: 1. Header, 2. JWT user, 3. Query param
   */
  private extractTenantId(req: Request): string | undefined {
    // 1. Check x-tenant-id header
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId && typeof headerTenantId === 'string') {
      return headerTenantId;
    }

    // 2. Check JWT user payload
    const user = req.user as { tenantId?: string } | undefined;
    if (user?.tenantId) {
      return user.tenantId;
    }

    // 3. Check query parameter
    const queryTenantId = req.query.tenantId;
    if (queryTenantId && typeof queryTenantId === 'string') {
      return queryTenantId;
    }

    return undefined;
  }
}
