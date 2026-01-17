/**
 * @RequireElevatedAccess Decorator Tests
 * Story 2.4: Elevated Access Requirement
 * AC#2: @RequireElevatedAccess Decorator
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import {
  RequireElevatedAccess,
  ELEVATED_ACCESS_KEY,
  ElevatedAccessMetadata,
} from './require-elevated-access.decorator';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

describe('@RequireElevatedAccess Decorator', () => {
  const reflector = new Reflector();

  describe('Metadata key', () => {
    it('should export ELEVATED_ACCESS_KEY constant', () => {
      expect(ELEVATED_ACCESS_KEY).toBeDefined();
      expect(typeof ELEVATED_ACCESS_KEY).toBe('string');
    });

    it('should have correct key value', () => {
      expect(ELEVATED_ACCESS_KEY).toBe('elevated_access');
    });
  });

  describe('Default TTL (5 minutes)', () => {
    class TestControllerDefault {
      @RequireElevatedAccess()
      defaultTtlMethod(): void {
        // Test method with default TTL
      }
    }

    it('should set metadata with default TTL when no argument provided', () => {
      const metadata = reflector.get<ElevatedAccessMetadata>(
        ELEVATED_ACCESS_KEY,
        TestControllerDefault.prototype.defaultTtlMethod
      );

      expect(metadata).toBeDefined();
      expect(metadata?.ttlMs).toBe(ELEVATED_ACCESS_TTL_MS);
      expect(metadata?.ttlMs).toBe(300000); // 5 minutes in ms
    });
  });

  describe('Custom TTL', () => {
    class TestControllerCustom {
      @RequireElevatedAccess(60000) // 1 minute custom TTL
      oneMinuteTtlMethod(): void {}

      @RequireElevatedAccess(120000) // 2 minute custom TTL
      twoMinuteTtlMethod(): void {}
    }

    it('should set metadata with custom TTL (1 minute)', () => {
      const metadata = reflector.get<ElevatedAccessMetadata>(
        ELEVATED_ACCESS_KEY,
        TestControllerCustom.prototype.oneMinuteTtlMethod
      );

      expect(metadata).toBeDefined();
      expect(metadata?.ttlMs).toBe(60000);
    });

    it('should set metadata with custom TTL (2 minutes)', () => {
      const metadata = reflector.get<ElevatedAccessMetadata>(
        ELEVATED_ACCESS_KEY,
        TestControllerCustom.prototype.twoMinuteTtlMethod
      );

      expect(metadata).toBeDefined();
      expect(metadata?.ttlMs).toBe(120000);
    });
  });

  describe('No decorator', () => {
    class TestControllerNoDecorator {
      noDecoratorMethod(): void {}
    }

    it('should not have metadata on non-decorated method', () => {
      const metadata = reflector.get<ElevatedAccessMetadata>(
        ELEVATED_ACCESS_KEY,
        TestControllerNoDecorator.prototype.noDecoratorMethod
      );

      expect(metadata).toBeUndefined();
    });
  });

  describe('Metadata structure', () => {
    class TestControllerStructure {
      @RequireElevatedAccess()
      testMethod(): void {}
    }

    it('should have correct ElevatedAccessMetadata structure', () => {
      const metadata = reflector.get<ElevatedAccessMetadata>(
        ELEVATED_ACCESS_KEY,
        TestControllerStructure.prototype.testMethod
      );

      expect(metadata).toBeDefined();
      expect(typeof metadata?.ttlMs).toBe('number');
      expect(metadata?.ttlMs).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    class TestControllerEdgeCases {
      @RequireElevatedAccess(1000) // 1 second (minimum valid)
      minTtlMethod(): void {}

      @RequireElevatedAccess(60 * 60 * 1000) // 1 hour (maximum valid)
      maxTtlMethod(): void {}
    }

    it('should work with minimum valid TTL (1 second)', () => {
      const metadata = reflector.get<ElevatedAccessMetadata>(
        ELEVATED_ACCESS_KEY,
        TestControllerEdgeCases.prototype.minTtlMethod
      );

      expect(metadata).toBeDefined();
      expect(metadata?.ttlMs).toBe(1000);
    });

    it('should work with maximum valid TTL (1 hour)', () => {
      const metadata = reflector.get<ElevatedAccessMetadata>(
        ELEVATED_ACCESS_KEY,
        TestControllerEdgeCases.prototype.maxTtlMethod
      );

      expect(metadata).toBeDefined();
      expect(metadata?.ttlMs).toBe(60 * 60 * 1000);
    });

    it('should throw error for TTL below minimum (0ms)', () => {
      expect(() => RequireElevatedAccess(0)).toThrow(
        'RequireElevatedAccess: TTL must be at least 1000ms (1 second), got 0ms'
      );
    });

    it('should throw error for negative TTL (-1000ms)', () => {
      expect(() => RequireElevatedAccess(-1000)).toThrow(
        'RequireElevatedAccess: TTL must be at least 1000ms (1 second), got -1000ms'
      );
    });

    it('should throw error for TTL above maximum (2 hours)', () => {
      const twoHours = 2 * 60 * 60 * 1000;
      expect(() => RequireElevatedAccess(twoHours)).toThrow(
        `RequireElevatedAccess: TTL must not exceed ${60 * 60 * 1000}ms (1 hour), got ${twoHours}ms`
      );
    });
  });

  describe('Decorator returns MethodDecorator', () => {
    it('should return a function that can be applied to methods', () => {
      const decorator = RequireElevatedAccess();
      expect(typeof decorator).toBe('function');
    });

    it('should return a function with custom TTL', () => {
      const decorator = RequireElevatedAccess(60000);
      expect(typeof decorator).toBe('function');
    });

    it('should work as method decorator when applied', () => {
      const decorator = RequireElevatedAccess();
      const descriptor: PropertyDescriptor = {
        value: function () {},
        writable: true,
        enumerable: false,
        configurable: true,
      };
      const target = {};
      const key = 'testMethod';

      const result = decorator(target, key, descriptor);
      expect(result).toBeDefined();
    });
  });
});
