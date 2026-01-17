/**
 * ConstraintInterceptor Tests
 * Story 2.3: Permission Check Middleware
 * AC#4: Constraint Validation Support
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ConstraintInterceptor } from './constraint.interceptor';
import { Permission } from '../interfaces/permission.interface';
import { Role } from '../interfaces/user.interface';
import { CONSTRAINT_KEY, ConstraintMetadata } from '../decorators/check-constraint.decorator';

// Mock ExecutionContext factory
function createMockExecutionContext(
  user: { id: string; role: Role; tenantId: string } | null,
  body: Record<string, unknown> = {}
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        body,
        url: '/api/v1/test',
      }),
    }),
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

// Mock Reflector factory
function createMockReflector(
  constraintMetadata: ConstraintMetadata | undefined
): Reflector {
  return {
    get: vi.fn((key: string) => {
      if (key === CONSTRAINT_KEY) return constraintMetadata;
      return undefined;
    }),
  } as unknown as Reflector;
}

// Mock CallHandler
function createMockCallHandler(): CallHandler {
  return {
    handle: vi.fn().mockReturnValue(of({ success: true })),
  };
}

describe('ConstraintInterceptor', () => {
  let interceptor: ConstraintInterceptor;
  let mockReflector: Reflector;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallHandler = createMockCallHandler();
  });

  describe('No constraint metadata', () => {
    it('should proceed when no @CheckConstraint decorator is present', () => {
      // Arrange
      mockReflector = createMockReflector(undefined);
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.OPERATOR, tenantId: 'tenant-1' },
        { discountPercent: 50 }
      );

      // Act
      const result = interceptor.intercept(context, mockCallHandler);

      // Assert
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('Constraint within limit', () => {
    it('should allow when value is within constraint limit', () => {
      // Arrange - BOLTVEZETO has discount_limit: 20
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { discountPercent: 15 } // 15% < 20% limit
      );

      // Act
      const result = interceptor.intercept(context, mockCallHandler);

      // Assert
      expect(result).toBeDefined();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should allow when value equals constraint limit', () => {
      // Arrange
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { discountPercent: 20 } // 20% = 20% limit (exact)
      );

      // Act
      const result = interceptor.intercept(context, mockCallHandler);

      // Assert
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('Constraint exceeded', () => {
    it('should throw ForbiddenException when value exceeds constraint limit', () => {
      // Arrange - BOLTVEZETO has discount_limit: 20
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { discountPercent: 25 } // 25% > 20% limit
      );

      // Act & Assert
      expect(() => interceptor.intercept(context, mockCallHandler)).toThrow(
        ForbiddenException
      );
    });

    it('should include limit in error message', () => {
      // Arrange
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { discountPercent: 30 }
      );

      // Act & Assert
      try {
        interceptor.intercept(context, mockCallHandler);
        expect.fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          code: 'CONSTRAINT_EXCEEDED',
          message: expect.stringContaining('20'),
        });
      }
    });
  });

  describe('Negative values with absolute check', () => {
    it('should check absolute value when useAbsoluteValue is true', () => {
      // Arrange - negative discount should use absolute value for check
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { discountPercent: -25 } // |-25| = 25 > 20% limit
      );

      // Act & Assert
      expect(() => interceptor.intercept(context, mockCallHandler)).toThrow(
        ForbiddenException
      );
    });

    it('should allow negative value within limit when using absolute value', () => {
      // Arrange
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { discountPercent: -15 } // |-15| = 15 < 20% limit
      );

      // Act
      const result = interceptor.intercept(context, mockCallHandler);

      // Assert
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('Custom error message', () => {
    it('should use custom message when provided', () => {
      // Arrange
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
        message: 'Egyedi hibaüzenet a kedvezményhez',
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { discountPercent: 50 }
      );

      // Act & Assert
      try {
        interceptor.intercept(context, mockCallHandler);
        expect.fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          message: expect.stringContaining('Egyedi hibaüzenet'),
        });
      }
    });
  });

  describe('Role with higher limit', () => {
    it('should use higher limit for PARTNER_OWNER (100%)', () => {
      // Arrange - PARTNER_OWNER has discount_limit: 100
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.PARTNER_OWNER, tenantId: 'tenant-1' },
        { discountPercent: 75 } // 75% < 100% limit
      );

      // Act
      const result = interceptor.intercept(context, mockCallHandler);

      // Assert
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('Missing user', () => {
    it('should throw ForbiddenException when user is not present', () => {
      // Arrange
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(null, { discountPercent: 10 });

      // Act & Assert
      expect(() => interceptor.intercept(context, mockCallHandler)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('Missing value field in body', () => {
    it('should proceed when value field is not in request body', () => {
      // Arrange - no discountPercent in body
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.BOLTVEZETO, tenantId: 'tenant-1' },
        { someOtherField: 'value' } // No discountPercent
      );

      // Act
      const result = interceptor.intercept(context, mockCallHandler);

      // Assert
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });

  describe('No constraint for role', () => {
    it('should allow access when role has permission but no constraint defined', () => {
      // Arrange - OPERATOR has RENTAL_VIEW but no constraint for it
      mockReflector = createMockReflector({
        permission: Permission.RENTAL_VIEW,
        constraintKey: 'some_limit',
        valueField: 'someValue',
      });
      interceptor = new ConstraintInterceptor(mockReflector);
      const context = createMockExecutionContext(
        { id: 'user-1', role: Role.OPERATOR, tenantId: 'tenant-1' },
        { someValue: 1000 }
      );

      // Act
      const result = interceptor.intercept(context, mockCallHandler);

      // Assert - should allow because no constraint is defined for this permission/role
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });
});
