/**
 * @RequirePermission Decorator Tests
 * Story 2.3: Permission Check Middleware
 * AC#1: @RequirePermission Decorator
 * AC#6: Multiple Permissions Support
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { Permission } from '../interfaces/permission.interface';
import {
  RequirePermission,
  PERMISSIONS_KEY,
  PERMISSION_LOGIC_KEY,
  PermissionLogic,
} from './require-permission.decorator';

describe('RequirePermission Decorator', () => {
  const reflector = new Reflector();

  describe('Metadata keys', () => {
    it('should export PERMISSIONS_KEY as "permissions"', () => {
      expect(PERMISSIONS_KEY).toBe('permissions');
    });

    it('should export PERMISSION_LOGIC_KEY as "permission_logic"', () => {
      expect(PERMISSION_LOGIC_KEY).toBe('permission_logic');
    });
  });

  describe('Type PermissionLogic', () => {
    it('should allow ALL as valid logic value', () => {
      const logic: PermissionLogic = 'ALL';
      expect(logic).toBe('ALL');
    });

    it('should allow ANY as valid logic value', () => {
      const logic: PermissionLogic = 'ANY';
      expect(logic).toBe('ANY');
    });
  });

  describe('Single permission', () => {
    class TestController {
      @RequirePermission(Permission.RENTAL_VIEW)
      testMethod() {
        return 'test';
      }
    }

    it('should set metadata with single permission in array', () => {
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        TestController.prototype.testMethod
      );
      expect(permissions).toEqual([Permission.RENTAL_VIEW]);
    });

    it('should set default ALL logic for single permission', () => {
      const logic = reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        TestController.prototype.testMethod
      );
      expect(logic).toBe('ALL');
    });
  });

  describe('Multiple permissions with default ALL logic', () => {
    class TestControllerMultiple {
      @RequirePermission([Permission.RENTAL_VIEW, Permission.RENTAL_CREATE])
      testMethodMultiple() {
        return 'test';
      }
    }

    it('should set metadata with multiple permissions', () => {
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        TestControllerMultiple.prototype.testMethodMultiple
      );
      expect(permissions).toEqual([Permission.RENTAL_VIEW, Permission.RENTAL_CREATE]);
    });

    it('should set default ALL logic for multiple permissions', () => {
      const logic = reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        TestControllerMultiple.prototype.testMethodMultiple
      );
      expect(logic).toBe('ALL');
    });
  });

  describe('Multiple permissions with explicit ALL logic', () => {
    class TestControllerExplicitAll {
      @RequirePermission([Permission.USER_VIEW, Permission.USER_CREATE], 'ALL')
      testMethodExplicitAll() {
        return 'test';
      }
    }

    it('should set metadata with explicit ALL logic', () => {
      const logic = reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        TestControllerExplicitAll.prototype.testMethodExplicitAll
      );
      expect(logic).toBe('ALL');
    });
  });

  describe('Multiple permissions with ANY logic', () => {
    class TestControllerAny {
      @RequirePermission([Permission.USER_VIEW, Permission.ADMIN_CONFIG], 'ANY')
      testMethodAny() {
        return 'test';
      }
    }

    it('should set metadata with ANY logic when specified', () => {
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        TestControllerAny.prototype.testMethodAny
      );
      expect(permissions).toEqual([Permission.USER_VIEW, Permission.ADMIN_CONFIG]);
    });

    it('should set ANY logic correctly', () => {
      const logic = reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        TestControllerAny.prototype.testMethodAny
      );
      expect(logic).toBe('ANY');
    });
  });

  describe('Decorator returns MethodDecorator', () => {
    it('should return a function that can be applied to methods', () => {
      const decorator = RequirePermission(Permission.RENTAL_VIEW);
      expect(typeof decorator).toBe('function');
    });

    it('should work as method decorator when applied', () => {
      const decorator = RequirePermission(Permission.RENTAL_VIEW);
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
      expect(result).toBe(descriptor);
    });
  });

  describe('Function overload behavior', () => {
    class TestControllerOverloads {
      @RequirePermission(Permission.SALES_VIEW) // Single
      singlePermission() {}

      @RequirePermission([Permission.SALES_VIEW, Permission.SALES_CREATE]) // Array, default ALL
      arrayDefaultLogic() {}

      @RequirePermission([Permission.FINANCE_VIEW, Permission.ADMIN_CONFIG], 'ANY') // Array, ANY
      arrayAnyLogic() {}
    }

    it('should handle single permission overload', () => {
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        TestControllerOverloads.prototype.singlePermission
      );
      const logic = reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        TestControllerOverloads.prototype.singlePermission
      );
      expect(permissions).toEqual([Permission.SALES_VIEW]);
      expect(logic).toBe('ALL');
    });

    it('should handle array permission with default logic overload', () => {
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        TestControllerOverloads.prototype.arrayDefaultLogic
      );
      const logic = reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        TestControllerOverloads.prototype.arrayDefaultLogic
      );
      expect(permissions).toEqual([Permission.SALES_VIEW, Permission.SALES_CREATE]);
      expect(logic).toBe('ALL');
    });

    it('should handle array permission with explicit ANY logic overload', () => {
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        TestControllerOverloads.prototype.arrayAnyLogic
      );
      const logic = reflector.get<PermissionLogic>(
        PERMISSION_LOGIC_KEY,
        TestControllerOverloads.prototype.arrayAnyLogic
      );
      expect(permissions).toEqual([Permission.FINANCE_VIEW, Permission.ADMIN_CONFIG]);
      expect(logic).toBe('ANY');
    });
  });
});
