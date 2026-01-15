# ADR-023: Composable Frontend Stratégia

## Státusz

**TERVEZET** - 2026. január 1.

## Kontextus

A modern frontend fejlesztés paradigmaváltáson megy keresztül: a statikus, kézzel kódolt UI-któl a dinamikusan komponálható, schema-driven felületek felé. Ez a KGC ERP számára különösen releváns a multi-tenant franchise modell és az AI integráció (Koko chatbot) miatt.

### Forrás

AI Strategy YouTube transcript elemzés (2026-01-01) - Front-end Composability koncepció adaptálása a KGC ERP kontextusára.

### Üzleti Követelmények

1. **Franchise Testreszabhatóság**: Minden franchise saját dashboard-ot és workflow-t igényel
2. **Gyors Iteráció**: Új funkciók hetek helyett napok alatt
3. **AI Integráció**: Koko chatbot és jövőbeli AI ügynökök natív támogatása
4. **Offline-First PWA**: Schema-driven validáció offline is működjön
5. **NAV Compliance**: Audit trail minden dinamikusan generált felületen

### Jelenlegi Állapot

- Nincs implementált frontend (Fázis 2-3: Tervezés)
- Tervezett stack: NestJS + PostgreSQL + PWA
- Integrációk: Twenty CRM, Chatwoot, MyPos, Számlázz.hu

## Döntések

### 1. Négyrétegű Composable Architektúra

**Döntés:** Rétegzett megközelítés - minden réteg a másikra épül

```
┌────────────────────────────────────────┐
│     4. Composable Dashboard            │ ← Fázis 3
├────────────────────────────────────────┤
│     3. Headless API Layer              │ ← Fázis 1
├────────────────────────────────────────┤
│     2. Workflow Recipe Engine          │ ← Fázis 2
├────────────────────────────────────────┤
│     1. Schema-driven Forms             │ ← Fázis 1
└────────────────────────────────────────┘
```

**Indoklás:**
- Fokozatos bevezetés csökkenti a kockázatot
- Minden réteg önállóan is értéket ad
- AI fogyasztók (Koko) bármely rétegen csatlakozhatnak

---

### 2. Schema-driven Forms (Réteg 1)

**Döntés:** JSON Schema + react-hook-form + zod alapú űrlap generálás

**Implementáció:**

```typescript
// Form Schema definíció
interface KGCFormSchema {
  id: string;
  version: string;
  fields: FormField[];

  // KGC-specifikus
  franchise_overrides?: Record<FranchiseId, Partial<FormField>[]>;
  offline_validation?: boolean;
  nav_field_mapping?: NAVFieldMapping;
}

interface FormField {
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'barcode' | 'signature';
  label: string;
  required?: boolean;
  validation?: ZodSchema;
  depends_on?: ConditionalRule;

  // UI hints
  placeholder?: string;
  help_text?: string;
  width?: 'full' | 'half' | 'third';
}
```

**Használati esetek:**

| Űrlap | Schema-driven? | Indoklás |
|-------|:--------------:|----------|
| Partner regisztráció | ✅ | Gyakran változó mezők |
| Bérlés indítás | ✅ | Franchise-specifikus mezők |
| Szerviz munkalap | ✅ | Makita norma integráció |
| NAV számla | ❌ | Fix, szabályozott formátum |
| Login form | ❌ | Túl egyszerű, nincs értelme |

**Előnyök:**
- 70-80% kevesebb frontend kód
- Franchise-specifikus mezők YAML/JSON-ból
- Backend és frontend validáció szinkronban
- Offline validáció PWA-ban

**Hátrányok:**
- Schema engine fejlesztési költség
- Egyedi UI logika nehezebb
- Debugging komplexebb

**Választott technológia:**
- `react-hook-form` - Performant form library
- `zod` - TypeScript-first schema validation
- `@hookform/resolvers` - Zod integration
- Egyedi `SchemaFormRenderer` komponens

---

### 3. Workflow Recipe Engine (Réteg 2)

**Döntés:** XState alapú state machine + YAML recipe definíciók

**Implementáció:**

```yaml
# /recipes/rental-checkout.recipe.yaml
id: rental_checkout
name: "Bérlés Kiadás"
version: "1.0.0"

initial_state: customer_select
franchise_variants:
  budapest_01:
    skip_steps: [deposit_photo]
  debrecen_01:
    require_steps: [manager_approval]

states:
  customer_select:
    type: form
    schema: partner_search_schema
    on_complete: equipment_scan

  equipment_scan:
    type: barcode
    validation:
      - check_availability
      - check_maintenance_status
    on_complete: deposit_calculation
    on_error: equipment_unavailable

  deposit_calculation:
    type: automatic
    action: calculate_deposit
    on_complete: payment

  payment:
    type: payment
    methods:
      - mypos_card
      - cash
    amount: ${deposit_value}
    on_complete: contract_generation
    on_error: payment_failed

  contract_generation:
    type: automatic
    action: generate_contract
    template: rental_contract_v2
    on_complete: signature

  signature:
    type: signature_capture
    on_complete: handover

  handover:
    type: checklist
    items:
      - equipment_photo
      - accessories_check
      - customer_confirmation
    on_complete: complete

  complete:
    type: final
    actions:
      - send_confirmation_sms
      - update_inventory
      - log_to_nav

error_states:
  equipment_unavailable:
    type: decision
    options:
      - suggest_alternative
      - cancel_rental

  payment_failed:
    type: retry
    max_attempts: 3
    fallback: cash_payment
```

