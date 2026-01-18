#!/usr/bin/env npx tsx
/**
 * Dashboard Data Generator
 *
 * Reads sprint-status.yaml and review files, generates TypeScript data files.
 * Run: npx tsx scripts/generate-data.ts
 * Or: pnpm generate-dashboard-data
 */

import * as fs from 'fs';
import yaml from 'js-yaml';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SPRINT_STATUS_PATH = path.join(ROOT_DIR, 'implementation-artifacts/sprint-status.yaml');
const OUTPUT_PATH = path.join(__dirname, '../src/data/sprint-data.ts');

// Epic metadata mapping
const EPIC_METADATA: Record<string, { name: string; package: string; layer: string }> = {
  '1': { name: 'Authentication', package: '@kgc/auth', layer: 'core' },
  '2': { name: 'User Management', package: '@kgc/users', layer: 'core' },
  '3': { name: 'Tenant Management', package: '@kgc/tenant', layer: 'core' },
  '4': { name: 'Configuration', package: '@kgc/config', layer: 'core' },
  '5': { name: 'UI Component Library', package: '@kgc/ui', layer: 'core' },
  '6': { name: 'Audit Trail', package: '@kgc/audit', layer: 'core' },
  '7': { name: 'Partner Management', package: '@kgc/partner', layer: 'shared' },
  '8': { name: 'Product Catalog', package: '@kgc/cikk', layer: 'shared' },
  '9': { name: 'Inventory Core', package: '@kgc/inventory', layer: 'shared' },
  '10': { name: 'Invoice Core', package: '@kgc/sales-invoice', layer: 'shared' },
  '11': { name: 'NAV Integration', package: '@kgc/nav-online', layer: 'shared' },
  '12': { name: 'Task List Widget', package: '@kgc/feladatlista', layer: 'shared' },
  '13': { name: 'Rental Equipment', package: '@kgc/bergep', layer: 'berles' },
  '14': { name: 'Rental Operations', package: '@kgc/rental-core', layer: 'berles' },
  '15': { name: 'Rental Contracts', package: '@kgc/rental-contract', layer: 'berles' },
  '16': { name: 'Deposit Management', package: '@kgc/rental-checkout', layer: 'berles' },
  '17': { name: 'Work Orders', package: '@kgc/service-worksheet', layer: 'szerviz' },
  '18': { name: 'Quotations', package: '@kgc/sales-quote', layer: 'szerviz' },
  '19': { name: 'Warranty Claims', package: '@kgc/service-warranty', layer: 'szerviz' },
  '20': { name: 'Service Standards', package: '@kgc/service-norma', layer: 'szerviz' },
  '21': { name: 'Goods Receipt', package: '@kgc/bevetelezes', layer: 'aruhaz' },
  '22': { name: 'Point of Sale', package: '@kgc/sales-pos', layer: 'aruhaz' },
  '23': { name: 'Pricing & Margin', package: '@kgc/arres', layer: 'aruhaz' },
  '24': { name: 'Stock Count', package: '@kgc/leltar', layer: 'aruhaz' },
  '25': {
    name: 'Equipment-Service Integration',
    package: '@kgc/bergep-szerviz',
    layer: 'integration',
  },
  '26': { name: 'Online Booking', package: '@kgc/online-booking', layer: 'integration' },
  '27': { name: 'Reporting Engine', package: '@kgc/reporting', layer: 'integration' },
  '28': { name: 'Twenty CRM Integration', package: '@kgc/twenty-crm', layer: 'plugin' },
  '29': { name: 'Chatwoot Integration', package: '@kgc/chatwoot', layer: 'plugin' },
  '30': { name: 'Horilla HR Integration', package: '@kgc/horilla-hr', layer: 'plugin' },
  '31': { name: 'Koko AI Chatbot', package: '@kgc/koko-ai', layer: 'plugin' },
  '32': { name: 'Internal Chat', package: '@kgc/chat', layer: 'plugin' },
  '33': { name: 'Infrastructure & Deployment', package: 'infra', layer: 'infra' },
};

