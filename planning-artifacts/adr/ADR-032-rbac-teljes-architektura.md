# ADR-032: Teljes RBAC Architektúra (7 Szerepkör)

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Security Lead
**Kapcsolódó:** FR42-FR48, ADR-001 (Multi-tenancy), ADR-025 (Számla RBAC)

---

## Kontextus

A KGC ERP v7.0 rendszer **7 különböző szerepkört** támogat, mindegyik egyedi jogosultságokkal. A PRD Funkcionális Követelmények (FR42-FR48) definiálják az alap elvárásokat, de szükség van egy átfogó architektúrára.

---

## Döntési Kérdés

**Hogyan implementáljuk a 7 szerepkörös RBAC rendszert úgy, hogy az skálázható, auditálható és tenant-izolált legyen?**

---

## Döntés

### Szerepkör Hierarchia

```
┌─────────────────────────────────────────────────────────────────┐
│                    RBAC SZEREPKÖR HIERARCHIA                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        SUPER_ADMIN                              │
│                            │                                    │
│                  ┌─────────┴─────────┐                         │
│                  │                   │                          │
│              DEVOPS_ADMIN        CENTRAL_ADMIN                  │
│                  │                   │                          │
│                  │           ┌───────┴───────┐                  │
│                  │           │               │                  │
│                  │    PARTNER_OWNER    ACCOUNTANT               │
│                  │           │                                  │
│                  │     ┌─────┴─────┐                           │
│                  │     │           │                            │
│                  │  BOLTVEZETO  TECHNIKUS                       │
│                  │     │                                        │
│                  │  OPERATOR                                    │
│                  │                                              │
│  ────────────────┴──────────────────────────────────────────   │
│                                                                 │
│  Öröklődés: Magasabb szerepkör örökli az alacsonyabb jogait    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Szerepkör Definíciók

```typescript
enum Role {
  OPERATOR = 'OPERATOR',           // Pultos / Értékesítő
  TECHNIKUS = 'TECHNIKUS',         // Szerviz technikus
  BOLTVEZETO = 'BOLTVEZETO',       // Boltvezető
  ACCOUNTANT = 'ACCOUNTANT',       // Könyvelő
  PARTNER_OWNER = 'PARTNER_OWNER', // Franchise Partner Tulajdonos
  CENTRAL_ADMIN = 'CENTRAL_ADMIN', // Központi Admin
  DEVOPS_ADMIN = 'DEVOPS_ADMIN',   // DevOps / IT Admin
  SUPER_ADMIN = 'SUPER_ADMIN'      // Rendszergazda (KGC HQ)
}

interface RoleDefinition {
  role: Role;
  level: number;                   // Hierarchia szint (1-8)
  scope: 'LOCATION' | 'TENANT' | 'GLOBAL';
  inheritsFrom?: Role;             // Jogosultság öröklés
  description: string;
}

const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  OPERATOR: {
    role: Role.OPERATOR,
    level: 1,
    scope: 'LOCATION',
    description: 'Napi pult műveletek: bérlés, eladás, készlet'
  },
  TECHNIKUS: {
    role: Role.TECHNIKUS,
    level: 2,
    scope: 'LOCATION',
    inheritsFrom: Role.OPERATOR,
    description: 'Szerviz műveletek + Operátor jogok'
  },
  BOLTVEZETO: {
    role: Role.BOLTVEZETO,
    level: 3,
    scope: 'LOCATION',
    inheritsFrom: Role.TECHNIKUS,
    description: 'Bolt vezetés, kedvezmény ±20%, riportok'
  },
  ACCOUNTANT: {
    role: Role.ACCOUNTANT,
    level: 3,
    scope: 'TENANT',
    description: 'Pénzügyi riportok, számlák (csak olvasás)'
  },
  PARTNER_OWNER: {
    role: Role.PARTNER_OWNER,
    level: 4,
    scope: 'TENANT',
    inheritsFrom: Role.BOLTVEZETO,
    description: 'Franchise partner összes bolt felügyelete'
  },
  CENTRAL_ADMIN: {
    role: Role.CENTRAL_ADMIN,
    level: 5,
    scope: 'GLOBAL',
    description: 'Országos készlet + partner áttekintés (read-only)'
  },
  DEVOPS_ADMIN: {
    role: Role.DEVOPS_ADMIN,
    level: 6,
    scope: 'GLOBAL',
    description: 'Rendszer konfiguráció, tenant kezelés'
  },
  SUPER_ADMIN: {
    role: Role.SUPER_ADMIN,
    level: 8,
    scope: 'GLOBAL',
    description: 'Teljes rendszer hozzáférés'
  }
};
```

### Permission Matrix

```typescript
enum Permission {
  // Bérlés modul
  RENTAL_VIEW = 'rental:view',
  RENTAL_CREATE = 'rental:create',
  RENTAL_RETURN = 'rental:return',
  RENTAL_CANCEL = 'rental:cancel',
  RENTAL_DISCOUNT = 'rental:discount',

