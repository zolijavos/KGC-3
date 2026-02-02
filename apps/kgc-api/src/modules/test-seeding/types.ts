/**
 * Test Seeding Types
 * Sprint 0 Blocker #1: Test Data Seeding API
 *
 * Defines the request/response types for test data seeding endpoints.
 * Used only in dev/staging environments for E2E test isolation.
 */

import { Role } from '@prisma/client';

// ============================================
// SEED REQUEST TYPES
// ============================================

export interface SeedTenantRequest {
  name?: string;
  slug?: string;
  status?: 'ACTIVE' | 'PENDING' | 'INACTIVE';
}

export interface SeedUserRequest {
  tenantId: string;
  email?: string;
  name?: string;
  role?: Role;
  password?: string;
}

export interface SeedPartnerRequest {
  tenantId: string;
  name?: string;
  type?: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  email?: string;
  phone?: string;
  taxNumber?: string;
}

export interface SeedInventoryItemRequest {
  tenantId: string;
  sku?: string;
  name?: string;
  type?: 'PRODUCT' | 'RENTAL_EQUIPMENT' | 'PART' | 'CONSUMABLE';
  currentStock?: number;
  minStock?: number;
  price?: number;
}

export interface SeedRentalRequest {
  tenantId: string;
  partnerId: string;
  itemId: string;
  startDate?: string;
  endDate?: string;
}

export interface SeedWorksheetRequest {
  tenantId: string;
  partnerId: string;
  itemId?: string;
  type?: 'WARRANTY' | 'PAID' | 'INTERNAL';
  description?: string;
}

// ============================================
// MAIN SEED REQUEST
// ============================================

export interface TestSeedRequest {
  /** Unique prefix for this test run (for cleanup) */
  testRunId: string;

  /** Tenant to create/use */
  tenant?: SeedTenantRequest;

  /** Users to create */
  users?: SeedUserRequest[];

  /** Partners to create */
  partners?: SeedPartnerRequest[];

  /** Inventory items to create */
  inventoryItems?: SeedInventoryItemRequest[];

  /** Rentals to create */
  rentals?: SeedRentalRequest[];

  /** Worksheets to create */
  worksheets?: SeedWorksheetRequest[];
}

// ============================================
// SEED RESPONSE TYPES
// ============================================

export interface SeededTenant {
  id: string;
  name: string;
  slug: string;
}

export interface SeededUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  /** Plain text password for test login */
  password: string;
  /** JWT access token for API calls (generated at seed time) */
  token: string;
}

export interface SeededPartner {
  id: string;
  name: string;
  tenantId: string;
}

export interface SeededInventoryItem {
  id: string;
  sku: string;
  name: string;
  tenantId: string;
}

export interface SeededRental {
  id: string;
  partnerId: string;
  tenantId: string;
}

export interface SeededWorksheet {
  id: string;
  partnerId: string;
  tenantId: string;
}

export interface TestSeedResponse {
  success: boolean;
  testRunId: string;
  createdAt: string;

  tenant?: SeededTenant;
  users: SeededUser[];
  partners: SeededPartner[];
  inventoryItems: SeededInventoryItem[];
  rentals: SeededRental[];
  worksheets: SeededWorksheet[];
}

// ============================================
// CLEANUP TYPES
// ============================================

export interface TestCleanupRequest {
  /** Test run ID to cleanup */
  testRunId: string;

  /** Optional: only cleanup specific entity types */
  entities?: ('tenant' | 'users' | 'partners' | 'inventoryItems' | 'rentals' | 'worksheets')[];
}

export interface TestCleanupResponse {
  success: boolean;
  testRunId: string;
  deleted: {
    tenants: number;
    users: number;
    partners: number;
    inventoryItems: number;
    rentals: number;
    worksheets: number;
  };
}
