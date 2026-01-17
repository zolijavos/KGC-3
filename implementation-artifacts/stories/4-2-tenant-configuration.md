# Story 4-2: Tenant Configuration

## Status: done

**Completed:** 2026-01-16
**Tests:** 16 passed (TenantConfigService)
**Coverage:** Part of @kgc/config package

## User Story

**Mint** tenant adminisztrátor
**Szeretnék** tenant-specifikus konfigurációt kezelni
**Hogy** minden bolt/franchise saját beállításokkal működhessen

## Acceptance Criteria

- [x] AC1: TenantConfigService a ConfigService-re épülve
- [x] AC2: Tenant-specifikus konfiguráció felülírja a globálisat
- [x] AC3: Konfiguráció öröklés: global → tenant (getStringWithFallback, etc.)
- [x] AC4: Tenant feature flag override (isFeatureEnabledWithFallback)
- [x] AC5: Bulk config import/export tenant-enként (exportConfig, importConfig)

## Tasks

1. [x] TenantConfigService implementálása
2. [x] Config inheritance logic (global → tenant)
3. [x] Tenant feature flag override
4. [x] Unit tesztek (16 tests)
5. [ ] Integration teszt (deferred)

## Technical Notes

- **Package**: @kgc/config
- **Dependencies**: ConfigService, FeatureFlagService
- **Pattern**: Decorator pattern - TenantConfigService wraps ConfigService
- **TDD**: Config inheritance logic

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage)
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
