import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { validate as isValidUuid } from 'uuid';
import {
  CreateRlsPolicyDto,
  RlsActivationResult,
  BulkRlsActivationResult,
  TenantSessionContext,
} from '../interfaces/rls.interface';

/**
 * Érvényes PostgreSQL identifier pattern
 * - Csak lowercase betűk, számok és underscore
 * - tenant_ prefix kötelező séma nevekhez
 */
const VALID_SCHEMA_NAME_REGEX = /^tenant_[a-z0-9_]+$/;
const VALID_TABLE_NAME_REGEX = /^[a-z_][a-z0-9_]*$/;

/**
 * Séma név validálás - SQL injection védelem
 */
function validateSchemaName(schemaName: string): void {
  if (!VALID_SCHEMA_NAME_REGEX.test(schemaName)) {
    throw new BadRequestException(`Érvénytelen séma név: ${schemaName}`);
  }
  if (schemaName.length > 63) {
    throw new BadRequestException('A séma név túl hosszú (max 63 karakter)');
  }
}

/**
 * Tábla név validálás - SQL injection védelem
 */
function validateTableName(tableName: string): void {
  if (!VALID_TABLE_NAME_REGEX.test(tableName)) {
    throw new BadRequestException(`Érvénytelen tábla név: ${tableName}`);
  }
  if (tableName.length > 63) {
    throw new BadRequestException('A tábla név túl hosszú (max 63 karakter)');
  }
}

/**
 * RlsService - Row Level Security Policy kezelés
 * @kgc/tenant - Multi-tenant RLS infrastructure
 *
 * Felelősségek:
 * - RLS policy létrehozás és törlés
 * - Session context (tenant_id) kezelés
 * - Bulk RLS aktiválás tenant sémákban
 * - SQL injection védelem
 */