  // Szerviz modul
  SERVICE_VIEW = 'service:view',
  SERVICE_CREATE = 'service:create',
  SERVICE_UPDATE = 'service:update',
  SERVICE_CLOSE = 'service:close',
  SERVICE_WARRANTY = 'service:warranty',

  // Készlet modul
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_TRANSFER = 'inventory:transfer',
  INVENTORY_ADJUST = 'inventory:adjust',

  // Értékesítés modul
  SALES_VIEW = 'sales:view',
  SALES_CREATE = 'sales:create',
  SALES_REFUND = 'sales:refund',

  // Pénzügy modul
  FINANCE_VIEW = 'finance:view',
  FINANCE_REPORTS = 'finance:reports',
  FINANCE_CLOSE = 'finance:close',

  // Partner modul
  PARTNER_VIEW = 'partner:view',
  PARTNER_CREATE = 'partner:create',
  PARTNER_UPDATE = 'partner:update',
  PARTNER_DELETE = 'partner:delete',

  // User/Admin modul
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ROLE_ASSIGN = 'user:role_assign',

  // Riport modul
  REPORT_OPERATIONAL = 'report:operational',
  REPORT_FINANCIAL = 'report:financial',
  REPORT_CROSS_TENANT = 'report:cross_tenant',

  // Admin modul
  ADMIN_CONFIG = 'admin:config',
  ADMIN_TENANT = 'admin:tenant',
  ADMIN_SYSTEM = 'admin:system'
}
```

### Szerepkör → Permission Mapping

| Permission | OPERATOR | TECHNIKUS | BOLTVEZETO | ACCOUNTANT | PARTNER_OWNER | CENTRAL_ADMIN | DEVOPS_ADMIN |
|------------|----------|-----------|------------|------------|---------------|---------------|--------------|
| rental:view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (read) | ❌ |
| rental:create | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| rental:discount | ❌ | ❌ | ✅ ±20% | ❌ | ✅ 100% | ❌ | ❌ |
| service:view | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| service:create | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| service:warranty | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| inventory:view | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| inventory:transfer | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| finance:view | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| finance:reports | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| user:create | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| admin:tenant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Adatbázis Séma

```sql
-- Szerepkörök
CREATE TABLE role (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  level INT NOT NULL,
  scope VARCHAR(20) NOT NULL,
  inherits_from UUID REFERENCES role(role_id),
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jogosultságok
CREATE TABLE permission (
  permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE
);

-- Szerepkör-Jogosultság kapcsolat
CREATE TABLE role_permission (
  role_id UUID REFERENCES role(role_id),
  permission_id UUID REFERENCES permission(permission_id),
  constraints JSONB,          -- Pl: {"discount_limit": 20}
  PRIMARY KEY (role_id, permission_id)
);

-- Felhasználó-Szerepkör kapcsolat
CREATE TABLE user_role (
  user_id UUID REFERENCES users(user_id),
  role_id UUID REFERENCES role(role_id),
  tenant_id UUID REFERENCES tenant(tenant_id),
  location_id UUID REFERENCES location(location_id),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  assigned_by UUID REFERENCES users(user_id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id, tenant_id)
);

-- RLS alapú jogosultság ellenőrzés
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id UUID,
  p_permission_code VARCHAR,
  p_resource_tenant_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_user_scope VARCHAR;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_role ur
    JOIN role_permission rp ON ur.role_id = rp.role_id
    JOIN permission p ON rp.permission_id = p.permission_id
    WHERE ur.user_id = p_user_id
      AND p.permission_code = p_permission_code
      AND (ur.valid_until IS NULL OR ur.valid_until > NOW())
      AND (
        p_resource_tenant_id IS NULL
        OR ur.tenant_id = p_resource_tenant_id
        OR EXISTS (
          SELECT 1 FROM role r
          WHERE r.role_id = ur.role_id AND r.scope = 'GLOBAL'
        )
      )
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Middleware Implementáció

```typescript
// NestJS Guard
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<Permission[]>(
      'permissions',
      context.getHandler()
    );

    if (!requiredPermissions) {
      return true; // Nincs permission requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'];

    for (const permission of requiredPermissions) {
      const hasPermission = await this.rbacService.checkPermission(
        user.id,
        permission,
        tenantId
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Missing permission: ${permission}`
        );
      }
    }

    return true;
  }
}

