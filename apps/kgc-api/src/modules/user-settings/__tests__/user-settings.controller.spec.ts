/**
 * User Settings Controller Tests
 * Epic 29: User Favorites (ADR-044)
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserFavorite, UserSettings } from '../interfaces';
import { USER_SETTINGS_REPOSITORY } from '../repositories';
import {
  MAX_FAVORITES,
  TenantDefaultFavoritesController,
  UserSettingsController,
} from '../user-settings.controller';

// Mock repository - using ReturnType for proper Vitest typing
const createMockRepository = () => ({
  findByUserId: vi.fn(),
  create: vi.fn(),
  updateFavorites: vi.fn(),
  getTenantDefaults: vi.fn(),
  setTenantDefaults: vi.fn(),
});

// Test data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';

const createMockFavorite = (overrides: Partial<UserFavorite> = {}): UserFavorite => ({
  menuItemId: 'rentals.active',
  order: 1,
  addedAt: new Date('2026-01-25'),
  ...overrides,
});

const createMockUserSettings = (overrides: Partial<UserSettings> = {}): UserSettings => ({
  id: 'settings-789',
  userId: mockUserId,
  tenantId: mockTenantId,
  favorites: [createMockFavorite()],
  version: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-25'),
  ...overrides,
});

const mockRequest = {
  user: {
    id: mockUserId,
    tenantId: mockTenantId,
    role: 'OPERATOR',
  },
};

describe('UserSettingsController', () => {
  let controller: UserSettingsController;
  let mockRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSettingsController],
      providers: [
        {
          provide: USER_SETTINGS_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<UserSettingsController>(UserSettingsController);
  });

  describe('getFavorites', () => {
    it('should return user favorites with version', async () => {
      const mockSettings = createMockUserSettings({
        favorites: [
          createMockFavorite({ menuItemId: 'rentals.active', order: 1 }),
          createMockFavorite({ menuItemId: 'service.worksheets', order: 2 }),
        ],
        version: 3,
      });
      mockRepository.findByUserId.mockResolvedValue(mockSettings);

      const result = await controller.getFavorites(mockRequest);

      expect(result.favorites).toHaveLength(2);
      expect(result.version).toBe(3);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(mockUserId, mockTenantId);
    });

    it('should create new settings for new user', async () => {
      mockRepository.findByUserId.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(
        createMockUserSettings({ favorites: [], version: 1 })
      );

      const result = await controller.getFavorites(mockRequest);

      expect(result.favorites).toHaveLength(0);
      expect(result.version).toBe(1);
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('addFavorite', () => {
    it('should add a new favorite', async () => {
      const existingSettings = createMockUserSettings({ favorites: [], version: 1 });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);
      mockRepository.updateFavorites.mockResolvedValue(
        createMockUserSettings({
          favorites: [createMockFavorite({ menuItemId: 'rentals.active', order: 1 })],
          version: 2,
        })
      );

      const result = await controller.addFavorite(mockRequest, 'rentals.active', {});

      expect(result.favorites).toHaveLength(1);
      expect(result.favorites[0]?.menuItemId).toBe('rentals.active');
      expect(result.version).toBe(2);
    });

    it('should add favorite with custom label', async () => {
      const existingSettings = createMockUserSettings({ favorites: [], version: 1 });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);
      mockRepository.updateFavorites.mockResolvedValue(
        createMockUserSettings({
          favorites: [createMockFavorite({ menuItemId: 'rentals.active', label: 'Bérlések' })],
          version: 2,
        })
      );

      const result = await controller.addFavorite(mockRequest, 'rentals.active', {
        label: 'Bérlések',
      });

      expect(result.favorites[0]?.label).toBe('Bérlések');
    });

    it('should throw BadRequestException for empty menuItemId', async () => {
      await expect(controller.addFavorite(mockRequest, '', {})).rejects.toThrow(
        BadRequestException
      );

      await expect(controller.addFavorite(mockRequest, '  ', {})).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ConflictException when favorite already exists', async () => {
      const existingSettings = createMockUserSettings({
        favorites: [createMockFavorite({ menuItemId: 'rentals.active' })],
      });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);

      await expect(controller.addFavorite(mockRequest, 'rentals.active', {})).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw BadRequestException when limit exceeded', async () => {
      const favorites = Array.from({ length: MAX_FAVORITES }, (_, i) =>
        createMockFavorite({ menuItemId: `item-${i}`, order: i + 1 })
      );
      const existingSettings = createMockUserSettings({ favorites });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);

      await expect(controller.addFavorite(mockRequest, 'new-item', {})).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('removeFavorite', () => {
    it('should remove an existing favorite', async () => {
      const existingSettings = createMockUserSettings({
        favorites: [
          createMockFavorite({ menuItemId: 'rentals.active', order: 1 }),
          createMockFavorite({ menuItemId: 'service.worksheets', order: 2 }),
        ],
      });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);
      mockRepository.updateFavorites.mockResolvedValue(
        createMockUserSettings({
          favorites: [createMockFavorite({ menuItemId: 'service.worksheets', order: 1 })],
          version: 2,
        })
      );

      const result = await controller.removeFavorite(mockRequest, 'rentals.active');

      expect(result.favorites).toHaveLength(1);
      expect(result.favorites[0]?.menuItemId).toBe('service.worksheets');
    });

    it('should throw NotFoundException when favorite not found', async () => {
      const existingSettings = createMockUserSettings({
        favorites: [createMockFavorite({ menuItemId: 'rentals.active' })],
      });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);

      await expect(controller.removeFavorite(mockRequest, 'non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for empty menuItemId', async () => {
      await expect(controller.removeFavorite(mockRequest, '')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateFavorites', () => {
    it('should batch update all favorites', async () => {
      mockRepository.findByUserId.mockResolvedValue(createMockUserSettings({ favorites: [] }));
      mockRepository.updateFavorites.mockResolvedValue(
        createMockUserSettings({
          favorites: [
            createMockFavorite({ menuItemId: 'item-1', order: 1 }),
            createMockFavorite({ menuItemId: 'item-2', order: 2 }),
          ],
          version: 2,
        })
      );

      const result = await controller.updateFavorites(mockRequest, {
        favorites: [
          { menuItemId: 'item-1', order: 1 },
          { menuItemId: 'item-2', order: 2 },
        ],
      });

      expect(result.favorites).toHaveLength(2);
      expect(result.version).toBe(2);
    });

    it('should throw BadRequestException for invalid favorites array', async () => {
      await expect(
        controller.updateFavorites(mockRequest, { favorites: null as any })
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.updateFavorites(mockRequest, { favorites: 'invalid' as any })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing menuItemId', async () => {
      await expect(
        controller.updateFavorites(mockRequest, {
          favorites: [{ menuItemId: '', order: 1 }],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing order', async () => {
      await expect(
        controller.updateFavorites(mockRequest, {
          favorites: [{ menuItemId: 'item-1', order: undefined as any }],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit exceeded', async () => {
      const tooManyFavorites = Array.from({ length: MAX_FAVORITES + 1 }, (_, i) => ({
        menuItemId: `item-${i}`,
        order: i + 1,
      }));

      mockRepository.findByUserId.mockResolvedValue(createMockUserSettings());

      await expect(
        controller.updateFavorites(mockRequest, { favorites: tooManyFavorites })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException on version conflict', async () => {
      const existingSettings = createMockUserSettings({ version: 5 });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);
      mockRepository.updateFavorites.mockRejectedValue(
        new Error('Version conflict: expected 3, got 5')
      );

      await expect(
        controller.updateFavorites(mockRequest, {
          favorites: [{ menuItemId: 'item-1', order: 1 }],
          expectedVersion: 3,
        })
      ).rejects.toThrow();
    });
  });

  describe('reorderFavorites', () => {
    it('should reorder favorites based on orderedIds', async () => {
      const existingSettings = createMockUserSettings({
        favorites: [
          createMockFavorite({ menuItemId: 'item-1', order: 1 }),
          createMockFavorite({ menuItemId: 'item-2', order: 2 }),
          createMockFavorite({ menuItemId: 'item-3', order: 3 }),
        ],
      });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);
      mockRepository.updateFavorites.mockResolvedValue(
        createMockUserSettings({
          favorites: [
            createMockFavorite({ menuItemId: 'item-3', order: 1 }),
            createMockFavorite({ menuItemId: 'item-1', order: 2 }),
            createMockFavorite({ menuItemId: 'item-2', order: 3 }),
          ],
          version: 2,
        })
      );

      const result = await controller.reorderFavorites(mockRequest, {
        orderedIds: ['item-3', 'item-1', 'item-2'],
      });

      expect(result.favorites[0]?.menuItemId).toBe('item-3');
      expect(result.favorites[1]?.menuItemId).toBe('item-1');
      expect(result.favorites[2]?.menuItemId).toBe('item-2');
    });

    it('should throw BadRequestException for invalid orderedIds', async () => {
      await expect(
        controller.reorderFavorites(mockRequest, { orderedIds: null as any })
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.reorderFavorites(mockRequest, { orderedIds: 'invalid' as any })
      ).rejects.toThrow(BadRequestException);
    });

    it('should ignore non-existent menuItemIds in orderedIds', async () => {
      const existingSettings = createMockUserSettings({
        favorites: [
          createMockFavorite({ menuItemId: 'item-1', order: 1 }),
          createMockFavorite({ menuItemId: 'item-2', order: 2 }),
        ],
      });
      mockRepository.findByUserId.mockResolvedValue(existingSettings);
      mockRepository.updateFavorites.mockResolvedValue(
        createMockUserSettings({
          favorites: [
            createMockFavorite({ menuItemId: 'item-2', order: 1 }),
            createMockFavorite({ menuItemId: 'item-1', order: 2 }),
          ],
        })
      );

      // 'non-existent' should be filtered out
      const result = await controller.reorderFavorites(mockRequest, {
        orderedIds: ['item-2', 'non-existent', 'item-1'],
      });

      expect(result.favorites).toHaveLength(2);
    });
  });
});

describe('TenantDefaultFavoritesController', () => {
  let controller: TenantDefaultFavoritesController;
  let mockRepository: ReturnType<typeof createMockRepository>;

  const adminRequest = {
    user: {
      id: 'admin-123',
      tenantId: mockTenantId,
      role: 'PARTNER_OWNER',
    },
  };

  beforeEach(async () => {
    mockRepository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantDefaultFavoritesController],
      providers: [
        {
          provide: USER_SETTINGS_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<TenantDefaultFavoritesController>(TenantDefaultFavoritesController);
  });

  describe('getTenantDefaults', () => {
    it('should return tenant default favorites', async () => {
      mockRepository.getTenantDefaults.mockResolvedValue({
        tenantId: mockTenantId,
        roleDefaults: {
          OPERATOR: ['rentals.checkout', 'pos.cash'],
          MANAGER: ['dashboard.overview', 'reports.daily'],
        },
      });

      const result = await controller.getTenantDefaults(adminRequest);

      expect(result.roleDefaults.OPERATOR).toContain('rentals.checkout');
      expect(result.roleDefaults.MANAGER).toContain('dashboard.overview');
    });

    it('should return empty defaults for new tenant', async () => {
      mockRepository.getTenantDefaults.mockResolvedValue(null);

      const result = await controller.getTenantDefaults(adminRequest);

      expect(result.tenantId).toBe(mockTenantId);
      expect(result.roleDefaults).toEqual({});
    });
  });

  describe('setTenantDefaults', () => {
    it('should set tenant default favorites', async () => {
      const roleDefaults = {
        OPERATOR: ['rentals.checkout', 'pos.cash'],
        TECHNIKUS: ['service.worksheets', 'service.parts'],
      };

      mockRepository.setTenantDefaults.mockResolvedValue({
        tenantId: mockTenantId,
        roleDefaults,
      });

      const result = await controller.setTenantDefaults(adminRequest, { roleDefaults });

      expect(result.roleDefaults).toEqual(roleDefaults);
      expect(mockRepository.setTenantDefaults).toHaveBeenCalledWith(mockTenantId, roleDefaults);
    });

    it('should throw BadRequestException for invalid roleDefaults', async () => {
      await expect(
        controller.setTenantDefaults(adminRequest, { roleDefaults: null as any })
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.setTenantDefaults(adminRequest, { roleDefaults: 'invalid' as any })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when role exceeds limit', async () => {
      const tooManyFavorites = Array.from({ length: MAX_FAVORITES + 1 }, (_, i) => `item-${i}`);

      await expect(
        controller.setTenantDefaults(adminRequest, {
          roleDefaults: { OPERATOR: tooManyFavorites },
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when role favorites is not array', async () => {
      await expect(
        controller.setTenantDefaults(adminRequest, {
          roleDefaults: { OPERATOR: 'invalid' as any },
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
