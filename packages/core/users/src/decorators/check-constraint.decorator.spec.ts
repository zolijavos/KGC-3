/**
 * @CheckConstraint Decorator Tests
 * Story 2.3: Permission Check Middleware
 * AC#4: Constraint Validation Support
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { Permission } from '../interfaces/permission.interface';
import {
  CheckConstraint,
  CONSTRAINT_KEY,
  ConstraintMetadata,
} from './check-constraint.decorator';

describe('CheckConstraint Decorator', () => {
  const reflector = new Reflector();

  describe('Metadata key', () => {
    it('should export CONSTRAINT_KEY as "constraint_check"', () => {
      expect(CONSTRAINT_KEY).toBe('constraint_check');
    });
  });

  describe('Single constraint', () => {
    class TestController {
      @CheckConstraint({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
      })
      applyDiscount() {
        return 'test';
      }
    }

    it('should set constraint metadata on method', () => {
      const metadata = reflector.get<ConstraintMetadata>(
        CONSTRAINT_KEY,
        TestController.prototype.applyDiscount
      );
      expect(metadata).toBeDefined();
      expect(metadata.permission).toBe(Permission.RENTAL_DISCOUNT);
      expect(metadata.constraintKey).toBe('discount_limit');
      expect(metadata.valueField).toBe('discountPercent');
    });
  });

  describe('With custom message', () => {
    class TestControllerWithMessage {
      @CheckConstraint({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discount',
        message: 'Kedvezmény túllépi a megengedett limitet',
      })
      customMessageMethod() {
        return 'test';
      }
    }

    it('should include custom message in metadata', () => {
      const metadata = reflector.get<ConstraintMetadata>(
        CONSTRAINT_KEY,
        TestControllerWithMessage.prototype.customMessageMethod
      );
      expect(metadata.message).toBe('Kedvezmény túllépi a megengedett limitet');
    });
  });

  describe('With absolute value check', () => {
    class TestControllerAbsolute {
      @CheckConstraint({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discountPercent',
        useAbsoluteValue: true,
      })
      absoluteCheckMethod() {
        return 'test';
      }
    }

    it('should include useAbsoluteValue flag in metadata', () => {
      const metadata = reflector.get<ConstraintMetadata>(
        CONSTRAINT_KEY,
        TestControllerAbsolute.prototype.absoluteCheckMethod
      );
      expect(metadata.useAbsoluteValue).toBe(true);
    });
  });

  describe('Decorator returns MethodDecorator', () => {
    it('should return a function that can be applied to methods', () => {
      const decorator = CheckConstraint({
        permission: Permission.RENTAL_DISCOUNT,
        constraintKey: 'discount_limit',
        valueField: 'discount',
      });
      expect(typeof decorator).toBe('function');
    });
  });
});