**XState integráció:**

```typescript
import { createMachine, interpret } from 'xstate';

@Injectable()
export class WorkflowEngine {
  private machines: Map<string, AnyStateMachine> = new Map();

  async loadRecipe(recipeId: string, franchiseId?: string): Promise<void> {
    const recipe = await this.recipeLoader.load(recipeId);
    const franchiseVariant = this.applyFranchiseOverrides(recipe, franchiseId);
    const machine = this.compileMachine(franchiseVariant);
    this.machines.set(recipeId, machine);
  }

  async startWorkflow(recipeId: string, context: WorkflowContext): Promise<WorkflowInstance> {
    const machine = this.machines.get(recipeId);
    const service = interpret(machine)
      .onTransition((state) => this.auditLog(state))
      .start();

    return new WorkflowInstance(service, context);
  }
}
```

**Előnyök:**
- Új workflow = YAML config, nem kód
- Lépések újrafelhasználhatók
- Franchise-specifikus variánsok
- Teljes audit trail automatikus
- Offline workflow támogatás

**Hátrányok:**
- XState tanulási görbe
- State management komplexitás
- Félbehagyott workflow-k kezelése

---

### 4. Headless API Layer (Réteg 3)

**Döntés:** OpenAPI 3.1 spec + NestJS automatic generation

**API fogyasztók:**

```
                    ┌─────────────────┐
                    │   KGC API       │
                    │   (NestJS)      │
                    │   OpenAPI 3.1   │
                    └────────┬────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │         │              │              │         │
    ▼         ▼              ▼              ▼         ▼
┌───────┐ ┌───────┐ ┌──────────────┐ ┌─────────┐ ┌────────┐
│ Admin │ │ Kiosk │ │    Koko      │ │ Twenty  │ │External│
│  PWA  │ │  PWA  │ │   Chatbot    │ │   CRM   │ │  APIs  │
└───────┘ └───────┘ └──────────────┘ └─────────┘ └────────┘
  Human     Human        AI Agent      System      System
```

**AI-first API Design:**

```typescript
// Minden endpoint AI-fogyasztható
@Controller('rentals')
@ApiTags('Rentals')
export class RentalController {

  @Get(':id')
  @ApiOperation({
    summary: 'Get rental details',
    description: `
      Returns complete rental information.

      **AI Agent Usage:**
      - Use for customer inquiries about active rentals
      - Combine with /equipment/:id for full context
      - Response includes next_actions for workflow guidance
    `
  })
  async getRental(@Param('id') id: string): Promise<RentalResponse> {
    // ...
  }
}

interface RentalResponse {
  data: Rental;

  // AI-friendly metadata
  next_actions: Action[];
  related_resources: ResourceLink[];
  human_readable_summary: string;
}
```

**Brand Promise API Guidelines:**

```typescript
// Consistent response formatting
interface KGCApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;  // Human-friendly, brand voice
    technical_details?: string;
    suggested_action?: string;
  };

  // Brand consistency
  response_tone: 'friendly_professional';
  support_contact?: string;
}
```

**Előnyök:**
- Backend és frontend külön fejleszthető
- AI integráció natív
- OpenAPI = auto dokumentáció
- Skálázható

**Hátrányok:**
- API design kritikus
- N kliens = N karbantartás
- Offline szinkron bonyolult

---

### 5. Composable Dashboard (Réteg 4)

**Döntés:** Widget Registry Pattern + Drag-drop layout

**Widget architektúra:**

```typescript
interface Widget {
  id: string;
  name: string;
  version: string;

  // Permissions
  required_roles: UserRole[];
  franchise_availability: FranchiseId[] | 'all';

  // Data
  data_sources: DataSource[];
  refresh_interval?: number;

  // UI
  default_size: { cols: number; rows: number };
  resizable: boolean;
  component: React.ComponentType<WidgetProps>;
}

// Widget Registry
@Injectable()
export class WidgetRegistry {
  private widgets: Map<string, Widget> = new Map();

  register(widget: Widget): void {
    this.widgets.set(widget.id, widget);
  }

  getAvailableWidgets(
    franchiseId: string,
    userRole: UserRole
  ): Widget[] {
    return Array.from(this.widgets.values())
      .filter(w => this.checkAccess(w, franchiseId, userRole));
  }
}
```

