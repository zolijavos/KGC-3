# Story 6-2: PII Encryption

## Status: done

**Completed:** 2026-01-16
**Tests:** 23 passed (EncryptionService)
**Coverage:** 89.65% (encryption.service.ts)

## User Story

**Mint** adatvédelmi felelős
**Szeretnék** személyes adatok titkosítását az adatbázisban
**Hogy** GDPR megfelelő legyen a rendszer és védve legyenek az érzékeny adatok

## Acceptance Criteria

- [x] AC1: EncryptionService létrehozása AES-256-GCM titkosítással
- [x] AC2: PII mezők interface definiálva (email, phone, address, taxId, name, ssn, bankAccount)
- [x] AC3: EncryptedValue struktúra (ciphertext, iv, authTag, keyVersion)
- [x] AC4: Key rotation támogatás (rotateKey, reEncrypt, previousKey support)
- [x] AC5: Determinisztikus hash kereshetőséghez (HMAC-SHA256)

## Tasks

1. [x] Encryption interface-ek definiálása (encryption.interface.ts)
2. [x] EncryptionService implementálása (AES-256-GCM)
3. [x] Key rotation support (rotateKey, reEncrypt)
4. [x] Deterministic hash (hash, verifyHash)
5. [x] Associated data support (authenticated encryption)
6. [x] Unit tesztek (TDD - 23 tests)

## Technical Notes

- **Package**: @kgc/audit
- **FR Coverage**: FR67
- **Encryption**: AES-256-GCM (Node.js crypto)
- **Hash**: HMAC-SHA256 (deterministic, searchable)
- **Key source**: Environment variable (hex encoded, 32 bytes)

## Definition of Done

- [x] Unit tesztek PASS (70%+ coverage) ✅ 89.65%
- [x] TypeScript strict compliance
- [x] Sprint status frissítve
