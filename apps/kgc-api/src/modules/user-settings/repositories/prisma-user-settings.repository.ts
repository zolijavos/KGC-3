/**
 * Prisma User Settings Repository
 * Epic 29: User Favorites (ADR-044)
 */

import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  IUserSettingsRepository,
  TenantDefaultFavorites,
  UserFavorite,
  UserSettings,
} from '../interfaces';

export const USER_SETTINGS_REPOSITORY = 'USER_SETTINGS_REPOSITORY';

@Injectable()
export class PrismaUserSettingsRepository implements IUserSettingsRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  async findByUserId(userId: string, tenantId: string): Promise<UserSettings | null> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return null;
    }

    // Validate tenantId matches (security)
    if (settings.tenantId !== tenantId) {
      return null;
    }

    return this.mapToUserSettings(settings);
  }

  async create(data: {
    userId: string;
    tenantId: string;
    favorites?: UserFavorite[];
  }): Promise<UserSettings> {
    const settings = await this.prisma.userSettings.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        favorites: (data.favorites ?? []) as unknown as Prisma.InputJsonValue,
        version: 1,
      },
    });

    return this.mapToUserSettings(settings);
  }

  async updateFavorites(
    userId: string,
    tenantId: string,
    favorites: UserFavorite[],
    expectedVersion?: number
  ): Promise<UserSettings> {
    // Find or create
    const existing = await this.findByUserId(userId, tenantId);

    if (!existing) {
      return this.create({ userId, tenantId, favorites });
    }

    // Version check for optimistic locking
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new Error(`Version conflict: expected ${expectedVersion}, got ${existing.version}`);
    }

    const settings = await this.prisma.userSettings.update({
      where: { userId },
      data: {
        favorites: favorites.map(f => ({
          menuItemId: f.menuItemId,
          order: f.order,
          addedAt: f.addedAt.toISOString(),
          ...(f.label !== undefined && { label: f.label }),
        })),
        version: { increment: 1 },
      },
    });

    return this.mapToUserSettings(settings);
  }

  async getTenantDefaults(tenantId: string): Promise<TenantDefaultFavorites | null> {
    const defaults = await this.prisma.tenantDefaultFavorites.findUnique({
      where: { tenantId },
    });

    if (!defaults) {
      return null;
    }

    return {
      tenantId: defaults.tenantId,
      roleDefaults: defaults.roleDefaults as Record<string, string[]>,
    };
  }

  async setTenantDefaults(
    tenantId: string,
    roleDefaults: Record<string, string[]>
  ): Promise<TenantDefaultFavorites> {
    const defaults = await this.prisma.tenantDefaultFavorites.upsert({
      where: { tenantId },
      create: {
        tenantId,
        roleDefaults,
      },
      update: {
        roleDefaults,
      },
    });

    return {
      tenantId: defaults.tenantId,
      roleDefaults: defaults.roleDefaults as Record<string, string[]>,
    };
  }

  private mapToUserSettings(raw: {
    id: string;
    userId: string;
    tenantId: string;
    favorites: unknown;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): UserSettings {
    const favorites = (
      raw.favorites as Array<{
        menuItemId: string;
        order: number;
        addedAt: string;
        label?: string;
      }>
    ).map(f => ({
      menuItemId: f.menuItemId,
      order: f.order,
      addedAt: new Date(f.addedAt),
      ...(f.label !== undefined && { label: f.label }),
    }));

    return {
      id: raw.id,
      userId: raw.userId,
      tenantId: raw.tenantId,
      favorites,
      version: raw.version,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