**Standard Widget Library:**

| Widget | Leírás | Méret |
|--------|--------|-------|
| `daily-rentals` | Mai bérlések összesítő | 2x1 |
| `active-equipment` | Aktív gépek térkép | 2x2 |
| `revenue-chart` | Bevétel grafikon | 2x1 |
| `service-queue` | Szerviz várakozók | 1x2 |
| `expiring-contracts` | Lejáró szerződések | 1x1 |
| `koko-chat` | Koko chatbot widget | 1x3 |
| `quick-actions` | Gyors műveletek | 1x1 |

**Előnyök:**
- Franchise önkiszolgáló
- Widget-ek izoláltak
- A/B tesztelés widget szinten
- Lazy loading

**Hátrányok:**
- Widget kommunikáció komplexitás
- Layout engine fejlesztés
- User training szükséges

---

### 6. Audit Trail minden rétegben

**Döntés:** Központi audit log minden composable művelethez

```typescript
interface ComposableAuditLog {
  timestamp: Date;

  // Actor
  actor_type: 'human' | 'ai_agent' | 'system';
  actor_id: string;
  actor_role: UserRole;
  franchise_id?: string;

  // Action
  layer: 'form' | 'workflow' | 'api' | 'dashboard';
  action: string;

  // Context
  composed_view?: string;  // Mi volt a képernyőn
  form_schema_version?: string;
  workflow_state?: string;
  widget_layout?: WidgetLayout;

  // Result
  success: boolean;
  error_code?: string;

  // NAV compliance
  nav_relevant: boolean;
  nav_document_id?: string;
}
```

---

## Implementációs Fázisok

### Fázis 1: Alapok (MVP)
**Időtartam:** 4-6 hét

| Komponens | Prioritás | Leírás |
|-----------|-----------|--------|
| Schema-driven Forms | P0 | Partner, Bérlés, Szerviz űrlapok |
| Headless API | P0 | Core CRUD endpoints |
| Form Schema Registry | P1 | YAML/JSON schema tárolás |
| Basic Audit Log | P1 | Form submissions naplózás |

### Fázis 2: Workflow Engine
**Időtartam:** 4-6 hét

| Komponens | Prioritás | Leírás |
|-----------|-----------|--------|
| XState Integration | P0 | State machine core |
| Recipe Parser | P0 | YAML → XState compiler |
| Rental Checkout Recipe | P0 | Első production recipe |
| Rental Return Recipe | P1 | Második recipe |
| Workflow Audit | P1 | Step-by-step logging |

### Fázis 3: Dashboard & AI
**Időtartam:** 4-6 hét

| Komponens | Prioritás | Leírás |
|-----------|-----------|--------|
| Widget Registry | P0 | Core widget system |
| 5 Standard Widgets | P0 | MVP widget set |
| Koko API Integration | P1 | Chatbot as consumer |
| Drag-drop Layout | P1 | User customization |
| Franchise Dashboard Presets | P2 | Template layouts |

---

## Alternatívák (Elutasítva)

### A) Teljes Low-code Platform (Retool, Appsmith)
- ❌ Vendor lock-in
- ❌ Korlátozott offline support
- ❌ NAV integráció nehézkes

### B) Tisztán Statikus Frontend
- ❌ Franchise testreszabás = N kódbázis
- ❌ Nem skálázható
- ❌ AI integráció utólagos

### C) Micro-frontend Architecture
- ❌ Túl komplex MVP-hez
- ❌ Build pipeline bonyolult
- ⚠️ Lehet Fázis 4+ opció

---

## Következmények

### Pozitív
1. Franchise-ok testreszabhatják a rendszert kód nélkül
2. AI integráció (Koko) natív lesz az elejétől
3. Gyorsabb feature delivery (napok vs hetek)
4. Teljes audit trail NAV compliance-hez
5. Offline-first PWA támogatás megmarad

### Negatív
1. Magasabb kezdeti fejlesztési költség
2. Schema/Recipe DSL tanulási görbe
3. Debugging komplexebb (generált UI)

### Kockázatok
1. **Schema verzionálás** - Migráció stratégia szükséges
2. **Teljesítmény** - Generált UI overhead monitorozandó
3. **Edge cases** - Nem minden UI kompozícionálható

---

## Kapcsolódó ADR-ek

- ADR-001: Franchise Multi-Tenancy
- ADR-002: Deployment és Offline Stratégia
- ADR-014: Moduláris Architektúra
- ADR-016: Koko AI Chatbot Integration

---

## Jóváhagyás

| Szerepkör | Név | Dátum | Státusz |
|-----------|-----|-------|---------|
| Product Owner | Javo | - | Pending |
| Tech Lead | - | - | Pending |
| Architect | Winston (AI) | 2026-01-01 | Drafted |
