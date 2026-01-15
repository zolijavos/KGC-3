# ADR-006: Bérlés Audit Trail Strategy

**Státusz:** Accepted
**Dátum:** 2025-12-08
**Döntéshozók:** Architect, PM, Legal
**Kapcsolódó:** ADR-001 (Multi-tenancy)

---

## Kontextus

A KGC ERP v3 rendszerben a bérlési folyamat során szükséges nyomon követni, hogy **ki adta ki** és **ki vette vissza** fizikailag a gépet. Az ügyfél megjegyzése:

> *"A kiadáskor és a visszavételkor lehessen jelölni, hogy személy szerint ki adta ki és ki vette vissza a gépet (Péter, Levente stb). Ez csak belsős infó lenne a felelősségrevonás miatt. Sok a figyelmetlenül visszavett gép, ami később derül ki és nem érvényesíthető a kár senki felé..."*

A jelenlegi rendszer csak a **rendszerben bejelentkezett** felhasználót rögzíti, ami nem feltétlenül azonos a **fizikailag átadó/átvevő** személlyel.

---

## Döntési Kérdés

**Elegendő-e egyszerű FK mezők (kiadta_user_id, visszavette_user_id), vagy szükséges részletes audit log tábla?**

---

## Döntési Tényezők

1. **Felelősség megállapítás** - Kár esetén bizonyítható legyen ki volt a felelős
2. **Többszörös átadás** - Egy bérlés során többször is átadhatják a gépet
3. **Időbélyeg fontossága** - Nem csak a személy, hanem a pontos időpont is fontos
4. **GDPR compliance** - Személyes adatok megőrzési időszaka
5. **Jogi követelmények** - Ptk. 5 éves elévülési idő

---

## Vizsgált Opciók

### Opció A: Egyszerű FK Mezők

**Leírás:** Csak két FK mező a BÉRLÉS táblában.

```sql
ALTER TABLE BÉRLÉS
  ADD COLUMN kiadta_fizikai_user_id INT,
  ADD COLUMN visszavette_fizikai_user_id INT;
```

**Előnyök:**
- ✅ Egyszerű implementáció
- ✅ Gyors lekérdezés

**Hátrányok:**
- ❌ Nincs történet (csak az utolsó állapot)
- ❌ Nincs időbélyeg
- ❌ Többszörös átadás nem követhető

---

### Opció B: Audit Log Tábla (Javasolt)

**Leírás:** Külön tábla minden esemény rögzítésére.

```sql
CREATE TABLE BÉRLÉS_AUDIT_LOG (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  berles_id INT NOT NULL,
  event_type ENUM('kiadas', 'visszavetel', 'kar', 'megjegyzes', 'statusz') NOT NULL,
  event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INT NOT NULL,
  event_description TEXT,
  foto_url VARCHAR(500),
  kar_osszeg DECIMAL(10,2),
  ...
);
```

**Előnyök:**
- ✅ Teljes történet
- ✅ Időbélyegek minden eseményhez
- ✅ Többszörös átadás követhető
- ✅ Fotók csatolhatók (kár esetén)

**Hátrányok:**
- ❌ Komplexebb implementáció
- ❌ Több tárhely

---

### Opció C: Hybrid (FK + Audit Log)

**Leírás:** FK mezők a gyors lekérdezéshez + audit log a részletekhez.

**Előnyök:**
- ✅ Gyors alap lekérdezések
- ✅ Részletes történet is elérhető

**Hátrányok:**
- ❌ Duplikált adatok
- ❌ Konzisztencia fenntartás szükséges

---

## Döntés

**Választott opció: Opció B - Audit Log Tábla**

### Indoklás

1. **Felelősség:** A kárfelelősség megállapításához teljes történet kell, nem csak az utolsó állapot
2. **Jogi védelem:** 5 éves elévülési idő miatt hosszú távú bizonyítékokra van szükség
3. **Többszörös átadás:** Egy bérlés során a gépet többször is átadhatják (pl. műszakváltáskor)
4. **Fotó dokumentáció:** Kár esetén fotó csatolás kritikus bizonyíték

---

## Implementációs Terv

### 1. Adatbázis Séma

```sql
CREATE TABLE BÉRLÉS_AUDIT_LOG (
  -- Azonosítók
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id UUID NOT NULL,
  berles_id INT NOT NULL,

  -- Esemény típus
  event_type ENUM(
    'kiadas',           -- Gép fizikai kiadása
    'visszavetel',      -- Gép fizikai visszavétele
    'kar_rogzites',     -- Kár rögzítése
    'kar_foto',         -- Kár fotó hozzáadása
    'megjegyzes',       -- Belső megjegyzés
    'statusz_valtozas', -- Státusz változás
    'kaucio_benntartas' -- Kaució benntartás
  ) NOT NULL,

  -- Időbélyeg és felhasználó
  event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INT NOT NULL,

  -- Esemény részletek
  event_description TEXT,

  -- Kár specifikus mezők
  kar_tipus VARCHAR(100),        -- "karcolás", "törés", "hiány"
  kar_osszeg DECIMAL(10,2),      -- Becsült kár összeg
  foto_url VARCHAR(500),         -- Fotó link (S3/GCS)

  -- Előző/új érték (státusz változásnál)
  previous_value VARCHAR(100),
  new_value VARCHAR(100),

  -- IP és device info (audit célra)
  ip_address VARCHAR(45),
  device_info VARCHAR(200),

  -- Kapcsolatok
  FOREIGN KEY (berles_id) REFERENCES BÉRLÉS(berles_id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES FELHASZNÁLÓ(felhasznalo_id),

  -- Indexek
  INDEX idx_audit_berles (berles_id),
  INDEX idx_audit_timestamp (event_timestamp),
  INDEX idx_audit_event_type (event_type),
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_tenant_date (tenant_id, event_timestamp)
);
```

