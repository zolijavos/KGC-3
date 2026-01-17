/**
 * Role Service Tests - TDD Red-Green-Refactor
 * Story 2.1: User CRUD Operations
 * AC6: Role Hierarchy Enforcement
 *
 * Tests role hierarchy logic per ADR-032:
 * - OPERATOR (Level 1)
 * - TECHNIKUS (Level 2)
 * - BOLTVEZETO (Level 3)
 * - ACCOUNTANT (Level 3)
 * - PARTNER_OWNER (Level 4)
 * - CENTRAL_ADMIN (Level 5)
 * - DEVOPS_ADMIN (Level 6)
 * - SUPER_ADMIN (Level 8)
 *
 * Rule: User can only assign roles at equal or lower level than their own.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoleService, ROLE_LEVELS } from './role.service';
import { Role } from '../interfaces/user.interface';

describe('RoleService', () => {
  let roleService: RoleService;

  beforeEach(() => {
    roleService = new RoleService();
  });

  // ============================================
  // getRoleLevel() tests
  // ============================================

  describe('getRoleLevel()', () => {
    it('should return level 1 for OPERATOR', () => {
      expect(roleService.getRoleLevel(Role.OPERATOR)).toBe(1);
    });

    it('should return level 2 for TECHNIKUS', () => {
      expect(roleService.getRoleLevel(Role.TECHNIKUS)).toBe(2);
    });

    it('should return level 3 for BOLTVEZETO', () => {
      expect(roleService.getRoleLevel(Role.BOLTVEZETO)).toBe(3);
    });

    it('should return level 3 for ACCOUNTANT', () => {
      expect(roleService.getRoleLevel(Role.ACCOUNTANT)).toBe(3);
    });

    it('should return level 4 for PARTNER_OWNER', () => {
      expect(roleService.getRoleLevel(Role.PARTNER_OWNER)).toBe(4);
    });

    it('should return level 5 for CENTRAL_ADMIN', () => {
      expect(roleService.getRoleLevel(Role.CENTRAL_ADMIN)).toBe(5);
    });

    it('should return level 6 for DEVOPS_ADMIN', () => {
      expect(roleService.getRoleLevel(Role.DEVOPS_ADMIN)).toBe(6);
    });

    it('should return level 8 for SUPER_ADMIN', () => {
      expect(roleService.getRoleLevel(Role.SUPER_ADMIN)).toBe(8);
    });

    it('should throw error for invalid role', () => {
      expect(() => roleService.getRoleLevel('INVALID_ROLE' as Role)).toThrow(
        'Érvénytelen szerepkör'
      );
    });
  });

  // ============================================
  // canAssignRole() tests
  // ============================================

  describe('canAssignRole()', () => {
    it('should allow assigning same level role', () => {
      // BOLTVEZETO (3) can assign BOLTVEZETO (3)
      expect(roleService.canAssignRole(Role.BOLTVEZETO, Role.BOLTVEZETO)).toBe(true);
      // PARTNER_OWNER (4) can assign PARTNER_OWNER (4)
      expect(roleService.canAssignRole(Role.PARTNER_OWNER, Role.PARTNER_OWNER)).toBe(true);
    });

    it('should allow assigning lower level role', () => {
      // PARTNER_OWNER (4) can assign BOLTVEZETO (3)
      expect(roleService.canAssignRole(Role.PARTNER_OWNER, Role.BOLTVEZETO)).toBe(true);
      // BOLTVEZETO (3) can assign OPERATOR (1)
      expect(roleService.canAssignRole(Role.BOLTVEZETO, Role.OPERATOR)).toBe(true);
      // SUPER_ADMIN (8) can assign OPERATOR (1)
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.OPERATOR)).toBe(true);
    });

    it('should reject assigning higher level role', () => {
      // BOLTVEZETO (3) cannot assign PARTNER_OWNER (4)
      expect(roleService.canAssignRole(Role.BOLTVEZETO, Role.PARTNER_OWNER)).toBe(false);
      // OPERATOR (1) cannot assign TECHNIKUS (2)
      expect(roleService.canAssignRole(Role.OPERATOR, Role.TECHNIKUS)).toBe(false);
      // DEVOPS_ADMIN (6) cannot assign SUPER_ADMIN (8)
      expect(roleService.canAssignRole(Role.DEVOPS_ADMIN, Role.SUPER_ADMIN)).toBe(false);
    });

    it('should allow PARTNER_OWNER to assign BOLTVEZETO', () => {
      expect(roleService.canAssignRole(Role.PARTNER_OWNER, Role.BOLTVEZETO)).toBe(true);
    });

    it('should reject BOLTVEZETO assigning PARTNER_OWNER', () => {
      expect(roleService.canAssignRole(Role.BOLTVEZETO, Role.PARTNER_OWNER)).toBe(false);
    });

    it('should allow SUPER_ADMIN to assign any role', () => {
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.OPERATOR)).toBe(true);
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.TECHNIKUS)).toBe(true);
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.BOLTVEZETO)).toBe(true);
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.ACCOUNTANT)).toBe(true);
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.PARTNER_OWNER)).toBe(true);
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.CENTRAL_ADMIN)).toBe(true);
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.DEVOPS_ADMIN)).toBe(true);
      expect(roleService.canAssignRole(Role.SUPER_ADMIN, Role.SUPER_ADMIN)).toBe(true);
    });

    it('should handle ACCOUNTANT at same level as BOLTVEZETO', () => {
      // Both are level 3, but they can only assign to each other if they are the same
      // ACCOUNTANT can assign ACCOUNTANT
      expect(roleService.canAssignRole(Role.ACCOUNTANT, Role.ACCOUNTANT)).toBe(true);
      // ACCOUNTANT can assign OPERATOR (lower)
      expect(roleService.canAssignRole(Role.ACCOUNTANT, Role.OPERATOR)).toBe(true);
      // ACCOUNTANT can assign BOLTVEZETO (same level 3)
      expect(roleService.canAssignRole(Role.ACCOUNTANT, Role.BOLTVEZETO)).toBe(true);
      // ACCOUNTANT cannot assign PARTNER_OWNER (higher)
      expect(roleService.canAssignRole(Role.ACCOUNTANT, Role.PARTNER_OWNER)).toBe(false);
    });
  });

  // ============================================
  // ROLE_LEVELS constant tests
  // ============================================

  describe('ROLE_LEVELS constant', () => {
    it('should export all 8 role levels', () => {
      expect(Object.keys(ROLE_LEVELS)).toHaveLength(8);
    });

    it('should have correct level values', () => {
      expect(ROLE_LEVELS[Role.OPERATOR]).toBe(1);
      expect(ROLE_LEVELS[Role.TECHNIKUS]).toBe(2);
      expect(ROLE_LEVELS[Role.BOLTVEZETO]).toBe(3);
      expect(ROLE_LEVELS[Role.ACCOUNTANT]).toBe(3);
      expect(ROLE_LEVELS[Role.PARTNER_OWNER]).toBe(4);
      expect(ROLE_LEVELS[Role.CENTRAL_ADMIN]).toBe(5);
      expect(ROLE_LEVELS[Role.DEVOPS_ADMIN]).toBe(6);
      expect(ROLE_LEVELS[Role.SUPER_ADMIN]).toBe(8);
    });
  });

  // ============================================
  // Edge cases
  // ============================================

  describe('edge cases', () => {
    it('should handle role as string when passed from API', () => {
      // Sometimes roles come as strings from the database
      expect(roleService.getRoleLevel('OPERATOR' as Role)).toBe(1);
      expect(roleService.canAssignRole('PARTNER_OWNER' as Role, 'OPERATOR' as Role)).toBe(true);
    });
  });

  // ============================================
  // Story 2.2: Role Inheritance (getInheritedRoles)
  // ============================================

  describe('getInheritedRoles()', () => {
    it('should return empty array for OPERATOR (no inheritance)', () => {
      const inherited = roleService.getInheritedRoles(Role.OPERATOR);
      expect(inherited).toEqual([]);
    });

    it('should return [OPERATOR] for TECHNIKUS', () => {
      const inherited = roleService.getInheritedRoles(Role.TECHNIKUS);
      expect(inherited).toEqual([Role.OPERATOR]);
    });

    it('should return [TECHNIKUS, OPERATOR] for BOLTVEZETO', () => {
      const inherited = roleService.getInheritedRoles(Role.BOLTVEZETO);
      expect(inherited).toEqual([Role.TECHNIKUS, Role.OPERATOR]);
    });

    it('should return empty array for ACCOUNTANT (no inheritance - parallel hierarchy)', () => {
      const inherited = roleService.getInheritedRoles(Role.ACCOUNTANT);
      expect(inherited).toEqual([]);
    });

    it('should return [BOLTVEZETO, TECHNIKUS, OPERATOR] for PARTNER_OWNER', () => {
      const inherited = roleService.getInheritedRoles(Role.PARTNER_OWNER);
      expect(inherited).toEqual([Role.BOLTVEZETO, Role.TECHNIKUS, Role.OPERATOR]);
    });

    it('should return empty array for CENTRAL_ADMIN (parallel hierarchy)', () => {
      const inherited = roleService.getInheritedRoles(Role.CENTRAL_ADMIN);
      expect(inherited).toEqual([]);
    });

    it('should return empty array for DEVOPS_ADMIN (parallel hierarchy)', () => {
      const inherited = roleService.getInheritedRoles(Role.DEVOPS_ADMIN);
      expect(inherited).toEqual([]);
    });

    it('should return complete chain for SUPER_ADMIN (all operational roles)', () => {
      const inherited = roleService.getInheritedRoles(Role.SUPER_ADMIN);
      // SUPER_ADMIN inherits the full operational chain
      expect(inherited).toContain(Role.PARTNER_OWNER);
      expect(inherited).toContain(Role.BOLTVEZETO);
      expect(inherited).toContain(Role.TECHNIKUS);
      expect(inherited).toContain(Role.OPERATOR);
    });
  });

  // ============================================
  // Story 2.2: Role Scope (getRoleScope)
  // ============================================

  describe('getRoleScope()', () => {
    it('should return LOCATION scope for OPERATOR', () => {
      expect(roleService.getRoleScope(Role.OPERATOR)).toBe('LOCATION');
    });

    it('should return LOCATION scope for TECHNIKUS', () => {
      expect(roleService.getRoleScope(Role.TECHNIKUS)).toBe('LOCATION');
    });

    it('should return LOCATION scope for BOLTVEZETO', () => {
      expect(roleService.getRoleScope(Role.BOLTVEZETO)).toBe('LOCATION');
    });

    it('should return TENANT scope for ACCOUNTANT', () => {
      expect(roleService.getRoleScope(Role.ACCOUNTANT)).toBe('TENANT');
    });

    it('should return TENANT scope for PARTNER_OWNER', () => {
      expect(roleService.getRoleScope(Role.PARTNER_OWNER)).toBe('TENANT');
    });

    it('should return GLOBAL scope for CENTRAL_ADMIN', () => {
      expect(roleService.getRoleScope(Role.CENTRAL_ADMIN)).toBe('GLOBAL');
    });

    it('should return GLOBAL scope for DEVOPS_ADMIN', () => {
      expect(roleService.getRoleScope(Role.DEVOPS_ADMIN)).toBe('GLOBAL');
    });

    it('should return GLOBAL scope for SUPER_ADMIN', () => {
      expect(roleService.getRoleScope(Role.SUPER_ADMIN)).toBe('GLOBAL');
    });
  });
});
