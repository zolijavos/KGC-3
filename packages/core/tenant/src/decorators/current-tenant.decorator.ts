import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Tenant } from '../interfaces/tenant.interface';

/**
 * @CurrentTenant() Param Decorator
 * Retrieves the current tenant from the request object
 *
 * Usage:
 * ```typescript
 * @Get('data')
 * getData(@CurrentTenant() tenant: Tenant) {
 *   return this.service.getData(tenant.id);
 * }
 *
 * // Or get specific property
 * @Get('data')
 * getData(@CurrentTenant('id') tenantId: string) {
 *   return this.service.getData(tenantId);
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: keyof Tenant | undefined, ctx: ExecutionContext): Tenant | unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenant = request.tenant;

    if (!tenant) {
      return undefined;
    }

    // If specific property requested, return just that
    if (data) {
      return tenant[data];
    }

    // Return full tenant object
    return tenant;
  }
);
