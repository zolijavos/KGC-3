/**
 * ConstraintInterceptor - Validates constraint limits at runtime
 * Story 2.3: Permission Check Middleware
 * AC#4: Constraint Validation Support
 *
 * Validates that request values don't exceed role-specific constraint limits.
 * Works with @CheckConstraint decorator to enforce limits (e.g., ±20% discount).
 *
 * @example
 * // Controller
 * @Post(':id/discount')
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @UseInterceptors(ConstraintInterceptor)
 * @RequirePermission(Permission.RENTAL_DISCOUNT)
 * @CheckConstraint({
 *   permission: Permission.RENTAL_DISCOUNT,
 *   constraintKey: 'discount_limit',
 *   valueField: 'discountPercent',
 *   useAbsoluteValue: true,
 * })
 * async applyDiscount(@Body() dto: DiscountDto) { ... }
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Role } from '../interfaces/user.interface';
import { PermissionService } from '../services/permission.service';
import {
  CONSTRAINT_KEY,
  ConstraintMetadata,
} from '../decorators/check-constraint.decorator';

/**
 * User object structure expected from JWT/AuthGuard
 */
interface AuthenticatedUser {
  id: string;
  role: Role;
  tenantId: string;
}

/**
 * Request with authenticated user and body
 */
interface AuthenticatedRequest {
  user: AuthenticatedUser | null | undefined;
  body: Record<string, unknown>;
  url: string;
}

@Injectable()
export class ConstraintInterceptor implements NestInterceptor {
  /**
   * C1v2 FIX: PermissionService now injected via DI instead of manual instantiation
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 1. Get constraint metadata from decorator
    const constraintMetadata = this.reflector.get<ConstraintMetadata | undefined>(
      CONSTRAINT_KEY,
      context.getHandler()
    );

    // No constraint check - proceed
    if (!constraintMetadata) {
      return next.handle();
    }

    // 2. Get user from request
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Check if user exists
    if (!user || !user.role) {
      throw new ForbiddenException({
        code: 'CONSTRAINT_EXCEEDED',
        message: 'Nincs bejelentkezett felhasználó',
      });
    }

    // 3. Get value from request body
    const { permission, constraintKey, valueField, useAbsoluteValue, message } =
      constraintMetadata;
    const rawValue = request.body[valueField];

    // If value field is not present, skip constraint check
    if (rawValue === undefined || rawValue === null) {
      return next.handle();
    }

    // 4. Get constraint limit for user's role
    const constraintLimit = this.permissionService.getConstraint(
      user.role,
      permission,
      constraintKey
    );

    // If no constraint defined for this role/permission, allow access
    if (constraintLimit === undefined) {
      return next.handle();
    }

    // 5. Check if value exceeds constraint
    const numericValue = Number(rawValue);
    const checkValue = useAbsoluteValue ? Math.abs(numericValue) : numericValue;

    if (checkValue > constraintLimit) {
      const errorMessage =
        message ??
        `Érték túllépi a megengedett limitet: maximum ±${constraintLimit}%`;

      throw new ForbiddenException({
        code: 'CONSTRAINT_EXCEEDED',
        message: errorMessage,
        constraint: constraintKey,
        limit: constraintLimit,
        value: numericValue,
      });
    }

    // Constraint satisfied - proceed
    return next.handle();
  }
}
