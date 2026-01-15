# ADR-021: Helykövetés (Polc-Doboz-Raklap) Hierarchia

## Státusz

**ELFOGADVA** - 2025. december 31.

## Kontextus

A raktár mérete nagy (100+ polc, 2000+ slot) + több lokáció (franchise boltok). Szükséges 3-szintű hierarchikus helykövetés: Polc → Doboz → Raklap.

### Üzleti Követelmények

1. **Méret**: 100+ polc, 2000+ storage slot
2. **Multi-location**: Franchise boltok (több raktár)
3. **3-szintű hierarchia**: Polc (rack) → Doboz (box) → Raklap (pallet)
4. **Vonalkód**: Minden szinten egyedi kód
5. **Kapacitás tracking**: Max vs jelenlegi tárolt mennyiség

## Döntések

### 1. Adatmodell

**Döntés:** Relational (PostgreSQL) + Hierarchikus FK-k

**Indoklás:**
- **PostgreSQL elegendő**: Nem kell graph DB
- **FK constraints**: Data integrity
- **Tenant isolation**: Multi-location support
- **Query performance**: Index optimalizálás

**Implementáció:**

```sql
-- Lokáció (franchise bolt)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL, -- "KGC Érd", "KGC Győr"
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Polc (Rack / Aisle)
CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  rack_code VARCHAR(20) NOT NULL, -- "K1", "K2", "A-12"
  row_number INT,
  aisle_number INT,
  max_shelves INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(location_id, rack_code)
);

-- Polc szint (Shelf level within rack)
CREATE TABLE shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  shelf_code VARCHAR(20) NOT NULL, -- "P1", "P2", "P5"
  shelf_level INT NOT NULL, -- 1, 2, 3, 4, 5
  max_boxes INT DEFAULT 20,
  max_weight_kg DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(rack_id, shelf_code)
);

-- Doboz / Tároló (Box / Bin)
CREATE TABLE boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  box_code VARCHAR(20) NOT NULL, -- "D-17", "BOX-A3"
  box_type VARCHAR(50), -- "plastic_bin", "cardboard", "metal_cage"
  max_items INT DEFAULT 50,
  max_weight_kg DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(shelf_id, box_code)
);

-- Raklap (Pallet - opcionális, nagyobb tételekhez)
CREATE TABLE pallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  pallet_code VARCHAR(20) NOT NULL, -- "R-001", "PALLET-12"
  pallet_type VARCHAR(50), -- "euro_pallet", "industrial_pallet"
  max_weight_kg DECIMAL(10,2) DEFAULT 1000,
  current_weight_kg DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(location_id, pallet_code)
);

-- Készlet hely kapcsolat (Inventory location mapping)
CREATE TABLE inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  location_id UUID NOT NULL REFERENCES locations(id),

  -- Hierarchikus hely (opcionális mezők, legalább 1 kell)
  rack_id UUID REFERENCES racks(id),
  shelf_id UUID REFERENCES shelves(id),
  box_id UUID REFERENCES boxes(id),
  pallet_id UUID REFERENCES pallets(id),

  quantity INT NOT NULL DEFAULT 0,
  barcode VARCHAR(100), -- Egyedi vonalkód erre a tételre
  last_counted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CHECK (
    rack_id IS NOT NULL OR
    shelf_id IS NOT NULL OR
    box_id IS NOT NULL OR
    pallet_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_inventory_loc_product ON inventory_locations(product_id);
CREATE INDEX idx_inventory_loc_location ON inventory_locations(location_id);
CREATE INDEX idx_inventory_loc_barcode ON inventory_locations(barcode);
CREATE INDEX idx_shelves_rack ON shelves(rack_id);
CREATE INDEX idx_boxes_shelf ON boxes(shelf_id);
```

**Alternatívák (elutasítva):**

- **Graph DB (Neo4j)**: Overkill, extra költség
- **NoSQL (MongoDB)**: Kevésbé jó relációkhoz
- **Nested JSON**: Nem query-friendly

