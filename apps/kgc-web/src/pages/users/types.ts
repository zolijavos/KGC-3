// User és Role típusok

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  module: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  isSystem: boolean; // Rendszer szerepkör (nem törölhető)
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  status: UserStatus;

  // Szerepkörök
  roles: string[]; // Role IDs
  primaryRole: string; // Fő szerepkör ID

  // Tenant (franchise)
  tenantId: string;
  tenantName: string;

  // Bejelentkezés
  lastLoginAt?: string;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;

  // Beállítások
  locale: string;
  timezone: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    emailNotifications: boolean;
  };

  // PIN kód (kiosk módhoz)
  hasPinCode: boolean;

  // Meta
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UserListFilters {
  search: string;
  status: UserStatus | 'all';
  role: string | 'all';
  tenant: string | 'all';
}

// Permission modulok
export type PermissionModule =
  | 'auth'
  | 'users'
  | 'partners'
  | 'inventory'
  | 'rental'
  | 'sales'
  | 'service'
  | 'reports'
  | 'settings';
