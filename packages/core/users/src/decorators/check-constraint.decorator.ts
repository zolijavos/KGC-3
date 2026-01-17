/**
 * @CheckConstraint Decorator
 * Story 2.3: Permission Check Middleware
 * AC#4: Constraint Validation Support
 *
 * Decorator to specify constraint validation for endpoint parameters.
 * Used with ConstraintInterceptor to validate values against role constraints.
 *
 * @example
 * @Post(':id/discount')
 * @RequirePermission(Permission.RENTAL_DISCOUNT)
 * @CheckConstraint({
 *   permission: Permission.RENTAL_DISCOUNT,
 *   constraintKey: 'discount_limit',
 *   valueField: 'discountPercent',
 *   useAbsoluteValue: true,
 * })
 * async applyDiscount(@Body() dto: DiscountDto) { ... }
 */

import { SetMetadata } from '@nestjs/common';
import { Permission } from '../interfaces/permission.interface';

/** Metadata key for storing constraint check configuration */
export const CONSTRAINT_KEY = 'constraint_check';

/**
 * Constraint metadata configuration
 */
export interface ConstraintMetadata {
  /** Permission that has the constraint */
  permission: Permission;
  /** Constraint key to check (e.g., 'discount_limit') */
  constraintKey: string;
  /** Field in request body to validate */
  valueField: string;
  /** Use absolute value for comparison (for ±X% scenarios) */
  useAbsoluteValue?: boolean;
  /** Custom error message */
  message?: string;
}

/**
 * @CheckConstraint decorator
 * Marks a method to have constraint validation based on user role
 *
 * @param metadata - Constraint validation configuration
 */
export function CheckConstraint(metadata: ConstraintMetadata): MethodDecorator {
  return SetMetadata(CONSTRAINT_KEY, metadata);
}
