/**
 * @RequireScope Decorator Tests
 * Story 2.5: Tenant és Location Scoped Permissions
 * AC#2: @RequireScope Decorator
 *
 * TDD Red-Green-Refactor approach
 */

import { describe, it, expect } from 'vitest';
import { RoleScope } from '../interfaces/permission.interface';
import {
  RequireScope,
  SCOPE_REQUIREMENT_KEY,
  ScopeRequirementMetadata,
} from './require-scope.decorator';

describe('@RequireScope Decorator', () => {
  describe('SCOPE_REQUIREMENT_KEY', () => {
    it('should be defined as string constant', () => {
      expect(SCOPE_REQUIREMENT_KEY).toBe('scope_requirement');
    });
  });

  describe('RequireScope()', () => {
    it('should set metadata with minimumScope only', () => {
      // Create a test class to apply decorator
      class TestController {
        @RequireScope(RoleScope.LOCATION)
        testMethod() {
          return 'test';
        }
      }

      // Get metadata from the method
      const metadata = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.testMethod
      ) as ScopeRequirementMetadata;

      expect(metadata).toBeDefined();
      expect(metadata.minimumScope).toBe(RoleScope.LOCATION);
      expect(metadata.resourceIdParam).toBeUndefined();
      expect(metadata.allowGlobalWrite).toBe(false);
    });

    it('should set metadata with TENANT scope', () => {
      class TestController {
        @RequireScope(RoleScope.TENANT)
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.testMethod
      ) as ScopeRequirementMetadata;

      expect(metadata.minimumScope).toBe(RoleScope.TENANT);
    });

    it('should set metadata with GLOBAL scope', () => {
      class TestController {
        @RequireScope(RoleScope.GLOBAL)
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.testMethod
      ) as ScopeRequirementMetadata;

      expect(metadata.minimumScope).toBe(RoleScope.GLOBAL);
    });

    it('should set resourceIdParam when provided', () => {
      class TestController {
        @RequireScope(RoleScope.LOCATION, { resourceIdParam: 'id' })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.testMethod
      ) as ScopeRequirementMetadata;

      expect(metadata.minimumScope).toBe(RoleScope.LOCATION);
      expect(metadata.resourceIdParam).toBe('id');
      expect(metadata.allowGlobalWrite).toBe(false);
    });

    it('should set allowGlobalWrite when provided as true', () => {
      class TestController {
        @RequireScope(RoleScope.TENANT, { allowGlobalWrite: true })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.testMethod
      ) as ScopeRequirementMetadata;

      expect(metadata.minimumScope).toBe(RoleScope.TENANT);
      expect(metadata.allowGlobalWrite).toBe(true);
    });

    it('should set allowGlobalWrite to false by default', () => {
      class TestController {
        @RequireScope(RoleScope.GLOBAL, { resourceIdParam: 'tenantId' })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.testMethod
      ) as ScopeRequirementMetadata;

      expect(metadata.allowGlobalWrite).toBe(false);
    });

    it('should set all options together', () => {
      class TestController {
        @RequireScope(RoleScope.LOCATION, {
          resourceIdParam: 'locationId',
          allowGlobalWrite: true,
        })
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.testMethod
      ) as ScopeRequirementMetadata;

      expect(metadata.minimumScope).toBe(RoleScope.LOCATION);
      expect(metadata.resourceIdParam).toBe('locationId');
      expect(metadata.allowGlobalWrite).toBe(true);
    });

    it('should work with multiple decorators on different methods', () => {
      class TestController {
        @RequireScope(RoleScope.LOCATION)
        methodA() {
          return 'a';
        }

        @RequireScope(RoleScope.TENANT, { resourceIdParam: 'id' })
        methodB() {
          return 'b';
        }

        @RequireScope(RoleScope.GLOBAL, { allowGlobalWrite: true })
        methodC() {
          return 'c';
        }
      }

      const metadataA = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.methodA
      ) as ScopeRequirementMetadata;

      const metadataB = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.methodB
      ) as ScopeRequirementMetadata;

      const metadataC = Reflect.getMetadata(
        SCOPE_REQUIREMENT_KEY,
        TestController.prototype.methodC
      ) as ScopeRequirementMetadata;

      expect(metadataA.minimumScope).toBe(RoleScope.LOCATION);
      expect(metadataB.minimumScope).toBe(RoleScope.TENANT);
      expect(metadataB.resourceIdParam).toBe('id');
      expect(metadataC.minimumScope).toBe(RoleScope.GLOBAL);
      expect(metadataC.allowGlobalWrite).toBe(true);
    });
  });

  describe('ScopeRequirementMetadata interface', () => {
    it('should have correct shape', () => {
      const metadata: ScopeRequirementMetadata = {
        minimumScope: RoleScope.LOCATION,
        resourceIdParam: 'id',
        allowGlobalWrite: false,
      };

      expect(metadata.minimumScope).toBe(RoleScope.LOCATION);
      expect(metadata.resourceIdParam).toBe('id');
      expect(metadata.allowGlobalWrite).toBe(false);
    });

    it('should allow optional fields to be undefined', () => {
      const metadata: ScopeRequirementMetadata = {
        minimumScope: RoleScope.TENANT,
      };

      expect(metadata.minimumScope).toBe(RoleScope.TENANT);
      expect(metadata.resourceIdParam).toBeUndefined();
      expect(metadata.allowGlobalWrite).toBeUndefined();
    });
  });
});
