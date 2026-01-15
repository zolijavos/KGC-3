# ADR-036: GDPR Compliance Architektúra

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, DPO (Data Protection Officer)
**Kapcsolódó:** FR67-FR68, ADR-006 (Audit Trail), ADR-001 (Multi-tenancy)

---

## Kontextus

A KGC ERP v7.0 rendszer személyes adatokat kezel (ügyfelek, dolgozók), ami a **GDPR (General Data Protection Regulation)** hatálya alá esik. A PRD FR67-FR68 követelmények definiálják:
- FR67: Ügyfél személyes adatok titkosítása
- FR68: Kaszkád törlés GDPR kérelemre

---

## Döntési Kérdés

**Hogyan biztosítsuk a GDPR megfelelőséget technikai intézkedésekkel?**

---

## Döntés

### GDPR Követelmények Mappolása

| GDPR Cikk | Követelmény | Technikai Megoldás |
|-----------|-------------|-------------------|
| Art. 17 | Törléshez való jog | Cascade delete + Anonymization |
| Art. 15 | Hozzáférési jog | Data export API |
| Art. 20 | Adathordozhatóság | JSON/CSV export |
| Art. 32 | Adatbiztonság | Encryption at rest |
| Art. 33 | Adatvédelmi incidens | Breach notification system |
| Art. 30 | Nyilvántartási kötelezettség | Processing activities log |

### Személyes Adat Kategorizálás

```typescript
enum PersonalDataCategory {
  IDENTIFIER = 'IDENTIFIER',       // Név, email, telefon
  CONTACT = 'CONTACT',             // Cím, elérhetőség
  FINANCIAL = 'FINANCIAL',         // Fizetési adatok
  BEHAVIORAL = 'BEHAVIORAL',       // Vásárlási szokások
  TECHNICAL = 'TECHNICAL'          // IP cím, device ID
}

enum DataSensitivity {
  PUBLIC = 'PUBLIC',               // Nyilvános
  INTERNAL = 'INTERNAL',           // Belső használat
  CONFIDENTIAL = 'CONFIDENTIAL',   // Bizalmas
  RESTRICTED = 'RESTRICTED'        // Korlátozott (PII)
}

interface PersonalDataField {
  fieldName: string;
  tableName: string;
  category: PersonalDataCategory;
  sensitivity: DataSensitivity;
  retentionDays: number;
  encryptionRequired: boolean;
  anonymizationStrategy: 'DELETE' | 'MASK' | 'HASH' | 'AGGREGATE';
}

const PERSONAL_DATA_REGISTRY: PersonalDataField[] = [
  {
    fieldName: 'name',
    tableName: 'partner',
    category: PersonalDataCategory.IDENTIFIER,
    sensitivity: DataSensitivity.RESTRICTED,
    retentionDays: 2555,  // 7 év (könyvelési)
    encryptionRequired: true,
    anonymizationStrategy: 'MASK'
  },
  {
    fieldName: 'email',
    tableName: 'partner',
    category: PersonalDataCategory.CONTACT,
    sensitivity: DataSensitivity.CONFIDENTIAL,
    retentionDays: 2555,
    encryptionRequired: true,
    anonymizationStrategy: 'HASH'
  },
  {
    fieldName: 'phone',
    tableName: 'partner',
    category: PersonalDataCategory.CONTACT,
    sensitivity: DataSensitivity.CONFIDENTIAL,
    retentionDays: 2555,
    encryptionRequired: true,
    anonymizationStrategy: 'MASK'
  },
  {
    fieldName: 'address',
    tableName: 'partner',
    category: PersonalDataCategory.CONTACT,
    sensitivity: DataSensitivity.CONFIDENTIAL,
    retentionDays: 2555,
    encryptionRequired: true,
    anonymizationStrategy: 'DELETE'
  },
  {
    fieldName: 'tax_number',
    tableName: 'partner',
    category: PersonalDataCategory.FINANCIAL,
    sensitivity: DataSensitivity.RESTRICTED,
    retentionDays: 2555,
    encryptionRequired: true,
    anonymizationStrategy: 'MASK'
  }
];
```

### Titkosítás Architektúra

