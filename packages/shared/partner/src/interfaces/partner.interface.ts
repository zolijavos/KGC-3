/**
 * Partner Management Interfaces
 * FR25: Partner (ügyfél) törzs CRUD (magánszemély és cég)
 * FR31: Partner merge/duplicate detection
 * FR32: GDPR compliance: cascade delete, data export
 */

/**
 * Partner típusok
 */
export type PartnerType = 'INDIVIDUAL' | 'COMPANY';

/**
 * Partner státusz
 */
export type PartnerStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'DELETED' | 'SUSPENDED';

/**
 * Cím struktúra
 */
export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

/**
 * Kontakt személy (cégekhez)
 */
export interface ContactPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
}

/**
 * Partner entitás
 */
export interface Partner {
  id: string;
  tenantId: string;
  type: PartnerType;
  status: PartnerStatus;

  // Közös mezők
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  notes?: string;

  // Cég specifikus mezők
  taxNumber?: string; // Adószám
  registrationNumber?: string; // Cégjegyzékszám
  contactPersons?: ContactPerson[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Partner létrehozás input
 */
export interface CreatePartnerInput {
  tenantId: string;
  type: PartnerType;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  notes?: string;

  // Cég specifikus
  taxNumber?: string;
  registrationNumber?: string;
  contactPersons?: Omit<ContactPerson, 'id'>[];

  // Létrehozó
  createdBy: string;
}

/**
 * Partner frissítés input
 */
export interface UpdatePartnerInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: Address;
  notes?: string;
  status?: PartnerStatus;

  // Cég specifikus
  taxNumber?: string;
  registrationNumber?: string;

  // Frissítő
  updatedBy: string;
}

/**
 * Partner keresési opciók
 */
export interface PartnerQueryOptions {
  tenantId: string;
  type?: PartnerType;
  status?: PartnerStatus;
  search?: string; // Név, email, telefon keresés
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

/**
 * Partner keresés eredmény
 */
export interface PartnerQueryResult {
  items: Partner[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Duplikáció figyelmeztetés
 */
export interface DuplicateWarning {
  field: 'email' | 'phone' | 'taxNumber';
  value: string;
  existingPartnerId: string;
  existingPartnerName: string;
}

/**
 * Partner létrehozás eredmény
 */
export interface CreatePartnerResult {
  partner: Partner;
  duplicateWarnings: DuplicateWarning[];
}

/**
 * Partner repository interface
 */
export interface IPartnerRepository {
  /**
   * Partner létrehozása
   */
  create(input: CreatePartnerInput): Promise<Partner>;

  /**
   * Partner keresése ID alapján
   */
  findById(id: string, tenantId: string): Promise<Partner | null>;

  /**
   * Partner frissítése
   */
  update(id: string, tenantId: string, input: UpdatePartnerInput): Promise<Partner>;

  /**
   * Partner törlése (soft delete)
   */
  delete(id: string, tenantId: string, deletedBy: string): Promise<void>;

  /**
   * Partner végleges törlése (hard delete - GDPR)
   */
  hardDelete(id: string, tenantId: string): Promise<void>;

  /**
   * Partner keresés
   */
  query(options: PartnerQueryOptions): Promise<PartnerQueryResult>;

  /**
   * Duplikáció keresés
   */
  findDuplicates(
    tenantId: string,
    criteria: {
      email?: string;
      phone?: string;
      taxNumber?: string;
    }
  ): Promise<Partner[]>;

  /**
   * Összes partner száma
   */
  count(tenantId: string, options?: { status?: PartnerStatus }): Promise<number>;
}

/**
 * Partner repository injection token
 */
export const PARTNER_REPOSITORY = Symbol('PARTNER_REPOSITORY');