// Story name mapping (kebab-case to human readable)
const STORY_NAMES: Record<string, string> = {
  'jwt-login-endpoint': 'JWT Login Endpoint',
  'token-refresh': 'Token Refresh',
  'logout-es-session-invalidation': 'Logout és Session Invalidation',
  'pin-kod-belepes-kiosk-mod': 'PIN kód belépés (Kiosk mód)',
  'password-reset-flow': 'Password Reset Flow',
  'user-crud-operations': 'User CRUD Operations',
  'role-assignment-es-rbac': 'Role Assignment és RBAC',
  'permission-check-middleware': 'Permission Check Middleware',
  'elevated-access-requirement': 'Elevated Access Requirement',
  'tenant-es-location-scoped-permissions': 'Tenant és Location Scoped Permissions',
  'user-profile-management': 'User Profile Management',
  'code-review-fixes': 'Code Review Fixes',
  'tenant-crud-es-alapstruktura': 'Tenant CRUD és Alapstruktúra',
  'rls-policy-infrastructure': 'RLS Policy Infrastructure',
  'tenant-context-middleware': 'Tenant Context Middleware',
  'tenant-onboarding-wizard': 'Tenant Onboarding Wizard',
  'feature-flag-per-tenant': 'Feature Flag Per Tenant',
  'holding-struktura-tamogatas': 'Holding Struktúra Támogatás',
  'system-configuration-service': 'System Configuration Service',
  'tenant-configuration': 'Tenant Configuration',
  'license-management': 'License Management',
  'configuration-cache-es-reload': 'Configuration Cache és Reload',
  'shadcn-ui-setup-es-core-components': 'Shadcn/UI Setup és Core Components',
  'layout-es-navigation-components': 'Layout és Navigation Components',
  'pwa-service-worker-es-manifest': 'PWA Service Worker és Manifest',
  'offline-data-caching-indexeddb': 'Offline Data Caching (IndexedDB)',
  'background-sync-es-conflict-resolution': 'Background Sync és Conflict Resolution',
  'form-components-es-validation': 'Form Components és Validation',
  'barcode-scanner-integration': 'Barcode Scanner Integration',
  'push-notifications': 'Push Notifications',
  'audit-log-service': 'Audit Log Service',
  'pii-encryption': 'PII Encryption',
  'gdpr-cascade-delete': 'GDPR Cascade Delete',
  'audit-log-query-es-export': 'Audit Log Query és Export',
  'retention-policy-es-archival': 'Retention Policy és Archival',
  'partner-crud-maganszemely-es-ceg': 'Partner CRUD (Magánszemély és Cég)',
  'meghatalmazott-kezeles': 'Meghatalmazott Kezelés',
  'torzsvendeg-kartya-rendszer': 'Törzsvendég Kártya Rendszer',
  'partner-hitelkeret-kezeles': 'Partner Hitelkeret Kezelés',
  'partner-blacklist-es-figyelmeztetesek': 'Partner Blacklist és Figyelmeztetések',
  'partner-kereses-es-azonositas': 'Partner Keresés és Azonosítás',
  'cikk-crud': 'Cikk CRUD',
  'cikkcsoport-hierarchia': 'Cikkcsoport Hierarchia',
  'beszallito-kapcsolat-es-import': 'Beszállító Kapcsolat és Import',
  'vonalkod-es-qr-kod-kezeles': 'Vonalkód és QR-kód Kezelés',
  'arszabaly-kezeles': 'Árszabály Kezelés',
  'keszlet-nyilvantartas-alap': 'Készlet Nyilvántartás Alap',
  'k-p-d-helykod-rendszer': 'K-P-D Helykód Rendszer',
  'multi-warehouse-tamogatas': 'Multi-Warehouse Támogatás',
  'keszlet-mozgas-audit-trail': 'Készlet Mozgás Audit Trail',
  'serial-number-es-batch-tracking': 'Serial Number és Batch Tracking',
  'minimum-stock-alert': 'Minimum Stock Alert',
  'szamla-crud': 'Számla CRUD',
  'szamla-tetel-kezeles': 'Számla Tétel Kezelés',
  'szamla-pdf-generalas': 'Számla PDF Generálás',
  'szamla-statusz-workflow': 'Számla Státusz Workflow',
  'sztorno-szamla': 'Sztornó Számla',
  'szamla-lathatosag-rbac': 'Számla Láthatóság RBAC',
  'szamlazz-hu-api-integracio': 'Számlázz.hu API Integráció',
  'nav-xml-builder': 'NAV XML Builder',
  'retry-logic-es-error-handling': 'Retry Logic és Error Handling',
  'nav-szamla-statusz-kovetes': 'NAV Számla Státusz Követés',
  'offline-fallback-es-queue': 'Offline Fallback és Queue',
  'bevasarlolista-tetel': 'Bevásárlólista Tétel',
  'to-do-feladat-felelossel': 'To-Do Feladat Felelőssel',
  'feladat-statusz-es-kipipalas': 'Feladat Státusz és Kipipálás',
  'szemelyes-jegyzet': 'Személyes Jegyzet',
  'boltvezeto-lista-hozzaferes': 'Boltvezető Lista Hozzáférés',
  'bergep-crud': 'Bérgép CRUD',
  'bergep-statusz-lifecycle': 'Bérgép Státusz Lifecycle',
  'serial-number-es-qr-kod': 'Serial Number és QR-kód',
  'tartozek-kezeles': 'Tartozék Kezelés',
  'bergep-elozmenyek-es-karbantartas': 'Bérgép Előzmények és Karbantartás',
  'berles-kiadas-wizard': 'Bérlés Kiadás Wizard',
  'berlesi-dij-kalkulacio': 'Bérlési Díj Kalkuláció',
  'kedvezmeny-kezeles-role-based': 'Kedvezmény Kezelés (Role-based)',
  'berles-visszavetel-workflow': 'Bérlés Visszavétel Workflow',
  'berles-hosszabbitas': 'Bérlés Hosszabbítás',
  'kesedelmi-dij-szamitas': 'Késedelmi Díj Számítás',
  'berles-statuszok-es-audit': 'Bérlés Státuszok és Audit',
  'szerzodes-template-kezeles': 'Szerződés Template Kezelés',
  'szerzodes-pdf-generalas': 'Szerződés PDF Generálás',
  'digitalis-alairas': 'Digitális Aláírás',
  'szerzodes-archivalas': 'Szerződés Archiválás',
  'kaucio-felvetel-keszpenz-kartya': 'Kaució Felvétel (Készpénz/Kártya)',
  'mypos-pre-authorization': 'MyPOS Pre-Authorization',
  'kaucio-visszaadas': 'Kaució Visszaadás',
  'kaucio-visszatartas-serules': 'Kaució Visszatartás (Sérülés)',
  'kaucio-konyveles-es-riport': 'Kaució Könyvelés és Riport',
  'munkalap-crud': 'Munkalap CRUD',
  'munkalap-statusz-workflow': 'Munkalap Státusz Workflow',
  'diagnosztika-es-hibaok': 'Diagnosztika és Hibaok',
  'alkatresz-felhasznalas': 'Alkatrész Felhasználás',
  'munkadij-kalkulacio': 'Munkadíj Kalkuláció',
  'munkalap-berles-kapcsolat': 'Munkalap-Bérlés Kapcsolat',
  'prioritas-es-varakozasi-lista': 'Prioritás és Várakozási Lista',
  'tarolasi-dij-kezeles': 'Tárolási Díj Kezelés',
  'arajanlat-generalas': 'Árajánlat Generálás',
  'robbantott-abra-alapu-alkatresz-kivalasztas': 'Robbantott Ábra Alapú Alkatrész Kiválasztás',
  'arajanlat-pdf-es-email': 'Árajánlat PDF és Email',
  'arajanlat-elfogadas-munkalap': 'Árajánlat Elfogadás → Munkalap',
  'garancialis-vs-fizetos-megkulonboztetes': 'Garanciális vs Fizetős Megkülönböztetés',
  'warranty-claim-letrehozas': 'Warranty Claim Létrehozás',
  'claim-statusz-tracking': 'Claim Státusz Tracking',
  'claim-elszamolas': 'Claim Elszámolás',
  'norma-tetel-import': 'Norma Tétel Import',
  'norma-alapu-munkadij': 'Norma Alapú Munkadíj',
  'norma-lista-frissites': 'Norma Lista Frissítés',
  'avizo-kezeles': 'Avizo Kezelés',
  'bevetelezes-workflow': 'Bevételezés Workflow',
  'bevetelezes-elteres-kezeles': 'Bevételezés Eltérés Kezelés',
  'ertekesites-kasszabol': 'Értékesítés Kasszából',
  'fizetesi-modok': 'Fizetési Módok',
  'napi-penztarzaras': 'Napi Pénztárzárás',
  'beszerzesi-ar-tracking': 'Beszerzési Ár Tracking',
  'arres-kalkulacio-es-riport': 'Árrés Kalkuláció és Riport',
  'leltar-inditas': 'Leltár Indítás',
  'leltar-rogzites': 'Leltár Rögzítés',
  'leltar-elteres-es-korrekcio': 'Leltár Eltérés és Korrekció',
  'bergep-szervizbe-kuldes-automatizalas': 'Bérgép Szervizbe Küldés Automatizálás',
  'szerviz-kesz-bergep-visszaall': 'Szerviz Kész → Bérgép Visszaáll',
  'online-foglalas-felulet': 'Online Foglalás Felület',
  'foglalas-megerosites': 'Foglalás Megerősítés',
  'dashboard-widgetek': 'Dashboard Widgetek',
  'reszletes-riportok': 'Részletes Riportok',
  'cross-tenant-riportok': 'Cross-Tenant Riportok',
  'partner-szinkronizalas': 'Partner Szinkronizálás',
  'crm-dashboard-embed': 'CRM Dashboard Embed',
  'support-ticket-integracio': 'Support Ticket Integráció',
  'ai-escalation-chatwoot-ba': 'AI Escalation → Chatwoot-ba',
  'dolgozo-adatok-szinkronizalas': 'Dolgozó Adatok Szinkronizálás',
  'koko-chatbot-widget': 'Koko Chatbot Widget',
  'intent-classification-es-routing': 'Intent Classification és Routing',
  'ai-quota-es-rate-limiting': 'AI Quota és Rate Limiting',
  'real-time-1-to-1-chat': 'Real-time 1-to-1 Chat',
  'online-offline-statusz': 'Online/Offline Státusz',
  'chat-ertesitesek': 'Chat Értesítések',
  'chat-elozmenyek': 'Chat Előzmények',
  'twenty-crm-docker-setup': 'Twenty CRM Docker Setup',
  'chatwoot-docker-setup': 'Chatwoot Docker Setup',
  'horilla-hr-docker-setup': 'Horilla HR Docker Setup',
  'full-stack-docker-compose': 'Full Stack Docker Compose',
  'kubernetes-manifests-production': 'Kubernetes Manifests (Production)',
  'ci-cd-pipeline-setup': 'CI/CD Pipeline Setup',
  'monitoring-observability-stack': 'Monitoring & Observability Stack',
};

