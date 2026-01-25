# Epic 34: Járműnyilvántartás (@kgc/vehicles)

## Összefoglaló

| Mező                   | Érték         |
| ---------------------- | ------------- |
| **Epic ID**            | E-VEHICLE-01  |
| **Package**            | @kgc/vehicles |
| **Prioritás**          | P0 - MVP      |
| **Kapcsolódó ADR**     | ADR-027       |
| **Becsült Story szám** | 6-8           |

## Üzleti Kontextus

A KGC ERP rendszerben két különböző járműtípus nyilvántartására van szükség:

1. **Bérgép járművek** (utánfutók, aggregátorok) - tenant-specifikus, bérbe adhatók
2. **Céges gépkocsik** (személyautók, furgonok) - központi, dokumentumkövetés

### Jelenlegi Probléma

- Nincs járműnyilvántartás a rendszerben
- Lejáró dokumentumokról nincs automatikus értesítés
- Manuális Excel táblázatban követik a járműveket

### Megoldás

- Két külön tábla a tiszta szétválasztásért (ADR-027 Opció B)
- Automatikus 30/60 napos emlékeztetők lejáró dokumentumokról
- Push + email dupla csatornás értesítések

---

## Scope

### Benne van (In Scope)

- Bérgép járművek CRUD (utánfutók, aggregátorok)
- Céges gépkocsik CRUD (személyautók, furgonok)
- Dokumentum lejárat követés (műszaki, biztosítás, pályamatrica)
- Automatikus emlékeztetők (30/60 nap)
- Bérgép modulhoz kapcsolás

### Nincs benne (Out of Scope - ADR-027 döntés)

- Üzemanyag kártya nyilvántartás
- Kilométer tracking
- GPS integráció
- Jogosítvány kategória ellenőrzés
- Szerviznapló
- Tankolási napló

---

## Story Breakdown

### Story 34-1: Bérgép Jármű CRUD

**Leírás:** Bérgép járművek (utánfutók, aggregátorok) alapvető kezelése.

**Acceptance Criteria:**

- [ ] Létrehozás: rendszám, típus, márka, modell, leírás
- [ ] Listázás: tenant-szűrt, státusz szűrő, típus szűrő
- [ ] Részletek: dokumentum lejáratok megjelenítése
- [ ] Módosítás: összes mező frissíthető
- [ ] Törlés: soft delete

**API Endpoints:**

- `GET /api/rental-vehicles` - Lista
- `GET /api/rental-vehicles/:id` - Részletek
- `POST /api/rental-vehicles` - Létrehozás
- `PATCH /api/rental-vehicles/:id` - Módosítás
- `DELETE /api/rental-vehicles/:id` - Törlés

---

### Story 34-2: Céges Gépkocsi CRUD

**Leírás:** Céges gépkocsik (személyautók, furgonok) kezelése.

**Acceptance Criteria:**

- [ ] Létrehozás: rendszám, típus, márka, modell, évjárat, alvázszám
- [ ] Listázás: globális + tenant hozzárendelés szűrő
- [ ] Részletek: összes dokumentum és biztosítás megjelenítése
- [ ] Hozzárendelés: tenant és felhasználó hozzárendelés
- [ ] Biztosítás adatok: KGFB + CASCO kötvényszám, biztosító, lejárat

**API Endpoints:**

- `GET /api/company-vehicles` - Lista
- `GET /api/company-vehicles/:id` - Részletek
- `POST /api/company-vehicles` - Létrehozás (admin only)
- `PATCH /api/company-vehicles/:id` - Módosítás
- `PATCH /api/company-vehicles/:id/assign` - Hozzárendelés

---

### Story 34-3: Dokumentum Lejárat Kezelés

**Leírás:** Műszaki vizsga, biztosítások, pályamatrica lejáratának kezelése.

**Acceptance Criteria:**

- [ ] Bérgép járművek: forgalmi, műszaki vizsga lejárat
- [ ] Céges járművek: + KGFB, CASCO, pályamatrica lejárat
- [ ] Lejáró dokumentumok listázása (/api/vehicles/expiring-documents)
- [ ] Szűrés: 30/60 napon belül lejáró

---

### Story 34-4: Automatikus Emlékeztetők

**Leírás:** Lejáró dokumentumokról automatikus értesítés küldése.

**Acceptance Criteria:**

- [ ] Napi CRON job (06:00) - lejáró dokumentumok ellenőrzése
- [ ] 60 napos emlékeztető - első értesítés
- [ ] 30 napos emlékeztető - második értesítés
- [ ] Push notification küldés (PWA)
- [ ] Email küldés admin/boltvezető címzetteknek
- [ ] Emlékeztető log mentése (nem küld duplikátumot)

**Címzettek:**

