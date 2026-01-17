/**
 * @kgc/inventory - Location Code interfaces
 * Story 9-2: K-P-D helykód rendszer
 * FR8, FR10, FR32: Raktári helyhierarchia kezelés
 */

// ============================================
// LOCATION TYPES
// ============================================

/**
 * Helykód szint típusok
 * - KOMMANDO: Kommandó (K) - legnagyobb egység (pl. polcsor, zóna)
 * - POLC: Polc (P) - köztes szint (polc)
 * - DOBOZ: Doboz (D) - legkisebb egység (doboz, fiók)
 */
export type LocationLevelType = 'KOMMANDO' | 'POLC' | 'DOBOZ';

/**
 * Helykód státusz
 * - ACTIVE: Aktív, használható
 * - INACTIVE: Inaktív (pl. karbantartás alatt)
 * - FULL: Tele van
 */
export type LocationStatus = 'ACTIVE' | 'INACTIVE' | 'FULL';

// ============================================
// LOCATION CODE STRUCTURE
// ============================================

/**
 * Helykód struktúra definíció (raktár szintű konfiguráció)
 */
export interface LocationStructure {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Raktár ID - melyik raktárra vonatkozik */
  warehouseId: string;

  /** Kommandó prefix (pl. "K") */
  kommandoPrefix: string;

  /** Polc prefix (pl. "P") */
  polcPrefix: string;

  /** Doboz prefix (pl. "D") */
  dobozPrefix: string;

  /** Elválasztó karakter (alapértelmezett: "-") */
  separator: string;

  /** Kommandók száma (max) */
  maxKommando: number;

  /** Polcok száma per kommandó (max) */
  maxPolcPerKommando: number;

  /** Dobozok száma per polc (max) */
  maxDobozPerPolc: number;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Módosítás dátuma */
  updatedAt: Date;
}

/**
 * Egyedi helykód (konkrét pozíció)
 */
export interface LocationCode {
  /** Egyedi azonosító */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Raktár ID */
  warehouseId: string;

  /** Teljes helykód (pl. "K1-P2-D3") */
  code: string;

  /** Kommandó szám */
  kommando: number;

  /** Polc szám */
  polc: number;

  /** Doboz szám */
  doboz: number;

  /** Státusz */
  status: LocationStatus;

  /** Leírás (opcionális) */
  description?: string;

  /** Kapacitás (opcionális, db) */
  capacity?: number;

  /** Aktuális foglaltság */
  currentOccupancy: number;

  /** Létrehozás dátuma */
  createdAt: Date;

  /** Módosítás dátuma */
  updatedAt: Date;

  /** Soft delete */
  isDeleted: boolean;
}

/**
 * Parsed helykód komponensek
 */
export interface ParsedLocationCode {
  /** Kommandó szám */
  kommando: number;

  /** Polc szám */
  polc: number;

  /** Doboz szám */
  doboz: number;

  /** Eredeti kód string */
  original: string;
}

// ============================================
// LOCATION QUERY
// ============================================

/**
 * Helykód keresés szűrő
 */
export interface LocationQuery {
  /** Tenant ID (kötelező) */
  tenantId: string;

  /** Raktár ID (opcionális) */
  warehouseId?: string;

  /** Státusz szűrő */
  status?: LocationStatus | LocationStatus[];

  /** Kommandó szűrő */
  kommando?: number;

  /** Polc szűrő (kommandó-val együtt) */
  polc?: number;

  /** Csak üres helyek */
  availableOnly?: boolean;

  /** Szabad szöveges keresés */
  search?: string;

  /** Rendezés */
  sortBy?: 'code' | 'createdAt' | 'currentOccupancy';
  sortOrder?: 'asc' | 'desc';

  /** Lapozás */
  offset?: number;
  limit?: number;
}

/**
 * Helykód keresés eredmény
 */
export interface LocationQueryResult {
  locations: LocationCode[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// LOCATION GENERATION
// ============================================

/**
 * Helykód generálás opciók (FR32: partner onboarding)
 */
export interface LocationGenerationOptions {
  /** Hány kommandót generáljon */
  kommandoCount: number;

  /** Hány polcot kommandónként */
  polcCount: number;

  /** Hány dobozt polconként */
  dobozCount: number;

  /** Kapacitás per doboz (opcionális) */
  capacityPerDoboz?: number;
}

/**
 * Generálás eredmény
 */
export interface LocationGenerationResult {
  /** Létrehozott helykódok száma */
  totalCreated: number;

  /** Struktúra ID */
  structureId: string;

  /** Létrehozott helykód példák (első 10) */
  sampleCodes: string[];
}

// ============================================
// VALIDATION RESULT
// ============================================

/**
 * Helykód validáció eredmény
 */
export interface LocationValidationResult {
  /** Érvényes-e */
  isValid: boolean;

  /** Parsed komponensek (ha érvényes) */
  parsed?: ParsedLocationCode;

  /** Hibakód (ha érvénytelen) */
  errorCode?: 'INVALID_FORMAT' | 'OUT_OF_RANGE' | 'NOT_EXISTS' | 'INACTIVE';

  /** Hiba üzenet */
  errorMessage?: string;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

/**
 * Helykód repository interface
 */
export interface ILocationRepository {
  /**
   * Struktúra létrehozása
   */
  createStructure(
    structure: Omit<LocationStructure, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LocationStructure>;

  /**
   * Struktúra lekérdezése raktár alapján
   */
  getStructure(tenantId: string, warehouseId: string): Promise<LocationStructure | null>;

  /**
   * Struktúra frissítése
   */
  updateStructure(
    id: string,
    tenantId: string,
    data: Partial<Omit<LocationStructure, 'id' | 'tenantId' | 'warehouseId' | 'createdAt'>>,
  ): Promise<LocationStructure>;

  /**
   * Helykód létrehozása
   */
  createLocation(
    location: Omit<LocationCode, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<LocationCode>;

  /**
   * Több helykód létrehozása (bulk)
   */
  createLocations(
    locations: Array<Omit<LocationCode, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<number>;

  /**
   * Helykód lekérdezése kód alapján
   */
  findByCode(code: string, tenantId: string, warehouseId: string): Promise<LocationCode | null>;

  /**
   * Helykód lekérdezése ID alapján
   */
  findById(id: string, tenantId: string): Promise<LocationCode | null>;

  /**
   * Helykódok lekérdezése szűrőkkel
   */
  query(query: LocationQuery): Promise<LocationQueryResult>;

  /**
   * Helykód frissítése
   */
  updateLocation(
    id: string,
    tenantId: string,
    data: Partial<Omit<LocationCode, 'id' | 'tenantId' | 'warehouseId' | 'code' | 'createdAt'>>,
  ): Promise<LocationCode>;

  /**
   * Foglaltság frissítése
   */
  updateOccupancy(
    id: string,
    tenantId: string,
    adjustment: number,
  ): Promise<LocationCode>;

  /**
   * Helykód soft delete
   */
  deleteLocation(id: string, tenantId: string): Promise<void>;

  /**
   * Összes helykód törlése raktárból
   */
  deleteAllByWarehouse(tenantId: string, warehouseId: string): Promise<number>;
}

/**
 * Repository injection token
 */
export const LOCATION_REPOSITORY = Symbol('LOCATION_REPOSITORY');
