# Story 26.1: Online Foglalás Létrehozás

Status: done

---

## Story

**Mint** ügyfél,
**szeretnék** online időpontot foglalni bérlésre vagy szervizre,
**hogy** ne kelljen telefonon vagy személyesen intéznem a foglalást.

---

## Acceptance Criteria

### AC1: Booking creation

- [x] Foglalás létrehozása típussal: RENTAL vagy SERVICE
- [x] Ügyfél adatok megadása: név, email, telefon
- [x] Kezdő és opcionális záró dátum megadása
- [x] Egy vagy több equipment hozzáadása a foglaláshoz

### AC2: Availability checking

- [x] Equipment elérhetőség ellenőrzése a megadott időszakra
- [x] Ütköző foglalások megjelenítése
- [x] Több equipment egyidejű ellenőrzése

### AC3: Time slots

- [x] Elérhető időpontok lekérdezése adott napra
- [x] Kapacitás kezelés (max 10 foglalás/nap)
- [x] Különböző slot időtartam: szerviz 1 óra, bérlés 2 óra

### AC4: Booking number generation

- [x] Automatikus foglalási szám generálás: FOG-YYYY-NNNNN
- [x] Tenant-szintű szekvencia kezelés
- [x] Confirmation token generálás

### AC5: Expiration handling

- [x] 24 órás lejárati idő beállítása
- [x] Lejárt foglalások automatikus törlése
- [x] Audit log bejegyzés lejáratkor

### AC6: Notifications

- [x] Email küldés foglalás létrehozásakor
- [x] Emlékeztető email támogatás

---

## Tasks / Subtasks

### Task 1: Interfaces és DTOs (AC: 1, 2, 3, 4) ✅

- [x] 1.1 `booking.interface.ts` - IBooking, IBookingItem, ITimeSlot, IAvailabilityCheck
- [x] 1.2 `booking.dto.ts` - CreateBookingDto, CheckAvailabilityDto, GetTimeSlotsDto Zod sémák
- [x] 1.3 BookingStatus, BookingType, PaymentStatus enums

### Task 2: Repository interfaces (AC: 1, 4, 5) ✅

- [x] 2.1 IBookingRepository - create, findById, findByBookingNumber, findByDateRange, getNextSequence
- [x] 2.2 IBookingItemRepository - createMany, findByBookingId, deleteByBookingId
- [x] 2.3 In-memory implementations

### Task 3: BookingService implementáció (AC: 1, 2, 3, 4, 5, 6) ✅

- [x] 3.1 `booking.service.ts` - createBooking() metódus
- [x] 3.2 checkAvailability() - equipment elérhetőség ellenőrzés
- [x] 3.3 getTimeSlots() - időpontok lekérdezése
- [x] 3.4 getBookingByNumber() - foglalás lekérdezése
- [x] 3.5 expirePendingBookings() - lejárt foglalások kezelése

### Task 4: Unit tesztek (AC: all) ✅

- [x] 4.1 `booking.service.spec.ts` - 11 teszt
- [x] 4.2 Sikeres foglalás létrehozás teszt
- [x] 4.3 Validációs hibák tesztje
- [x] 4.4 Equipment nem elérhető teszt
- [x] 4.5 Időpont lekérdezés teszt
- [x] 4.6 Lejárat kezelés teszt

### Task 5: API Controller (AC: all) ✅

- [x] 5.1 `online-booking.controller.ts` - REST endpoints
- [x] 5.2 POST /bookings - foglalás létrehozás
- [x] 5.3 POST /bookings/check-availability - elérhetőség
- [x] 5.4 GET /bookings/time-slots - időpontok
- [x] 5.5 GET /bookings/:bookingNumber - lekérdezés

### Task 6: Controller tesztek (AC: all) ✅

- [x] 6.1 `online-booking.controller.spec.ts` - API endpoint tesztek
- [x] 6.2 Sikeres endpoint tesztek
- [x] 6.3 BadRequestException tesztek
- [x] 6.4 NotFoundException tesztek
- [x] 6.5 ForbiddenException tesztek

---

## Test Results

| Test Suite                        | Tests | Status  |
| --------------------------------- | ----- | ------- |
| booking.service.spec.ts           | 11    | ✅ Pass |
| online-booking.controller.spec.ts | 19    | ✅ Pass |

Total: **30 tests passing**

---

## Technical Notes

- Package: `@kgc/online-booking`
- Location: `packages/integration/online-booking/`
- Dependencies: @nestjs/common, zod
- Booking status machine: PENDING → CONFIRMED/EXPIRED/CANCELLED

---

## Definition of Done

- [x] Acceptance criteria kielégítve
- [x] Unit tesztek írva és sikeresek
- [x] Controller tesztek írva és sikeresek
- [x] TypeScript strict mode hiba nincs
- [x] Audit trail implementálva