```
┌─────────────────────────────────────────────────────────────────┐
│                 TITKOSÍTÁSI RÉTEGEK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. TRANSPORT LAYER (TLS 1.3)                            │   │
│  │    • HTTPS minden kommunikációra                         │   │
│  │    • Certificate pinning mobil app-ban                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. APPLICATION LAYER (AES-256-GCM)                      │   │
│  │    • PII mezők titkosítása INSERT előtt                  │   │
│  │    • Kulcs: AWS KMS / HashiCorp Vault                    │   │
│  │    • Tenant-specifikus encryption key                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. DATABASE LAYER (PostgreSQL TDE)                      │   │
│  │    • Transparent Data Encryption                         │   │
│  │    • Backup encryption                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Column-Level Encryption

```typescript
// Encryption service
class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  constructor(private keyManager: KeyManager) {}

  async encrypt(plaintext: string, tenantId: UUID): Promise<EncryptedData> {
    const key = await this.keyManager.getTenantKey(tenantId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  async decrypt(data: EncryptedData, tenantId: UUID): Promise<string> {
    const key = await this.keyManager.getTenantKey(tenantId);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(data.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));

    let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Prisma middleware for automatic encryption
const encryptionMiddleware: Prisma.Middleware = async (params, next) => {
  const encryptedFields = getEncryptedFields(params.model);

  if (params.action === 'create' || params.action === 'update') {
    for (const field of encryptedFields) {
      if (params.args.data[field]) {
        params.args.data[field] = await encryptionService.encrypt(
          params.args.data[field],
          getCurrentTenantId()
        );
      }
    }
  }

  const result = await next(params);

  // Decrypt on read
  if (result && (params.action === 'findUnique' || params.action === 'findMany')) {
    await decryptResult(result, encryptedFields);
  }

  return result;
};
```

### Törlési Jog (Right to Erasure)

```typescript
interface DeletionRequest {
  requestId: UUID;
  partnerId: UUID;
  requestedAt: Date;
  requestedBy: 'PARTNER' | 'ADMIN';
  verificationCode: string;
  verifiedAt?: Date;
  executedAt?: Date;
  status: 'PENDING' | 'VERIFIED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
}

async function processDataDeletionRequest(
  request: DeletionRequest
): Promise<DeletionResult> {
  // 1. Jogszabályi check - NAV 7 év megőrzés
  const hasActiveObligations = await checkRetentionObligations(request.partnerId);

  if (hasActiveObligations) {
    // Anonymizálás törlés helyett
    return await anonymizePartnerData(request.partnerId);
  }

  // 2. Cascade delete előkészítés
  const deletionPlan = await createDeletionPlan(request.partnerId);

  // 3. Transaction-ben végrehajtás
  await prisma.$transaction(async (tx) => {
    for (const step of deletionPlan.steps) {
      switch (step.action) {
        case 'DELETE':
          await tx[step.table].deleteMany({
            where: { partnerId: request.partnerId }
          });
          break;

        case 'ANONYMIZE':
          await tx[step.table].updateMany({
            where: { partnerId: request.partnerId },
            data: anonymizeFields(step.fields)
          });
          break;

        case 'NULLIFY':
          await tx[step.table].updateMany({
            where: { partnerId: request.partnerId },
            data: { [step.foreignKey]: null }
          });
          break;
      }
    }

    // Partner rekord törlése/anonymizálása
    await tx.partner.update({
      where: { id: request.partnerId },
      data: {
        name: 'DELETED_USER',
        email: `deleted_${request.partnerId}@deleted.local`,
        phone: null,
        address: null,
        taxNumber: null,
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  });

  // 4. Audit log (anonymizált)
  await auditLog.record({
    action: 'GDPR_DATA_DELETION',
    requestId: request.requestId,
    partnerIdHash: hashPartnerId(request.partnerId),  // Hash, not ID
    tablesAffected: deletionPlan.steps.map(s => s.table),
    executedAt: new Date()
  });

  return {
    success: true,
    deletedRecords: deletionPlan.totalRecords,
    anonymizedRecords: deletionPlan.anonymizedRecords
  };
}

// Anonymizálási stratégiák
function anonymizeFields(fields: PersonalDataField[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const field of fields) {
    switch (field.anonymizationStrategy) {
      case 'DELETE':
        result[field.fieldName] = null;
        break;
      case 'MASK':
        result[field.fieldName] = maskValue(field.fieldName);
        break;
      case 'HASH':
        result[field.fieldName] = hashValue(field.originalValue);
        break;
      case 'AGGREGATE':
        // Megtartjuk statisztikai célra
        break;
    }
  }

  return result;
}

function maskValue(fieldName: string): string {
  switch (fieldName) {
    case 'name':
      return 'Törölt Felhasználó';
    case 'email':
      return 'deleted@example.com';
    case 'phone':
      return '+36 ** *** ****';
    case 'tax_number':
      return '********-*-**';
    default:
      return '***';
  }
}
```

### Data Export (Adathordozhatóság)

```typescript
interface DataExportRequest {
  partnerId: UUID;
  format: 'JSON' | 'CSV';
  includeTransactions: boolean;
  includeRentals: boolean;
  includeService: boolean;
}

async function exportPartnerData(
  request: DataExportRequest
): Promise<DataExportResult> {
  const partner = await prisma.partner.findUnique({
    where: { id: request.partnerId },
    include: {
      rentals: request.includeRentals,
      transactions: request.includeTransactions,
      serviceOrders: request.includeService
    }
  });

  // Decrypt encrypted fields
  const decryptedPartner = await decryptPartnerData(partner);

  // Format output
  const exportData = {
    exportDate: new Date().toISOString(),
    format: 'GDPR_DATA_EXPORT_V1',
    personalData: {
      name: decryptedPartner.name,
      email: decryptedPartner.email,
      phone: decryptedPartner.phone,
      address: decryptedPartner.address,
      taxNumber: decryptedPartner.taxNumber,
      createdAt: partner.createdAt
    },
    activityData: {
      totalRentals: partner.rentals?.length || 0,
      totalTransactions: partner.transactions?.length || 0,
      totalServiceOrders: partner.serviceOrders?.length || 0
    },
    detailedRecords: request.format === 'JSON' ? {
      rentals: partner.rentals,
      transactions: partner.transactions,
      serviceOrders: partner.serviceOrders
    } : undefined
  };

  // Generate file
  const fileContent = request.format === 'JSON'
    ? JSON.stringify(exportData, null, 2)
    : convertToCSV(exportData);

  // Audit
  await auditLog.record({
    action: 'GDPR_DATA_EXPORT',
    partnerId: request.partnerId,
    format: request.format,
    recordsExported: Object.keys(exportData.detailedRecords || {}).length
  });

  return {
    filename: `gdpr_export_${request.partnerId}_${Date.now()}.${request.format.toLowerCase()}`,
    content: fileContent,
    mimeType: request.format === 'JSON' ? 'application/json' : 'text/csv'
  };
}
```

### Adatbázis Séma

```sql
-- GDPR kérelmek nyilvántartása
CREATE TABLE gdpr_request (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  partner_id UUID NOT NULL REFERENCES partner(partner_id),
  request_type VARCHAR(20) NOT NULL,  -- 'DELETION' | 'EXPORT' | 'RECTIFICATION'
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by VARCHAR(20) NOT NULL,  -- 'PARTNER' | 'ADMIN'
  verification_code VARCHAR(100),
  verified_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(user_id),
  result JSONB,
  INDEX idx_gdpr_pending (tenant_id, status) WHERE status = 'PENDING'
);

-- Adatfeldolgozási tevékenységek naplója (Art. 30)
CREATE TABLE processing_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  data_categories VARCHAR[] NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(50) NOT NULL,
  data_subjects VARCHAR(50) NOT NULL,
  recipients VARCHAR[] DEFAULT '{}',
  retention_period INT,  -- napokban
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adatvédelmi incidensek
CREATE TABLE data_breach (
  breach_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ,
  affected_data_types VARCHAR[] NOT NULL,
  affected_count INT,
  severity VARCHAR(20) NOT NULL,  -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description TEXT NOT NULL,
  mitigation_steps TEXT,
  authority_notified BOOLEAN DEFAULT FALSE,
  subjects_notified BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  INDEX idx_breach_open (tenant_id, closed_at) WHERE closed_at IS NULL
);
```

---

## Data Retention Policy

```typescript
const RETENTION_POLICIES = {
  // Magyar számviteli törvény: 8 év
  FINANCIAL_RECORDS: 2920,  // 8 év napokban

  // NAV előírás: 7 év
  INVOICES: 2555,           // 7 év

  // Általános üzleti: 3 év
  RENTAL_RECORDS: 1095,     // 3 év

  // Marketing: 2 év inaktivitás után
  MARKETING_CONSENT: 730,   // 2 év

  // Session data: 30 nap
  SESSION_LOGS: 30,

  // Audit logs: 2 év aktív, utána archív
  AUDIT_LOGS_ACTIVE: 730,
  AUDIT_LOGS_ARCHIVE: 2555
};
```

---

## Következmények

### Pozitív
- GDPR compliance biztosított
- Titkosított PII adatok
- Automatizált törlési workflow
- Teljes audit trail

### Negatív
- Encryption performance overhead
- Komplex deletion cascade
- Retention policy karbantartás

### Kockázatok
- **Key management:** Key rotation policy szükséges
- **Incomplete deletion:** Backup-okban maradhat adat
