/**
 * Representative (Meghatalmazott) Interfaces
 * FR26: Meghatalmazott kezelés cégek esetén
 */

/**
 * Meghatalmazás típusok
 */
export type AuthorizationType = 'RENTAL' | 'SERVICE' | 'BOTH';

/**
 * Meghatalmazott státusz
 */
export type RepresentativeStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

/**
 * Meghatalmazott entitás
 */
export interface Representative {
  id: string;
  partnerId: string; // A cég partner ID-ja
  tenantId: string;

  // Személyes adatok
  name: string;
  email?: string;
  phone?: string;
  position?: string; // Beosztás (pl. Ügyvezető)
  personalId?: string; // Személyi igazolvány szám

  // Meghatalmazás részletei
  authorizationType: AuthorizationType;
  isPrimary: boolean;
  validFrom: Date;
  validTo?: Date; // Ha nincs, akkor határozatlan idejű

  // Státusz
  status: RepresentativeStatus;

  // Megjegyzések
  notes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
}

/**
 * Meghatalmazott létrehozás input
 */
export interface CreateRepresentativeInput {
  partnerId: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  personalId?: string;
  authorizationType: AuthorizationType;
  isPrimary?: boolean;
  validFrom?: Date; // Ha nincs megadva, akkor most
  validTo?: Date;
  notes?: string;
  createdBy: string;
}

/**
 * Meghatalmazott frissítés input
 */
export interface UpdateRepresentativeInput {
  name?: string;
  email?: string;
  phone?: string;
  position?: string;
  authorizationType?: AuthorizationType;
  isPrimary?: boolean;
  validTo?: Date;
  notes?: string;
  updatedBy: string;
}

/**
 * Meghatalmazás visszavonás input
 */
export interface RevokeRepresentativeInput {
  revokedBy: string;
  revokeReason: string;
}

/**
 * Meghatalmazott keresési opciók
 */
export interface RepresentativeQueryOptions {
  partnerId: string;
  tenantId: string;
  status?: RepresentativeStatus;
  authorizationType?: AuthorizationType;
  onlyActive?: boolean; // Csak aktív és érvényes
  includeExpired?: boolean;
}

/**
 * Meghatalmazott ellenőrzés input
 */
export interface CheckAuthorizationInput {
  partnerId: string;
  tenantId: string;
  representativeId: string;
  requiredType: AuthorizationType;
  checkDate?: Date; // Ha nincs, akkor most
}

/**
 * Meghatalmazott ellenőrzés eredmény
 */
export interface AuthorizationCheckResult {
  isAuthorized: boolean;
  representative?: Representative;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'WRONG_TYPE' | 'NOT_YET_VALID';
}

/**
 * Meghatalmazott repository interface
 */
export interface IRepresentativeRepository {
  /**
   * Meghatalmazott létrehozása
   */
  create(input: CreateRepresentativeInput): Promise<Representative>;

  /**
   * Meghatalmazott keresése ID alapján
   */
  findById(id: string, partnerId: string, tenantId: string): Promise<Representative | null>;

  /**
   * Meghatalmazott frissítése
   */
  update(
    id: string,
    partnerId: string,
    tenantId: string,
    input: UpdateRepresentativeInput
  ): Promise<Representative>;

  /**
   * Meghatalmazás visszavonása
   */
  revoke(
    id: string,
    partnerId: string,
    tenantId: string,
    input: RevokeRepresentativeInput
  ): Promise<Representative>;

  /**
   * Meghatalmazottak listázása
   */
  findByPartner(options: RepresentativeQueryOptions): Promise<Representative[]>;

  /**
   * Elsődleges meghatalmazott keresése
   */
  findPrimary(partnerId: string, tenantId: string): Promise<Representative | null>;

  /**
   * Meghatalmazottak száma
   */
  count(partnerId: string, tenantId: string, options?: { status?: RepresentativeStatus }): Promise<number>;

  /**
   * Elsődleges flag törlése minden meghatalmazottnál
   */
  clearPrimaryFlag(partnerId: string, tenantId: string): Promise<void>;
}

/**
 * Repository injection token
 */
export const REPRESENTATIVE_REPOSITORY = Symbol('REPRESENTATIVE_REPOSITORY');