- Bérgép jármű → Boltvezető + Tenant admin
- Céges gépkocsi → Hozzárendelt user + Central admin

---

### Story 34-5: Bérgép Modul Kapcsolás

**Leírás:** Bérgép járművek összekapcsolása a bérgép modullal.

**Acceptance Criteria:**

- [ ] Bérgép jármű kapcsolható RentalEquipment-hez
- [ ] Egy jármű egy bérgéphez tartozhat
- [ ] Kapcsolat megjelenítése mindkét oldalon
- [ ] API: `PATCH /api/rental-vehicles/:id/link-bergep`

---

### Story 34-6: Jogosultsági Rendszer

**Leírás:** Eltérő hozzáférési szintek a két kategóriához (ADR-027 mátrix).

**Bérgép Járművek:**
| Szerepkör | Listázás | Létrehozás | Módosítás | Törlés |
|-----------|----------|------------|-----------|--------|
| SUPER_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| CENTRAL_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| FRANCHISE_ADMIN | ✅ Saját tenant | ✅ | ✅ | ✅ |
| BRANCH_MANAGER | ✅ Saját bolt | ✅ | ✅ | ❌ |
| SENIOR_OPERATOR | ✅ Saját bolt | ❌ | ❌ | ❌ |
| OPERATOR | ❌ | ❌ | ❌ | ❌ |

**Céges Gépkocsik:**
| Szerepkör | Listázás | Létrehozás | Módosítás | Törlés |
|-----------|----------|------------|-----------|--------|
| SUPER_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| CENTRAL_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| FRANCHISE_ADMIN | ✅ Saját tenant | ❌ | ❌ | ❌ |
| BRANCH_MANAGER | ✅ Saját bolt | ❌ | ✅ Részleges | ❌ |
| OPERATOR | ✅ Opcionális | ❌ | ❌ | ❌ |

---

## Technikai Specifikáció

### Prisma Modellek

```prisma
model RentalVehicle {
  id, tenantId, licensePlate, vehicleType, brand, model
  rentalEquipmentId (optional relation)
  registrationDocNumber, registrationValidUntil
  technicalInspectionUntil
  status, notes, createdBy, createdAt, updatedAt
}

model CompanyVehicle {
  id, licensePlate, vehicleType, brand, model, yearOfManufacture, vin
  assignedTenantId, assignedUserId
  registrationDocNumber, registrationValidUntil, technicalInspectionUntil
  kgfbPolicyNumber, kgfbInsurer, kgfbValidUntil
  cascoPolicyNumber, cascoInsurer, cascoValidUntil
  highwayStickerCategory, highwayStickerUntil
  status, notes, createdBy, createdAt, updatedAt
}

model VehicleDocumentReminder {
  id, rentalVehicleId, companyVehicleId (polymorphic)
  documentType, expiryDate, reminderDaysBefore
  notificationSentAt, notificationType, sentToUserIds
  createdAt
}
```

### Package Struktúra

```
packages/shared/vehicles/
├── src/
│   ├── index.ts
│   ├── interfaces/
│   │   ├── rental-vehicle.interface.ts
│   │   ├── company-vehicle.interface.ts
│   │   └── vehicle-reminder.interface.ts
│   ├── dto/
│   │   ├── rental-vehicle.dto.ts
│   │   └── company-vehicle.dto.ts
│   ├── repositories/
│   │   ├── rental-vehicle.repository.ts
│   │   └── company-vehicle.repository.ts
│   └── services/
│       ├── rental-vehicle.service.ts
│       ├── company-vehicle.service.ts
│       └── vehicle-reminder.service.ts
├── package.json
└── tsconfig.json
```

---

## Függőségek

### Bemeneti Függőségek

| Epic     | Leírás            | Szükséges                             |
| -------- | ----------------- | ------------------------------------- |
| Epic 1-2 | Auth + Users      | ✅ Kész                               |
| Epic 3   | Tenant Management | ✅ Kész                               |
| Epic 13  | Rental Equipment  | 🟡 In Progress (opcionális kapcsolat) |

### Kimeneti Függőségek

Nincs - önálló modul.

---

## Acceptance Criteria (Epic szint)

- [ ] Bérgép járművek CRUD működik
- [ ] Céges gépkocsik CRUD működik
- [ ] Dokumentum lejáratok követése működik
- [ ] Automatikus emlékeztetők működnek (30/60 nap)
- [ ] Push + email értesítések működnek
- [ ] Jogosultságok megfelelőek
- [ ] TypeScript build sikeres
- [ ] Unit tesztek 80%+ coverage

---

## Változásnapló

| Verzió | Dátum      | Változás                        |
| ------ | ---------- | ------------------------------- |
| 1.0    | 2026-01-25 | Epic létrehozva ADR-027 alapján |