interface ParsedData {
  epics: Map<string, { status: string; retrospective: string }>;
  stories: Map<string, string>;
}

function parseSprintStatus(): ParsedData {
  const content = fs.readFileSync(SPRINT_STATUS_PATH, 'utf-8');
  const data = yaml.load(content) as Record<string, unknown>;

  const epics = new Map<string, { status: string; retrospective: string }>();
  const stories = new Map<string, string>();

  const devStatus = data.development_status || {};

  for (const [key, value] of Object.entries(devStatus)) {
    if (key.startsWith('epic-') && !key.includes('retrospective')) {
      const epicNum = key.replace('epic-', '');
      const retroKey = `${key}-retrospective`;
      epics.set(epicNum, {
        status: value as string,
        retrospective: (devStatus[retroKey] as string) || 'optional',
      });
    } else if (!key.startsWith('epic-') && !key.includes('retrospective')) {
      stories.set(key, value as string);
    }
  }

  return { epics, stories };
}

function getStoryName(storyId: string): string {
  // Extract the name part from story ID like "1-1-jwt-login-endpoint"
  const parts = storyId.split('-');
  if (parts.length >= 3) {
    const namePart = parts.slice(2).join('-');
    return (
      STORY_NAMES[namePart] || namePart.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    );
  }
  return storyId;
}

