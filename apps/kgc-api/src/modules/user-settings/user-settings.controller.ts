/**
 * User Settings Controller
 * Epic 29: User Favorites (ADR-044)
 *
 * REST API endpoints for user favorites management.
 * Supports offline-first sync with version-based conflict resolution.
 */

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import type { FavoritesResponseDto, IUserSettingsRepository, UserFavorite } from './interfaces';
import { USER_SETTINGS_REPOSITORY } from './repositories';

/** Maximum number of favorites allowed per user */
export const MAX_FAVORITES = 10;

interface AuthenticatedRequest {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
}

export const USER_SETTINGS_SERVICE = 'USER_SETTINGS_SERVICE';

@Controller('user/settings')
export class UserSettingsController {
  constructor(
    @Inject(USER_SETTINGS_REPOSITORY)
    private readonly repository: IUserSettingsRepository
  ) {}

  /**
   * GET /api/v1/user/settings/favorites
   * Get current user's favorites with version for sync
   */
  @Get('favorites')
  async getFavorites(@Req() req: AuthenticatedRequest): Promise<FavoritesResponseDto> {
    const { id: userId, tenantId } = req.user;
    let settings = await this.repository.findByUserId(userId, tenantId);

    if (!settings) {
      settings = await this.repository.create({ userId, tenantId, favorites: [] });
    }

    return {
      favorites: settings.favorites,
      version: settings.version,
    };
  }

  /**
   * POST /api/v1/user/settings/favorites/:menuItemId
   * Add a single favorite
   */
  @Post('favorites/:menuItemId')
  async addFavorite(
    @Req() req: AuthenticatedRequest,
    @Param('menuItemId') menuItemId: string,
    @Body() body: { order?: number; label?: string }
  ): Promise<FavoritesResponseDto> {
    const { id: userId, tenantId } = req.user;

    if (!menuItemId || menuItemId.trim() === '') {
      throw new BadRequestException('menuItemId is required');
    }

    let settings = await this.repository.findByUserId(userId, tenantId);

    if (!settings) {
      settings = await this.repository.create({ userId, tenantId, favorites: [] });
    }

    // Check if already exists
    const existingIndex = settings.favorites.findIndex(f => f.menuItemId === menuItemId.trim());
    if (existingIndex !== -1) {
      throw new ConflictException(`Favorite "${menuItemId}" already exists`);
    }

    // Check limit
    if (settings.favorites.length >= MAX_FAVORITES) {
      throw new BadRequestException(`Maximum ${MAX_FAVORITES} favorites allowed`);
    }

    // Calculate order - append at end if not specified
    const maxOrder = settings.favorites.reduce((max, f) => Math.max(max, f.order), 0);
    const newOrder = body.order ?? maxOrder + 1;

    const newFavorite: UserFavorite = {
      menuItemId: menuItemId.trim(),
      order: newOrder,
      addedAt: new Date(),
      ...(body.label !== undefined && { label: body.label }),
    };

    const updatedFavorites = [...settings.favorites, newFavorite];

    const updated = await this.repository.updateFavorites(userId, tenantId, updatedFavorites);

    return {
      favorites: updated.favorites,
      version: updated.version,
    };
  }

  /**
   * DELETE /api/v1/user/settings/favorites/:menuItemId
   * Remove a favorite
   */
  @Delete('favorites/:menuItemId')
  @HttpCode(HttpStatus.OK)
  async removeFavorite(
    @Req() req: AuthenticatedRequest,
    @Param('menuItemId') menuItemId: string
  ): Promise<FavoritesResponseDto> {
    const { id: userId, tenantId } = req.user;

    if (!menuItemId || menuItemId.trim() === '') {
      throw new BadRequestException('menuItemId is required');
    }

    const settings = await this.repository.findByUserId(userId, tenantId);

    if (!settings) {
      throw new NotFoundException(`Favorite "${menuItemId}" not found`);
    }

    const existingIndex = settings.favorites.findIndex(f => f.menuItemId === menuItemId.trim());

    if (existingIndex === -1) {
      throw new NotFoundException(`Favorite "${menuItemId}" not found`);
    }

    const updatedFavorites = settings.favorites
      .filter(f => f.menuItemId !== menuItemId.trim())
      .map((f, idx) => ({ ...f, order: idx + 1 })); // Re-normalize order

    const updated = await this.repository.updateFavorites(userId, tenantId, updatedFavorites);

    return {
      favorites: updated.favorites,
      version: updated.version,
    };
  }

