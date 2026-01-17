/**
 * @kgc/inventory - LocationService
 * Story 9-2: K-P-D helykód rendszer
 * FR8, FR10, FR32 implementáció
 */

import { Injectable, Inject } from '@nestjs/common';
import { LOCATION_REPOSITORY } from '../interfaces/location.interface';
import type {
  LocationCode,
  LocationStructure,
  LocationQuery,
  LocationQueryResult,
  ILocationRepository,
  ParsedLocationCode,
  LocationValidationResult,
  LocationGenerationResult,
} from '../interfaces/location.interface';
import {
  CreateLocationStructureSchema,
  CreateLocationStructureInput,
  UpdateLocationStructureSchema,
  UpdateLocationStructureInput,
  GenerateLocationsSchema,
  GenerateLocationsInput,
  UpdateLocationSchema,
  UpdateLocationInput,
} from '../dto/location.dto';

/**
 * Helykód kezelő szolgáltatás
 * FR8: Raktári helyhierarchia konfiguráció
 * FR10: Helykód validáció
 * FR32: Helykód generálás partner onboarding
 */
@Injectable()
export class LocationService {
  /**
   * Maximum generálható helykódok száma egyszerre
   */
  private static readonly MAX_GENERATION_COUNT = 50000;

  /**
   * Batch méret a tömeges beszúráshoz (memória optimalizáció)
   */
  private static readonly BATCH_INSERT_SIZE = 1000;

  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly repository: ILocationRepository,
  ) {}

  // ============================================
  // STRUCTURE MANAGEMENT (FR8)
  // ============================================

  /**
   * Struktúra létrehozása raktárhoz
   */
  async createStructure(
    tenantId: string,
    input: CreateLocationStructureInput,
  ): Promise<LocationStructure> {
    // Validálás
    const validationResult = CreateLocationStructureSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Ellenőrzés: már létezik-e struktúra
    const existing = await this.repository.getStructure(tenantId, validInput.warehouseId);
    if (existing) {
      throw new Error('A raktárhoz már létezik helykód struktúra');
    }

    // Létrehozás
    return this.repository.createStructure({
      tenantId,
      warehouseId: validInput.warehouseId,
      kommandoPrefix: validInput.kommandoPrefix ?? 'K',
      polcPrefix: validInput.polcPrefix ?? 'P',
      dobozPrefix: validInput.dobozPrefix ?? 'D',
      separator: validInput.separator ?? '-',
      maxKommando: validInput.maxKommando,
      maxPolcPerKommando: validInput.maxPolcPerKommando,
      maxDobozPerPolc: validInput.maxDobozPerPolc,
    });
  }

  /**
   * Struktúra lekérdezése
   */
  async getStructure(
    tenantId: string,
    warehouseId: string,
  ): Promise<LocationStructure | null> {
    return this.repository.getStructure(tenantId, warehouseId);
  }

  /**
   * Struktúra frissítése
   */
  async updateStructure(
    structureId: string,
    tenantId: string,
    input: UpdateLocationStructureInput,
  ): Promise<LocationStructure> {
    const validationResult = UpdateLocationStructureSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const updateData: Partial<Omit<LocationStructure, 'id' | 'createdAt' | 'tenantId' | 'warehouseId'>> = {};
    const data = validationResult.data;
    if (data.kommandoPrefix !== undefined) updateData.kommandoPrefix = data.kommandoPrefix;
    if (data.polcPrefix !== undefined) updateData.polcPrefix = data.polcPrefix;
    if (data.dobozPrefix !== undefined) updateData.dobozPrefix = data.dobozPrefix;
    if (data.separator !== undefined) updateData.separator = data.separator;
    if (data.maxKommando !== undefined) updateData.maxKommando = data.maxKommando;
    if (data.maxPolcPerKommando !== undefined) updateData.maxPolcPerKommando = data.maxPolcPerKommando;
    if (data.maxDobozPerPolc !== undefined) updateData.maxDobozPerPolc = data.maxDobozPerPolc;
    return this.repository.updateStructure(structureId, tenantId, updateData);
  }

  // ============================================
  // CODE VALIDATION (FR10)
  // ============================================

  /**
   * Helykód validálás a raktár struktúrája alapján
   */
  async validateCode(
    tenantId: string,
    warehouseId: string,
    code: string,
  ): Promise<LocationValidationResult> {
    // Struktúra lekérdezése
    const structure = await this.repository.getStructure(tenantId, warehouseId);
    if (!structure) {
      return {
        isValid: false,
        errorCode: 'INVALID_FORMAT',
        errorMessage: 'Nincs definiált helykód struktúra a raktárhoz',
      };
    }

    // Parsing
    const parsed = this.parseCode(
      code,
      structure.kommandoPrefix,
      structure.polcPrefix,
      structure.dobozPrefix,
      structure.separator,
    );

    if (!parsed) {
      return {
        isValid: false,
        errorCode: 'INVALID_FORMAT',
        errorMessage: `Érvénytelen helykód formátum: ${code}`,
      };
    }

    // Tartomány ellenőrzés
    if (
      parsed.kommando > structure.maxKommando ||
      parsed.polc > structure.maxPolcPerKommando ||
      parsed.doboz > structure.maxDobozPerPolc
    ) {
      return {
        isValid: false,
        errorCode: 'OUT_OF_RANGE',
        errorMessage: `Helykód tartományon kívül: ${code}`,
        parsed,
      };
    }

    // Létezés ellenőrzés
    const location = await this.repository.findByCode(code, tenantId, warehouseId);
    if (!location) {
      return {
        isValid: false,
        errorCode: 'NOT_EXISTS',
        errorMessage: `Helykód nem létezik: ${code}`,
        parsed,
      };
    }

    // Státusz ellenőrzés
    if (location.status === 'INACTIVE') {
      return {
        isValid: false,
        errorCode: 'INACTIVE',
        errorMessage: `Helykód inaktív: ${code}`,
        parsed,
      };
    }

    return {
      isValid: true,
      parsed,
    };
  }

  /**
   * Helykód parsing
   * K1-P2-D3 formátum elemzése
   */
  parseCode(
    code: string,
    kommandoPrefix: string,
    polcPrefix: string,
    dobozPrefix: string,
    separator: string,
  ): ParsedLocationCode | null {
    // Escape regex special chars in separator
    const escapedSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build regex pattern
    // e.g., K(\d+)-P(\d+)-D(\d+)
    const pattern = new RegExp(
      `^${kommandoPrefix}(\\d+)${escapedSep}${polcPrefix}(\\d+)${escapedSep}${dobozPrefix}(\\d+)$`,
    );

    const match = code.match(pattern);
    if (!match || match.length !== 4) {
      return null;
    }

    const kommando = parseInt(match[1] ?? '', 10);
    const polc = parseInt(match[2] ?? '', 10);
    const doboz = parseInt(match[3] ?? '', 10);

    if (isNaN(kommando) || isNaN(polc) || isNaN(doboz)) {
      return null;
    }

    return {
      kommando,
      polc,
      doboz,
      original: code,
    };
  }

  /**
   * Helykód generálása komponensekből
   */
  generateCode(
    kommando: number,
    polc: number,
    doboz: number,
    kommandoPrefix: string,
    polcPrefix: string,
    dobozPrefix: string,
    separator: string,
  ): string {
    return `${kommandoPrefix}${kommando}${separator}${polcPrefix}${polc}${separator}${dobozPrefix}${doboz}`;
  }

  // ============================================
  // LOCATION GENERATION (FR32)
  // ============================================

  /**
   * Helykódok generálása partner onboarding során
   */
  async generateLocations(
    tenantId: string,
    input: GenerateLocationsInput,
  ): Promise<LocationGenerationResult> {
    // Validálás
    const validationResult = GenerateLocationsSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Mennyiség ellenőrzés
    const totalToCreate =
      validInput.kommandoCount * validInput.polcCount * validInput.dobozCount;
    if (totalToCreate > LocationService.MAX_GENERATION_COUNT) {
      throw new Error('Maximum 50,000 helykód generálható egyszerre');
    }

    // Struktúra lekérdezése vagy létrehozása
    let structure = await this.repository.getStructure(tenantId, validInput.warehouseId);
    if (!structure) {
      structure = await this.repository.createStructure({
        tenantId,
        warehouseId: validInput.warehouseId,
        kommandoPrefix: 'K',
        polcPrefix: 'P',
        dobozPrefix: 'D',
        separator: '-',
        maxKommando: validInput.kommandoCount,
        maxPolcPerKommando: validInput.polcCount,
        maxDobozPerPolc: validInput.dobozCount,
      });
    }

    // Helykódok generálása batch-elve (memória optimalizáció)
    const sampleCodes: string[] = [];
    let totalCreated = 0;
    let batch: Array<Omit<LocationCode, 'id' | 'createdAt' | 'updatedAt'>> = [];

    for (let k = 1; k <= validInput.kommandoCount; k++) {
      for (let p = 1; p <= validInput.polcCount; p++) {
        for (let d = 1; d <= validInput.dobozCount; d++) {
          const code = this.generateCode(
            k,
            p,
            d,
            structure.kommandoPrefix,
            structure.polcPrefix,
            structure.dobozPrefix,
            structure.separator,
          );

          const locationData: Omit<LocationCode, 'id' | 'createdAt' | 'updatedAt'> = {
            tenantId,
            warehouseId: validInput.warehouseId,
            code,
            kommando: k,
            polc: p,
            doboz: d,
            status: 'ACTIVE',
            currentOccupancy: 0,
            isDeleted: false,
          };
          if (validInput.capacityPerDoboz !== undefined) {
            locationData.capacity = validInput.capacityPerDoboz;
          }
          batch.push(locationData);

          // Sample codes (first 10)
          if (sampleCodes.length < 10) {
            sampleCodes.push(code);
          }

          // Batch insert ha elértük a limitet (memória optimalizáció)
          if (batch.length >= LocationService.BATCH_INSERT_SIZE) {
            const inserted = await this.repository.createLocations(batch);
            totalCreated += inserted;
            batch = []; // Batch ürítése, GC felszabadíthatja a memóriát
          }
        }
      }
    }

    // Maradék batch beszúrása
    if (batch.length > 0) {
      const inserted = await this.repository.createLocations(batch);
      totalCreated += inserted;
    }

    return {
      totalCreated,
      structureId: structure.id,
      sampleCodes,
    };
  }

  // ============================================
  // LOCATION MANAGEMENT
  // ============================================

  /**
   * Helykód frissítése
   */
  async updateLocation(
    locationId: string,
    tenantId: string,
    input: UpdateLocationInput,
  ): Promise<LocationCode> {
    const validationResult = UpdateLocationSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const existing = await this.repository.findById(locationId, tenantId);
    if (!existing || existing.isDeleted) {
      throw new Error('Helykód nem található');
    }

    const updateData: Partial<Omit<LocationCode, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'warehouseId' | 'code' | 'kommando' | 'polc' | 'doboz'>> = {};
    const data = validationResult.data;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.capacity !== undefined && data.capacity !== null) updateData.capacity = data.capacity;
    return this.repository.updateLocation(locationId, tenantId, updateData);
  }

  /**
   * Elérhető helykód keresése
   */
  async findAvailableLocation(
    tenantId: string,
    warehouseId: string,
    preferredKommando?: number,
  ): Promise<LocationCode | null> {
    const query: LocationQuery = {
      tenantId,
      warehouseId,
      availableOnly: true,
      status: 'ACTIVE',
      limit: 1,
      sortBy: 'code',
      sortOrder: 'asc',
    };

    if (preferredKommando !== undefined) {
      query.kommando = preferredKommando;
    }

    const result = await this.repository.query(query);
    return result.locations[0] ?? null;
  }

  /**
   * Foglaltság frissítése
   */
  async updateOccupancy(
    locationId: string,
    tenantId: string,
    adjustment: number,
  ): Promise<LocationCode> {
    const existing = await this.repository.findById(locationId, tenantId);
    if (!existing || existing.isDeleted) {
      throw new Error('Helykód nem található');
    }

    const newOccupancy = existing.currentOccupancy + adjustment;
    if (newOccupancy < 0) {
      throw new Error('A foglaltság nem lehet negatív');
    }

    return this.repository.updateOccupancy(locationId, tenantId, adjustment);
  }

  /**
   * Helykódok lekérdezése
   */
  async query(query: LocationQuery): Promise<LocationQueryResult> {
    return this.repository.query(query);
  }

  /**
   * Helykód törlése
   */
  async deleteLocation(locationId: string, tenantId: string): Promise<void> {
    const existing = await this.repository.findById(locationId, tenantId);
    if (!existing || existing.isDeleted) {
      throw new Error('Helykód nem található');
    }

    if (existing.currentOccupancy > 0) {
      throw new Error('Foglalt helykód nem törölhető');
    }

    await this.repository.deleteLocation(locationId, tenantId);
  }
}