@Injectable()
export class RlsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * RLS engedélyezése egy táblán
   * ALTER TABLE schema.table ENABLE ROW LEVEL SECURITY
   */
  async enableRls(schemaName: string, tableName: string): Promise<boolean> {
    validateSchemaName(schemaName);
    validateTableName(tableName);

    const sql = `ALTER TABLE "${schemaName}"."${tableName}" ENABLE ROW LEVEL SECURITY`;
    await this.prisma.$executeRawUnsafe(sql);

    return true;
  }

  /**
   * RLS policy létrehozás minden művelethez (SELECT, INSERT, UPDATE, DELETE)
   */
  async createRlsPolicy(dto: CreateRlsPolicyDto): Promise<RlsActivationResult> {
    const {
      schemaName,
      tableName,
      tenantIdColumn = 'tenant_id',
      policyNamePrefix = 'tenant_isolation',
    } = dto;

    validateSchemaName(schemaName);
    validateTableName(tableName);

    const policiesCreated: string[] = [];

    try {
      // SELECT policy - USING clause
      const selectPolicyName = `${policyNamePrefix}_select`;
      await this.prisma.$executeRawUnsafe(`
        CREATE POLICY "${selectPolicyName}" ON "${schemaName}"."${tableName}"
        FOR SELECT
        USING ("${tenantIdColumn}" = current_setting('app.current_tenant_id')::uuid)
      `);
      policiesCreated.push(selectPolicyName);

      // INSERT policy - WITH CHECK clause
      const insertPolicyName = `${policyNamePrefix}_insert`;
      await this.prisma.$executeRawUnsafe(`
        CREATE POLICY "${insertPolicyName}" ON "${schemaName}"."${tableName}"
        FOR INSERT
        WITH CHECK ("${tenantIdColumn}" = current_setting('app.current_tenant_id')::uuid)
      `);
      policiesCreated.push(insertPolicyName);

      // UPDATE policy - USING + WITH CHECK
      const updatePolicyName = `${policyNamePrefix}_update`;
      await this.prisma.$executeRawUnsafe(`
        CREATE POLICY "${updatePolicyName}" ON "${schemaName}"."${tableName}"
        FOR UPDATE
        USING ("${tenantIdColumn}" = current_setting('app.current_tenant_id')::uuid)
        WITH CHECK ("${tenantIdColumn}" = current_setting('app.current_tenant_id')::uuid)
      `);
      policiesCreated.push(updatePolicyName);

      // DELETE policy - USING clause
      const deletePolicyName = `${policyNamePrefix}_delete`;
      await this.prisma.$executeRawUnsafe(`
        CREATE POLICY "${deletePolicyName}" ON "${schemaName}"."${tableName}"
        FOR DELETE
        USING ("${tenantIdColumn}" = current_setting('app.current_tenant_id')::uuid)
      `);
      policiesCreated.push(deletePolicyName);

      return {
        schemaName,
        tableName,
        rlsEnabled: true,
        policiesCreated,
        success: true,
      };
    } catch (error) {
      return {
        schemaName,
        tableName,
        rlsEnabled: false,
        policiesCreated,
        success: false,
        error: error instanceof Error ? error.message : 'Ismeretlen hiba',
      };
    }
  }

  /**
   * RLS policy törlése egy tábláról
   */
  async dropRlsPolicy(
    schemaName: string,
    tableName: string,
    policyNamePrefix = 'tenant_isolation'
  ): Promise<boolean> {
    validateSchemaName(schemaName);
    validateTableName(tableName);

    const policyNames = [
      `${policyNamePrefix}_select`,
      `${policyNamePrefix}_insert`,
      `${policyNamePrefix}_update`,
      `${policyNamePrefix}_delete`,
    ];

    for (const policyName of policyNames) {
      try {
        await this.prisma.$executeRawUnsafe(`
          DROP POLICY IF EXISTS "${policyName}" ON "${schemaName}"."${tableName}"
        `);
      } catch {
        // Ignore errors if policy doesn't exist
      }
    }

    return true;
  }

  /**
   * Tenant context beállítása (session variable)
   * SET app.current_tenant_id = 'uuid'
   */
  async setTenantContext(
    tenantId: string,
    options?: Partial<TenantSessionContext>
  ): Promise<void> {
    if (!isValidUuid(tenantId)) {
      throw new BadRequestException('Érvénytelen tenant ID formátum');
    }

    // SECURITY: Use parameterized query to prevent SQL injection
    // Even though UUID is validated, parameterized queries are best practice
    await this.prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;

    if (options?.isSuperAdmin) {
      await this.prisma.$executeRaw`SELECT set_config('app.is_super_admin', 'true', false)`;
    }
  }

  /**
   * Tenant context törlése
   */
  async clearTenantContext(): Promise<void> {
    await this.prisma.$executeRawUnsafe('RESET app.current_tenant_id');
    await this.prisma.$executeRawUnsafe('RESET app.is_super_admin');
  }

  /**
   * Aktuális tenant context lekérdezése
   */
  async getCurrentTenant(): Promise<string | null> {
    try {
      const result = await this.prisma.$queryRaw<{ current_tenant: string }[]>`
        SELECT current_setting('app.current_tenant_id', true) as current_tenant
      `;
      return result[0]?.current_tenant ?? null;
    } catch {
      return null;
    }
  }

  /**
   * RLS engedélyezése az összes táblán egy sémában
   */
  async enableRlsOnAllTables(schemaName: string): Promise<BulkRlsActivationResult> {
    validateSchemaName(schemaName);

    // Get all tables in schema
    const tables = await this.prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schemaName}
        AND table_type = 'BASE TABLE'
    `;

    const results: RlsActivationResult[] = [];
    let tablesSuccessful = 0;
    let tablesFailed = 0;

    for (const { table_name: tableName } of tables) {
      try {
        // Enable RLS on table
        await this.enableRls(schemaName, tableName);

        // Create policies
        const policyResult = await this.createRlsPolicy({
          schemaName,
          tableName,
        });

        if (policyResult.success) {
          tablesSuccessful++;
        } else {
          tablesFailed++;
        }

        results.push(policyResult);
      } catch (error) {
        tablesFailed++;
        results.push({
          schemaName,
          tableName,
          rlsEnabled: false,
          policiesCreated: [],
          success: false,
          error: error instanceof Error ? error.message : 'Ismeretlen hiba',
        });
      }
    }

    return {
      schemaName,
      tablesProcessed: tables.length,
      tablesSuccessful,
      tablesFailed,
      results,
    };
  }

  /**
   * Super Admin bypass policy létrehozás
   */
  async createSuperAdminBypassPolicy(
    schemaName: string,
    tableName: string
  ): Promise<boolean> {
    validateSchemaName(schemaName);
    validateTableName(tableName);

    await this.prisma.$executeRawUnsafe(`
      CREATE POLICY "super_admin_bypass" ON "${schemaName}"."${tableName}"
      FOR ALL
      USING (current_setting('app.is_super_admin', true)::boolean = true)
    `);

    return true;
  }

  /**
   * RLS státusz lekérdezése egy táblán
   */
  async getRlsStatus(schemaName: string, tableName: string): Promise<boolean> {
    validateSchemaName(schemaName);
    validateTableName(tableName);

    const result = await this.prisma.$queryRaw<{ relrowsecurity: boolean }[]>`
      SELECT relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ${schemaName}
        AND c.relname = ${tableName}
    `;

    return result[0]?.relrowsecurity ?? false;
  }
}
