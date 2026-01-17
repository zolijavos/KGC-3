# Story 6-3: GDPR Cascade Delete

## Status: done

**Completed:** 2026-01-16
**Tests:** 20 passed (DataDeletionService)
**Coverage:** 70.37% (data-deletion.service.ts)

## User Story

**Mint** adatvédelmi felelős
**Szeretnék** GDPR elfeledtetési jog implementálását
**Hogy** az ügyfelek kérhessék személyes adataik törlését

## Acceptance Criteria

- [x] AC1: DataDeletionService létrehozása kaszkád törlés kezelésére
- [x] AC2: Entity függőségi gráf kezelés (registerEntity, dependentEntities)
- [x] AC3: Soft delete támogatás (SOFT_DELETE strategy)
- [x] AC4: Anonymization alternatíva (ANONYMIZE strategy)
- [x] AC5: Deletion request audit log (minden kérés auditálva)

## Tasks

1. [x] DataDeletion interface-ek definiálása (data-deletion.interface.ts)
2. [x] DataDeletionService implementálása
3. [x] Entity dependency registry (registerEntity)
4. [x] Stratégiák: CASCADE, ANONYMIZE, SOFT_DELETE, RETAIN
5. [x] Deletion audit logging (AuditService integration)
6. [x] Unit tesztek (TDD - 20 tests)

## Technical Notes

- **Package**: @kgc/audit
- **FR Coverage**: FR68
- **Stratégiák**: CASCADE (törlés), ANONYMIZE (PII törlés), SOFT_DELETE (deleted_at), RETAIN (megtartás)
- **Legal retention**: Pénzügyi rekordok RETAIN stratégiával

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage) ✅ 70.37%
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
