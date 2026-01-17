# Story 6-1: Audit Log Service

## Status: done

**Completed:** 2026-01-16
**Tests:** 23 passed (AuditService)
**Coverage:** 100% (audit.service.ts)

## User Story

**Mint** rendszergazda
**Szeretnék** minden kritikus műveletről audit naplót
**Hogy** nyomon követhessem a bérlési, szerviz és értékesítési műveleteket

## Acceptance Criteria

- [x] AC1: AuditService létrehozása audit napló bejegyzések kezelésére
- [x] AC2: Audit rekord struktúra: userId, action, entityType, entityId, timestamp, changes (before/after), reason
- [x] AC3: Helper metodusok: logCreate, logUpdate, logDelete, logOverride (FR70)
- [x] AC4: Tenant-aware audit logging (minden bejegyzés tenant-hez kötött)
- [x] AC5: Batch insert támogatás nagyobb műveletekhez

## Tasks

1. [x] Audit interface-ek definiálása (audit.interface.ts)
2. [x] AuditService implementálása
3. [x] Helper metodusok (logCreate, logUpdate, logDelete, logOverride)
4. [x] Repository interface és injection token (AUDIT_REPOSITORY)
5. [x] Unit tesztek (TDD - 23 tests)
6. [x] Zod DTO validáció (audit.dto.ts)

## Technical Notes

- **Package**: @kgc/audit
- **FR Coverage**: FR65, FR66, FR70
- **TDD kötelező**: Minden audit logika tesztelve
- **Tenant isolation**: Minden audit bejegyzés tenant_id-vel

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage) ✅ 100%
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