### 2. Automatikus Audit Trigger

```sql
-- Trigger: Bérlés státusz változás automatikus naplózása
DELIMITER //
CREATE TRIGGER berles_statusz_audit
AFTER UPDATE ON BÉRLÉS
FOR EACH ROW
BEGIN
  IF OLD.statusz != NEW.statusz THEN
    INSERT INTO BÉRLÉS_AUDIT_LOG (
      tenant_id, berles_id, event_type, user_id,
      event_description, previous_value, new_value
    ) VALUES (
      NEW.tenant_id, NEW.berles_id, 'statusz_valtozas',
      @current_user_id,  -- Session változó
      CONCAT('Státusz változás: ', OLD.statusz, ' → ', NEW.statusz),
      OLD.statusz, NEW.statusz
    );
  END IF;
END //
DELIMITER ;
```

### 3. API Endpoint-ok

```typescript
// Kiadás rögzítése
POST /api/berles/{id}/audit/kiadas
{
  "fizikai_user_id": 5,
  "megjegyzes": "Minden rendben, gép tiszta állapotban",
  "foto_url": null
}

// Visszavétel rögzítése
POST /api/berles/{id}/audit/visszavetel
{
  "fizikai_user_id": 7,
  "megjegyzes": "Kisebb karcolások a burkolaton",
  "kar_tipus": "karcolás",
  "kar_osszeg": 5000,
  "foto_url": "https://s3.../kar-foto-123.jpg"
}

// Audit log lekérdezése
GET /api/berles/{id}/audit
// Response: teljes eseménynapló időrendi sorrendben
```

### 4. UI Megjelenítés

```
┌─────────────────────────────────────────────────────────────┐
│  BÉRLÉS #12345 - Audit Napló                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 2025-12-08 09:15:23                                     │
│  🟢 KIADÁS - Péter (fizikailag)                             │
│  "Gép tiszta állapotban kiadva, tartozékok rendben"         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📅 2025-12-10 16:42:11                                     │
│  🔴 VISSZAVÉTEL - Levente (fizikailag)                      │
│  "Karcolások a burkolaton"                                  │
│  💰 Becsült kár: 5.000 Ft                                   │
│  📷 [Fotó megtekintése]                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📅 2025-12-10 16:45:00                                     │
│  💰 KAUCIÓ BENNTARTÁS - Levente                             │
│  "Kaució benntartva kár kivizsgálásáig: 15.000 Ft"          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Adatmegőrzési Politika

### GDPR Megfelelőség

| Adat típus | Megőrzési idő | Jogalap |
|------------|---------------|---------|
| Audit log (normál) | 5 év | Jogos érdek (Ptk. elévülés) |
| Kár fotók | 5 év | Jogos érdek (bizonyíték) |
| IP címek | 1 év | Jogos érdek (biztonság) |

### Automatikus Törlés

```sql
-- Napi job: 5 évnél régebbi audit log törlése
DELETE FROM BÉRLÉS_AUDIT_LOG
WHERE event_timestamp < DATE_SUB(CURDATE(), INTERVAL 5 YEAR);

-- Napi job: 1 évnél régebbi IP címek anonimizálása
UPDATE BÉRLÉS_AUDIT_LOG
SET ip_address = 'ANONYMIZED'
WHERE event_timestamp < DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
  AND ip_address != 'ANONYMIZED';
```

---

## Következmények

### Pozitív
- Teljes felelősség nyomkövetés
- Jogi bizonyíték kár esetén
- Fotó dokumentáció
- Időbélyeges történet

### Negatív
- Nagyobb tárhely igény (~50 MB/év/tenant)
- Komplexebb implementáció
- GDPR törlési kötelezettség

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Adatvesztés | Alacsony | Kritikus | Backup, replikáció |
| GDPR megsértés | Közepes | Magas | Auto törlés job |
| Tárhely túlcsordulás | Alacsony | Közepes | Monitoring, archiválás |

---

## Kapcsolódó Döntések

- **ADR-001:** Multi-tenancy - tenant_id minden audit rekordban
- **ADR-005:** MyPos - Token hozzáférés is naplózva

---

## Függőben Lévő Kérdések

1. ⏳ **Megőrzési idő:** 1, 3, vagy 5 év? (Ügyfél kérdés #6)
2. ⏳ **Fotó tárolás:** S3, GCS, vagy Azure Blob?
3. ⏳ **Archiválás:** Törlés vagy cold storage?

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2025-12-08 | Első verzió - Proposed státusz |
| 1.1 | 2025-12-09 | Státusz: Accepted |
