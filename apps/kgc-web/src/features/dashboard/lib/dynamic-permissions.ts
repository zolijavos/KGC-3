import { api } from '@/api/client';
import { WIDGET_REGISTRY, type UserRole, type WidgetConfig } from './widget-registry';

/**
 * Dynamic Widget Permissions (Story 45-1 - AC5, AC6)
 *
 * Fetches widget permissions from backend and provides fallback to hardcoded defaults.
 *
 * Features:
 * - API-based permission loading
 * - Fallback to hardcoded defaults on API failure
 * - Caching with configurable TTL
 */

/** Backend permission response format */
interface PermissionApiResponse {
  data: {
    widgets: string[];
  };
}

/** Cache for permissions */
let permissionCache: {
  role: UserRole;
  widgetIds: Set<string>;
  fetchedAt: number;
} | null = null;

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Map frontend role to backend role format
 */
function mapRoleToBackend(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    OPERATOR: 'OPERATOR',
    STORE_MANAGER: 'STORE_MANAGER',
    ADMIN: 'ADMIN',
  };
  return roleMap[role];
}

/**
 * Fetch widget permissions from backend API
 *
 * @param role - User role to fetch permissions for
 * @returns Set of widget IDs the role can access
 * @throws Error if API fails
 */
async function fetchPermissionsFromApi(role: UserRole): Promise<Set<string>> {
  const backendRole = mapRoleToBackend(role);
  const response = await api.get<PermissionApiResponse>(
    `/dashboard/permissions/role/${backendRole}`
  );
  return new Set(response.data.widgets);
}

/**
 * Get default permissions from hardcoded widget registry (fallback)
 */
function getDefaultPermissions(role: UserRole): Set<string> {
  const widgetIds = new Set<string>();

  for (const [id, config] of Object.entries(WIDGET_REGISTRY)) {
    // Empty roles array means all roles can see
    if (config.roles.length === 0) {
      widgetIds.add(id);
    } else if (config.roles.includes(role)) {
      widgetIds.add(id);
    }
  }

  return widgetIds;
}

/**
 * Check if cache is valid
 */
function isCacheValid(role: UserRole): boolean {
  if (!permissionCache) return false;
  if (permissionCache.role !== role) return false;

  const now = Date.now();
  return now - permissionCache.fetchedAt < CACHE_TTL_MS;
}

/**
 * Get widget permissions for a role with fallback (AC5, AC6)
 *
 * Attempts to fetch from backend API, falls back to hardcoded defaults on failure.
 *
 * @param role - User role
 * @param forceRefresh - Force refresh from API (bypass cache)
 * @returns Object with widget IDs and source indicator
 */
export async function getWidgetPermissions(
  role: UserRole,
  forceRefresh = false
): Promise<{
  widgetIds: Set<string>;
  source: 'api' | 'cache' | 'fallback';
}> {
  // Return from cache if valid
  if (!forceRefresh && isCacheValid(role)) {
    return {
      widgetIds: permissionCache!.widgetIds,
      source: 'cache',
    };
  }

  // Try to fetch from API
  try {
    const widgetIds = await fetchPermissionsFromApi(role);

    // Update cache
    permissionCache = {
      role,
      widgetIds,
      fetchedAt: Date.now(),
    };

    return {
      widgetIds,
      source: 'api',
    };
  } catch (error) {
    // Log error but don't throw - use fallback
    console.warn('[DynamicPermissions] API fetch failed, using fallback:', error);

    // AC6: Return hardcoded defaults on API failure
    return {
      widgetIds: getDefaultPermissions(role),
      source: 'fallback',
    };
  }
}

/**
 * Get visible widgets for a role with dynamic permissions
 *
 * Returns full WidgetConfig objects for widgets the role can access.
 *
 * @param role - User role
 * @param forceRefresh - Force refresh from API
 */
export async function getVisibleWidgetsForRole(
  role: UserRole,
  forceRefresh = false
): Promise<{
  widgets: WidgetConfig[];
  source: 'api' | 'cache' | 'fallback';
}> {
  const { widgetIds, source } = await getWidgetPermissions(role, forceRefresh);

  const widgets = Object.entries(WIDGET_REGISTRY)
    .filter(([id]) => widgetIds.has(id))
    .map(([id, config]) => ({
      id,
      ...config,
    }));

  return { widgets, source };
}

/**
 * Check if a specific widget is visible for a role
 *
 * Uses cached permissions if available, otherwise uses defaults.
 * Does NOT trigger API fetch - use getWidgetPermissions first.
 */
export function isWidgetVisibleSync(widgetId: string, role: UserRole): boolean {
  // Use cache if available and valid
  if (isCacheValid(role) && permissionCache) {
    return permissionCache.widgetIds.has(widgetId);
  }

  // Fallback to hardcoded defaults
  const defaults = getDefaultPermissions(role);
  return defaults.has(widgetId);
}

/**
 * Invalidate permission cache
 *
 * Call this after permission changes to force fresh fetch.
 */
export function invalidatePermissionCache(): void {
  permissionCache = null;
}

/**
 * Get cache status for debugging
 */
export function getPermissionCacheStatus(): {
  hasCache: boolean;
  role: UserRole | null;
  age: number | null;
  isValid: boolean;
} {
  if (!permissionCache) {
    return {
      hasCache: false,
      role: null,
      age: null,
      isValid: false,
    };
  }

  const age = Date.now() - permissionCache.fetchedAt;
  return {
    hasCache: true,
    role: permissionCache.role,
    age,
    isValid: age < CACHE_TTL_MS,
  };
}