function generateTypeScript(data: ParsedData): string {
  const now = new Date().toISOString().split('T')[0];

  let output = `/**
 * Real Sprint Data from KGC-3 project
 * Source: implementation-artifacts/sprint-status.yaml
 * Auto-generated: ${now}
 * DO NOT EDIT MANUALLY - Run: pnpm generate-dashboard-data
 */

export type StoryStatus = 'backlog' | 'drafted' | 'ready-for-dev' | 'in-progress' | 'review' | 'done';
export type EpicStatus = 'backlog' | 'in-progress' | 'done';

export interface Story {
  id: string;
  name: string;
  status: StoryStatus;
  tasks: string[];
}

export interface Epic {
  epic: string;
  name: string;
  status: EpicStatus;
  package: string;
  layer: 'core' | 'shared' | 'berles' | 'szerviz' | 'aruhaz' | 'integration' | 'plugin' | 'infra';
  stories: Story[];
  retrospectiveDone: boolean;
}

export interface SprintStats {
  totalEpics: number;
  completedEpics: number;
  inProgressEpics: number;
  backlogEpics: number;
  totalStories: number;
  completedStories: number;
  inProgressStories: number;
  reviewStories: number;
  backlogStories: number;
  completionRate: number;
}

// ============================================
// REAL EPIC DATA FROM SPRINT-STATUS.YAML
// ============================================

export const EPICS: Epic[] = [
`;

  // Group stories by epic
  const epicStories = new Map<string, Array<{ id: string; status: string }>>();

  for (const [storyKey, status] of data.stories) {
    const epicNum = storyKey.split('-')[0];
    if (!epicStories.has(epicNum)) {
      epicStories.set(epicNum, []);
    }
    epicStories.get(epicNum)!.push({ id: storyKey, status: status as string });
  }

  // Generate epic entries
  const layers = [
    'core',
    'shared',
    'berles',
    'szerviz',
    'aruhaz',
    'integration',
    'plugin',
    'infra',
  ];
  const layerComments: Record<string, string> = {
    core: 'CORE LAYER',
    shared: 'SHARED LAYER',
    berles: 'BÉRLÉS LAYER',
    szerviz: 'SZERVIZ LAYER',
    aruhaz: 'ÁRUHÁZ LAYER',
    integration: 'INTEGRATION LAYER',
    plugin: 'PLUGIN LAYER',
    infra: 'INFRASTRUCTURE LAYER',
  };

  let currentLayer = '';

  // Sort epics by number
  const sortedEpics = Array.from(data.epics.entries()).sort(
    (a, b) => parseInt(a[0]) - parseInt(b[0])
  );

  for (const [epicNum, epicData] of sortedEpics) {
    const meta = EPIC_METADATA[epicNum];
    if (!meta) continue;

    // Add layer comment
    if (meta.layer !== currentLayer) {
      currentLayer = meta.layer;
      output += `  // ============================================
  // ${layerComments[currentLayer] || currentLayer.toUpperCase()}
  // ============================================
`;
    }

    const stories = epicStories.get(epicNum) || [];
    const storiesStr = stories
      .map(s => {
        const storyId = s.id.split('-').slice(0, 2).join('-');
        const name = getStoryName(s.id);
        const status = mapStatus(s.status);
        return `      { id: '${storyId}', name: '${name}', status: '${status}', tasks: [] }`;
      })
      .join(',\n');

    output += `  {
    epic: '${epicNum}',
    name: '${meta.name}',
    package: '${meta.package}',
    layer: '${meta.layer}',
    status: '${mapEpicStatus(epicData.status)}',
    retrospectiveDone: ${epicData.retrospective === 'done'},
    stories: [
${storiesStr}
    ],
  },
`;
  }

  output += `];

// ============================================
// STATS CALCULATOR
// ============================================

export function calculateSprintStats(): SprintStats {
  let totalStories = 0;
  let completedStories = 0;
  let inProgressStories = 0;
  let reviewStories = 0;
  let backlogStories = 0;

  const completedEpics = EPICS.filter(e => e.status === 'done').length;
  const inProgressEpics = EPICS.filter(e => e.status === 'in-progress').length;
  const backlogEpics = EPICS.filter(e => e.status === 'backlog').length;

  for (const epic of EPICS) {
    for (const story of epic.stories) {
      totalStories++;
      if (story.status === 'done') completedStories++;
      else if (story.status === 'in-progress') inProgressStories++;
      else if (story.status === 'review') reviewStories++;
      else backlogStories++;
    }
  }

  return {
    totalEpics: EPICS.length,
    completedEpics,
    inProgressEpics,
    backlogEpics,
    totalStories,
    completedStories,
    inProgressStories,
    reviewStories,
    backlogStories,
    completionRate: totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0,
  };
}
`;

  return output;
}

function mapStatus(status: string): string {
  const mapping: Record<string, string> = {
    backlog: 'backlog',
    drafted: 'drafted',
    'ready-for-dev': 'ready-for-dev',
    'in-progress': 'in-progress',
    review: 'review',
    done: 'done',
  };
  return mapping[status] || 'backlog';
}

function mapEpicStatus(status: string): string {
  const mapping: Record<string, string> = {
    backlog: 'backlog',
    'in-progress': 'in-progress',
    done: 'done',
  };
  return mapping[status] || 'backlog';
}

// Main execution
console.log('🔄 Generating dashboard data...');
console.log(`   Source: ${SPRINT_STATUS_PATH}`);
console.log(`   Output: ${OUTPUT_PATH}`);

try {
  const data = parseSprintStatus();
  const typescript = generateTypeScript(data);

  fs.writeFileSync(OUTPUT_PATH, typescript);

  console.log(`✅ Generated sprint-data.ts`);
  console.log(`   Epics: ${data.epics.size}`);
  console.log(`   Stories: ${data.stories.size}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
} catch (error) {
  console.error('❌ Error generating data:', error);
  process.exit(1);
}
