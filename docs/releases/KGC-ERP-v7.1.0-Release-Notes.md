# KGC ERP v7.1.0 - Kiadási Jegyzet

**Kiadás dátuma:** 2026-01-29
**Első nyilvános kiadás**

---

## Üdvözöljük a KGC ERP-ben!

A KGC ERP egy komplett vállalatirányítási rendszer kiskereskedelmi és bérleti szolgáltatásokhoz, franchise hálózat támogatással.

---

## Főbb Funkciók

### Bérlés Modul

- **Bérgép kezelés** - Készletnyilvántartás, állapotkövetés
- **Bérlési szerződések** - Rövid és hosszú távú bérlés
- **Kaució kezelés** - MyPOS integrált kártyás fizetés
- **Visszavétel** - Állapotfelmérés, kár dokumentálás

### Értékesítés (POS)

- **Pénztár** - Gyors értékesítés, vonalkód olvasás
- **Készletkezelés** - Valós idejű készletszint
- **Árképzés** - Akciók, kedvezmények kezelése

### Szerviz Modul

- **Munkalap kezelés** - Javítási folyamat követése
- **Garanciális javítás** - Makita norma szerinti elszámolás
- **Alkatrész kezelés** - Rendelés, készletfigyelés

### NAV Online Számlázás

- **Automatikus beküldés** - Számlázz.hu API integráció
- **Státusz követés** - Sikeres/hibás beküldések
- **Bizonylat típusok** - Számla, díjbekérő, sztornó

### Ügyfélkezelés (CRM)

- **Twenty CRM integráció** - Ügyfélkapcsolatok kezelése
- **Partner nyilvántartás** - Magánszemély, cég adatok
- **Hitelkeret** - Céges ügyfelek limit kezelése

### Ügyfélszolgálat

- **Chatwoot integráció** - Több csatornás support
- **Ticket kezelés** - Bejelentések nyomon követése

### HR Modul

- **Horilla HR integráció** - Dolgozói adatok kezelése
- **Munkaidő nyilvántartás** - Jelenléti ívek

---

## Technikai Jellemzők

| Jellemző            | Leírás                                 |
| ------------------- | -------------------------------------- |
| **Offline működés** | PWA - internet nélkül is használható   |
| **Többnyelvű**      | Magyar, angol felület                  |
| **Multi-tenant**    | Franchise üzletek elkülönítése         |
| **Mobilbarát**      | Reszponzív felület, mobil optimalizált |
| **Biztonság**       | RBAC jogosultságkezelés, audit napló   |

---

## Demo Hozzáférés

**Demo URL:** https://demo-kgc.mflerp.com/

### Teszt Fiókok

| Szerepkör | Email           | Jelszó      |
| --------- | --------------- | ----------- |
| Admin     | admin@kgc.hu    | admin123    |
| Operátor  | operator@kgc.hu | operator123 |

> **Megjegyzés:** A demo környezetben minden funkció kipróbálható, az adatok naponta frissülnek.

---

## Változások a 7.1.0 verzióban

### Új Funkciók

- Frontend API kliensek minden modulhoz
- POS tranzakció lista és szűrés
- Direct kontrollerek optimalizált lekérdezésekkel

### Hibajavítások

- Null check javítások a lista oldalakon
- SQL query táblanevek javítása
- Seed data bővítése értékesítési tranzakciókkal

---

## Támogatás

Kérdés vagy probléma esetén:

- **Email:** support@myforgelabs.com
- **Dokumentáció:** [docs.mflerp.com](https://docs.mflerp.com)

---

## Következő Kiadások

A fejlesztés folyamatos, a következő tervezett funkciók:

- Haladó riportok és dashboard
- Kiterjesztett offline szinkronizáció
- Push értesítések
- API dokumentáció bővítése

---

**© 2026 MyForge Labs Kft. - Minden jog fenntartva.**