// Controller használat
@Controller('rental')
export class RentalController {
  @Post()
  @RequirePermissions(Permission.RENTAL_CREATE)
  async createRental(@Body() dto: CreateRentalDto) {
    // ...
  }

  @Post(':id/discount')
  @RequirePermissions(Permission.RENTAL_DISCOUNT)
  async applyDiscount(
    @Param('id') id: string,
    @Body() dto: DiscountDto,
    @CurrentUser() user: User
  ) {
    // Constraint ellenőrzés
    const maxDiscount = await this.rbacService.getConstraint(
      user.id,
      Permission.RENTAL_DISCOUNT,
      'discount_limit'
    );

    if (Math.abs(dto.discountPercent) > maxDiscount) {
      throw new ForbiddenException(
        `Maximum discount: ±${maxDiscount}%`
      );
    }
    // ...
  }
}
```

### Audit Trail

```sql
CREATE TABLE rbac_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_code VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  tenant_id UUID,
  action VARCHAR(20) NOT NULL,  -- 'GRANTED' | 'DENIED' | 'ELEVATED'
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Speciális Esetek

### 1. Elevated Access (Kritikus Műveletek)

```typescript
// Kritikus műveletek újra-hitelesítést igényelnek
const ELEVATED_PERMISSIONS = [
  Permission.RENTAL_CANCEL,
  Permission.INVENTORY_ADJUST,
  Permission.USER_DELETE,
  Permission.ADMIN_CONFIG
];

// 5 percen belüli újra-auth ellenőrzés
async function requireElevatedAccess(user: User): Promise<boolean> {
  const lastAuth = await getLastAuthentication(user.id);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  if (lastAuth < fiveMinutesAgo) {
    throw new UnauthorizedException('Elevated access required');
  }
  return true;
}
```

### 2. Tenant Scope Override

```typescript
// Central Admin cross-tenant access (read-only)
if (user.role === Role.CENTRAL_ADMIN && action === 'READ') {
  // Engedélyezve bármely tenant-re
  return true;
}
```

---

## Következmények

### Pozitív
- Granulált jogosultság kontroll
- Hierarchikus öröklődés egyszerűsíti a kezelést
- Constraint-alapú limitálás (pl. ±20% kedvezmény)
- Teljes audit trail

### Negatív
- Komplex permission mátrix karbantartás
- Role assignment validáció overhead

### Kockázatok
- **Permission creep:** Túl sok jog → rendszeres audit
- **Lockout:** Admin hozzáférés elvesztése → emergency SUPER_ADMIN