---

### 2. Helykód Generálás

**Döntés:** Hierarchikus kód: `{RACK}-{SHELF}-{BOX}` (pl. "K1-P5-D17")

**Implementáció:**

```typescript
class LocationCodeService {

  generateFullLocationCode(
    rack: Rack,
    shelf: Shelf,
    box?: Box
  ): string {
    let code = `${rack.rackCode}-${shelf.shelfCode}`;

    if (box) {
      code += `-${box.boxCode}`;
    }

    return code;
  }

  parseLocationCode(code: string): ParsedLocation {
    const parts = code.split('-');

    return {
      rackCode: parts[0],
      shelfCode: parts[1],
      boxCode: parts[2] || null
    };
  }

  async findByCode(locationCode: string): Promise<InventoryLocation> {
    const parsed = this.parseLocationCode(locationCode);

    const rack = await this.rackRepo.findOne({ where: { rackCode: parsed.rackCode } });
    const shelf = await this.shelfRepo.findOne({
      where: { rackId: rack.id, shelfCode: parsed.shelfCode }
    });

    let box = null;
    if (parsed.boxCode) {
      box = await this.boxRepo.findOne({
        where: { shelfId: shelf.id, boxCode: parsed.boxCode }
      });
    }

    return { rack, shelf, box };
  }
}
```

---

### 3. Kapacitás Tracking

**Döntés:** Real-time aggregation + Capacity alerts

**Implementáció:**

```typescript
async checkCapacity(
  locationId: string,
  productId: string,
  quantity: number
): Promise<CapacityCheck> {

  const location = await this.findByCode(locationId);

  // Check box capacity (if box-level)
  if (location.box) {
    const currentItems = await this.inventoryLocationRepo.count({
      where: { boxId: location.box.id }
    });

    if (currentItems + quantity > location.box.maxItems) {
      return {
        canFit: false,
        reason: `Box ${location.box.boxCode} capacity exceeded`,
        maxCapacity: location.box.maxItems,
        currentCapacity: currentItems
      };
    }
  }

  // Check shelf capacity
  if (location.shelf) {
    const boxesOnShelf = await this.boxRepo.count({
      where: { shelfId: location.shelf.id }
    });

    if (boxesOnShelf >= location.shelf.maxBoxes) {
      return {
        canFit: false,
        reason: `Shelf ${location.shelf.shelfCode} full`,
        maxCapacity: location.shelf.maxBoxes,
        currentCapacity: boxesOnShelf
      };
    }
  }

  return { canFit: true };
}

// Capacity alert system
async checkLowCapacityAlerts(): Promise<CapacityAlert[]> {
  const alerts: CapacityAlert[] = [];

  // Find shelves > 90% full
  const fullShelves = await this.shelfRepo.query(`
    SELECT
      s.*,
      COUNT(b.id) AS current_boxes,
      s.max_boxes,
      (COUNT(b.id)::FLOAT / s.max_boxes) AS fill_percentage
    FROM shelves s
    LEFT JOIN boxes b ON b.shelf_id = s.id
    GROUP BY s.id
    HAVING (COUNT(b.id)::FLOAT / s.max_boxes) > 0.9
  `);

  alerts.push(...fullShelves.map(s => ({
    type: 'shelf_capacity',
    severity: 'warning',
    message: `Shelf ${s.shelf_code} is ${Math.round(s.fill_percentage * 100)}% full`
  })));

  return alerts;
}
```

---

## Következmények

**Pozitív:**
- ✅ Scalable (2000+ slots)
- ✅ Multi-location ready
- ✅ Capacity tracking
- ✅ Query efficient

**Negatív:**
- ⚠️ Complex hierarchy queries
  - **Mitigáció**: Materialized views, caching

---

**Referenciák**: `docs/analysis/Kerdes-Valaszok-2025-12-30.md` (Q16-Q18)

---

**Készítette**: Winston (Architect Agent)
