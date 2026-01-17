import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Valid PostgreSQL schema name pattern
 * Only allows: tenant_ prefix + alphanumeric + underscore
 */
const VALID_SCHEMA_NAME_REGEX = /^tenant_[a-z0-9_]+$/;

/**
 * Validates schema name to prevent SQL injection
 * @throws BadRequestException if invalid
 */
function validateSchemaName(schemaName: string): void {
  if (!VALID_SCHEMA_NAME_REGEX.test(schemaName)) {
    throw new BadRequestException(`Érvénytelen séma név: ${schemaName}`);
  }
  // Max length check (PostgreSQL limit is 63)
  if (schemaName.length > 63) {
    throw new BadRequestException('A séma név túl hosszú (max 63 karakter)');
  }
}

/**
 * SchemaService - PostgreSQL séma kezelés tenant-ekhez
 * @kgc/tenant - Multi-tenant infrastructure
 *
 * Felelősségek:
 * - Tenant séma létrehozás (tenant_X)
 * - Séma migrációk futtatása
 * - Séma törlés (admin only)
 * - Slug → schema name konverzió
 *
 * SECURITY: All schema names are validated against SQL injection
 */
@Injectable()
export class SchemaService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * PostgreSQL séma létrehozás tenant számára
   *
   * @param tenantId - Tenant UUID
   * @param slug - Tenant slug (URL-safe azonosító)
   * @returns true ha sikeres
   */
  async createTenantSchema(tenantId: string, slug: string): Promise<boolean> {
    const schemaName = this.slugToSchemaName(slug);

    // SECURITY: Validate schema name to prevent SQL injection
    validateSchemaName(schemaName);

    try {
      // Séma létrehozás - raw SQL (safe after validation)
      await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

      // Tenant rekord frissítése séma információval
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          schemaName,
          schemaCreatedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new BadRequestException('Séma már létezik');
      }
      throw error;
    }
  }

  /**
   * Séma migrációk futtatása - alaptáblák létrehozása
   *
   * @param _tenantId - Tenant UUID (reserved for future audit logging)
   * @param schemaName - PostgreSQL séma neve
   * @returns true ha sikeres
   */
  async runSchemaMigrations(_tenantId: string, schemaName: string): Promise<boolean> {
    // SECURITY: Validate schema name to prevent SQL injection
    validateSchemaName(schemaName);

    try {
      // Search path beállítása a tenant sémára
      await this.prisma.$executeRawUnsafe(`SET search_path TO ${schemaName}`);

      // Alaptáblák létrehozása a tenant sémában
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.partner (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          tax_number VARCHAR(20),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Visszaállítás public sémára
      await this.prisma.$executeRawUnsafe('SET search_path TO public');

      return true;
    } catch (error) {
      // Visszaállítás public sémára hiba esetén is
      try {
        await this.prisma.$executeRawUnsafe('SET search_path TO public');
      } catch {
        // Ignore error during cleanup
      }

      if (error instanceof Error && error.message.includes('does not exist')) {
        throw new BadRequestException('Séma nem létezik');
      }
      throw error;
    }
  }

  /**
   * Tenant séma törlése (CASCADE)
   * FIGYELEM: Ez végleges művelet, minden adat törlődik!
   *
   * @param tenantId - Tenant UUID
   * @param schemaName - PostgreSQL séma neve
   * @returns true ha sikeres
   */
  async dropTenantSchema(tenantId: string, schemaName: string): Promise<boolean> {
    // SECURITY: Validate schema name to prevent SQL injection
    validateSchemaName(schemaName);

    try {
      // Séma törlés CASCADE-del (minden tábla és adat törlődik)
      await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);

      // Tenant rekord frissítése - séma információ törlése
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          schemaName: null,
          schemaCreatedAt: null,
        },
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Slug konvertálása valid PostgreSQL séma névvé
   *
   * Szabályok:
   * - Prefix: "tenant_"
   * - Kötőjelek cseréje aláhúzásra
   * - Kisbetűs
   *
   * @param slug - Tenant slug (pl. "kgc-szeged")
   * @returns PostgreSQL séma név (pl. "tenant_kgc_szeged")
   */
  slugToSchemaName(slug: string): string {
    // Kötőjelek cseréje aláhúzásra, prefix hozzáadása
    return `tenant_${slug.replace(/-/g, '_')}`;
  }

  /**
   * Ellenőrzi, hogy egy séma létezik-e
   *
   * @param schemaName - PostgreSQL séma neve
   * @returns true ha létezik
   */
  async schemaExists(schemaName: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.schemata
        WHERE schema_name = ${schemaName}
      ) as exists
    `;

    return result[0]?.exists ?? false;
  }
}
