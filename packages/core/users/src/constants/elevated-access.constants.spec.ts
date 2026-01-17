/**
 * Elevated Access Constants Tests
 * Story 2.4: Elevated Access Requirement
 * AC#1: ELEVATED_PERMISSIONS Definition
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect } from 'vitest';
import {
  ELEVATED_PERMISSIONS,
  ELEVATED_ACCESS_TTL_MS,
  ELEVATED_ACCESS_TTL_SECONDS,
  isElevatedPermission,
} from './elevated-access.constants';
import { Permission } from '../interfaces/permission.interface';

describe('ELEVATED_ACCESS Constants', () => {
  describe('ELEVATED_PERMISSIONS array', () => {
    it('should contain RENTAL_CANCEL permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.RENTAL_CANCEL);
    });

    it('should contain INVENTORY_ADJUST permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.INVENTORY_ADJUST);
    });

    it('should contain USER_DELETE permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.USER_DELETE);
    });

    it('should contain ADMIN_CONFIG permission', () => {
      expect(ELEVATED_PERMISSIONS).toContain(Permission.ADMIN_CONFIG);
    });

    it('should contain exactly 4 elevated permissions per ADR-032', () => {
      expect(ELEVATED_PERMISSIONS).toHaveLength(4);
    });

    it('should be a readonly array (immutable)', () => {
      // TypeScript readonly should prevent mutations at compile time
      // Runtime check that it's an array
      expect(Array.isArray(ELEVATED_PERMISSIONS)).toBe(true);
    });
  });

  describe('ELEVATED_ACCESS_TTL_MS constant', () => {
    it('should be 5 minutes in milliseconds (300000)', () => {
      expect(ELEVATED_ACCESS_TTL_MS).toBe(5 * 60 * 1000);
      expect(ELEVATED_ACCESS_TTL_MS).toBe(300000);
    });
  });

  describe('ELEVATED_ACCESS_TTL_SECONDS constant', () => {
    it('should be 5 minutes in seconds (300)', () => {
      expect(ELEVATED_ACCESS_TTL_SECONDS).toBe(5 * 60);
      expect(ELEVATED_ACCESS_TTL_SECONDS).toBe(300);
    });

    it('should be consistent with TTL_MS', () => {
      expect(ELEVATED_ACCESS_TTL_SECONDS * 1000).toBe(ELEVATED_ACCESS_TTL_MS);
    });
  });

  describe('isElevatedPermission helper function', () => {
    it('should return true for RENTAL_CANCEL', () => {
      expect(isElevatedPermission(Permission.RENTAL_CANCEL)).toBe(true);
    });

    it('should return true for INVENTORY_ADJUST', () => {
      expect(isElevatedPermission(Permission.INVENTORY_ADJUST)).toBe(true);
    });

    it('should return true for USER_DELETE', () => {
      expect(isElevatedPermission(Permission.USER_DELETE)).toBe(true);
    });

    it('should return true for ADMIN_CONFIG', () => {
      expect(isElevatedPermission(Permission.ADMIN_CONFIG)).toBe(true);
    });

    it('should return false for non-elevated permission (RENTAL_VIEW)', () => {
      expect(isElevatedPermission(Permission.RENTAL_VIEW)).toBe(false);
    });

    it('should return false for non-elevated permission (USER_CREATE)', () => {
      expect(isElevatedPermission(Permission.USER_CREATE)).toBe(false);
    });

    it('should return false for non-elevated permission (FINANCE_VIEW)', () => {
      expect(isElevatedPermission(Permission.FINANCE_VIEW)).toBe(false);
    });

    it('should return false for non-elevated permission (INVENTORY_VIEW)', () => {
      expect(isElevatedPermission(Permission.INVENTORY_VIEW)).toBe(false);
    });
  });
});