  /**
   * PATCH /api/v1/user/settings/favorites
   * Batch update all favorites (for reorder or full sync)
   */
  @Patch('favorites')
  async updateFavorites(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      favorites: Array<{ menuItemId: string; order: number; label?: string }>;
      expectedVersion?: number;
    }
  ): Promise<FavoritesResponseDto> {
    const { id: userId, tenantId } = req.user;

    if (!body.favorites || !Array.isArray(body.favorites)) {
      throw new BadRequestException('favorites array is required');
    }

    // Validate limit
    if (body.favorites.length > MAX_FAVORITES) {
      throw new BadRequestException(`Maximum ${MAX_FAVORITES} favorites allowed`);
    }

    // Validate each favorite
    for (const fav of body.favorites) {
      if (!fav.menuItemId || typeof fav.menuItemId !== 'string') {
        throw new BadRequestException('Each favorite must have a menuItemId');
      }
      if (typeof fav.order !== 'number') {
        throw new BadRequestException('Each favorite must have an order number');
      }
    }

    // Validate unique menuItemIds
    const uniqueIds = new Set(body.favorites.map(f => f.menuItemId.trim()));
    if (uniqueIds.size !== body.favorites.length) {
      throw new BadRequestException('Duplicate menuItemIds in favorites');
    }

    // Get existing settings for addedAt preservation
    const settings = await this.repository.findByUserId(userId, tenantId);
    const existingMap = new Map(settings?.favorites.map(f => [f.menuItemId, f.addedAt]) ?? []);

    const newFavorites: UserFavorite[] = body.favorites.map(f => ({
      menuItemId: f.menuItemId.trim(),
      order: f.order,
      addedAt: existingMap.get(f.menuItemId.trim()) ?? new Date(),
      ...(f.label !== undefined && { label: f.label }),
    }));

    try {
      const updated = await this.repository.updateFavorites(
        userId,
        tenantId,
        newFavorites,
        body.expectedVersion
      );

      return {
        favorites: updated.favorites,
        version: updated.version,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Version conflict')) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * PATCH /api/v1/user/settings/favorites/reorder
   * Reorder favorites by providing ordered list of menuItemIds
   */
  @Patch('favorites/reorder')
  async reorderFavorites(
    @Req() req: AuthenticatedRequest,
    @Body() body: { orderedIds: string[] }
  ): Promise<FavoritesResponseDto> {
    const { id: userId, tenantId } = req.user;

    if (!body.orderedIds || !Array.isArray(body.orderedIds)) {
      throw new BadRequestException('orderedIds array is required');
    }

    // Get current favorites
    let settings = await this.repository.findByUserId(userId, tenantId);

    if (!settings) {
      settings = await this.repository.create({ userId, tenantId, favorites: [] });
    }

    // Build new order
    const currentMap = new Map(settings.favorites.map(f => [f.menuItemId, f]));

    const reorderedFavorites: UserFavorite[] = body.orderedIds
      .filter(id => currentMap.has(id))
      .map((id, idx) => {
        const existing = currentMap.get(id)!;
        return {
          menuItemId: id,
          order: idx + 1,
          addedAt: existing.addedAt,
          ...(existing.label !== undefined && { label: existing.label }),
        };
      });

    const updated = await this.repository.updateFavorites(userId, tenantId, reorderedFavorites);

    return {
      favorites: updated.favorites,
      version: updated.version,
    };
  }
}

/**
 * Tenant Admin Controller for default favorites
 */
@Controller('admin/tenant/favorites')
export class TenantDefaultFavoritesController {
  constructor(
    @Inject(USER_SETTINGS_REPOSITORY)
    private readonly repository: IUserSettingsRepository
  ) {}

  /**
   * GET /api/v1/admin/tenant/favorites
   * Get tenant default favorites per role
   */
  @Get()
  async getTenantDefaults(@Req() req: AuthenticatedRequest) {
    const { tenantId } = req.user;
    const defaults = await this.repository.getTenantDefaults(tenantId);
    return defaults ?? { tenantId, roleDefaults: {} };
  }

  /**
   * PATCH /api/v1/admin/tenant/favorites
   * Set tenant default favorites per role
   */
  @Patch()
  async setTenantDefaults(
    @Req() req: AuthenticatedRequest,
    @Body() body: { roleDefaults: Record<string, string[]> }
  ) {
    const { tenantId } = req.user;

    if (!body.roleDefaults || typeof body.roleDefaults !== 'object') {
      throw new BadRequestException('roleDefaults object is required');
    }

    // Validate each role's favorites
    for (const [role, favorites] of Object.entries(body.roleDefaults)) {
      if (!Array.isArray(favorites)) {
        throw new BadRequestException(`Favorites for role "${role}" must be an array`);
      }
      if (favorites.length > MAX_FAVORITES) {
        throw new BadRequestException(`Role "${role}" exceeds maximum ${MAX_FAVORITES} favorites`);
      }
    }

    return this.repository.setTenantDefaults(tenantId, body.roleDefaults);
  }
}
