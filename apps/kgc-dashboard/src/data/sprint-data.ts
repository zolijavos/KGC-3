/**
 * Real Sprint Data from KGC-3 project
 * Source: implementation-artifacts/sprint-status.yaml
 * Auto-generated: 2026-01-18
 * DO NOT EDIT MANUALLY - Run: pnpm generate-dashboard-data
 */

export type StoryStatus =
  | 'backlog'
  | 'drafted'
  | 'ready-for-dev'
  | 'in-progress'
  | 'review'
  | 'done';
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
  // ============================================
  // CORE LAYER
  // ============================================
  {
    epic: '1',
    name: 'Authentication',
    package: '@kgc/auth',
    layer: 'core',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '1-1', name: 'JWT Login Endpoint', status: 'done', tasks: [] },
      { id: '1-2', name: 'Token Refresh', status: 'done', tasks: [] },
      { id: '1-3', name: 'Logout és Session Invalidation', status: 'done', tasks: [] },
      { id: '1-4', name: 'PIN kód belépés (Kiosk mód)', status: 'done', tasks: [] },
      { id: '1-5', name: 'Password Reset Flow', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '2',
    name: 'User Management',
    package: '@kgc/users',
    layer: 'core',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '2-1', name: 'User CRUD Operations', status: 'done', tasks: [] },
      { id: '2-2', name: 'Role Assignment és RBAC', status: 'done', tasks: [] },
      { id: '2-3', name: 'Permission Check Middleware', status: 'done', tasks: [] },
      { id: '2-4', name: 'Elevated Access Requirement', status: 'done', tasks: [] },
      { id: '2-5', name: 'Tenant és Location Scoped Permissions', status: 'done', tasks: [] },
      { id: '2-6', name: 'User Profile Management', status: 'done', tasks: [] },
      { id: '2-7', name: 'Code Review Fixes', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '3',
    name: 'Tenant Management',
    package: '@kgc/tenant',
    layer: 'core',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '3-1', name: 'Tenant CRUD és Alapstruktúra', status: 'done', tasks: [] },
      { id: '3-2', name: 'RLS Policy Infrastructure', status: 'done', tasks: [] },
      { id: '3-3', name: 'Tenant Context Middleware', status: 'done', tasks: [] },
      { id: '3-4', name: 'Tenant Onboarding Wizard', status: 'done', tasks: [] },
      { id: '3-5', name: 'Feature Flag Per Tenant', status: 'done', tasks: [] },
      { id: '3-6', name: 'Holding Struktúra Támogatás', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '4',
    name: 'Configuration',
    package: '@kgc/config',
    layer: 'core',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '4-1', name: 'System Configuration Service', status: 'done', tasks: [] },
      { id: '4-2', name: 'Tenant Configuration', status: 'done', tasks: [] },
      { id: '4-3', name: 'License Management', status: 'done', tasks: [] },
      { id: '4-4', name: 'Configuration Cache és Reload', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '5',
    name: 'UI Component Library',
    package: '@kgc/ui',
    layer: 'core',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '5-1', name: 'Shadcn/UI Setup és Core Components', status: 'done', tasks: [] },
      { id: '5-2', name: 'Layout és Navigation Components', status: 'done', tasks: [] },
      { id: '5-3', name: 'PWA Service Worker és Manifest', status: 'done', tasks: [] },
      { id: '5-4', name: 'Offline Data Caching (IndexedDB)', status: 'done', tasks: [] },
      { id: '5-5', name: 'Background Sync és Conflict Resolution', status: 'done', tasks: [] },
      { id: '5-6', name: 'Form Components és Validation', status: 'done', tasks: [] },
      { id: '5-7', name: 'Barcode Scanner Integration', status: 'done', tasks: [] },
      { id: '5-8', name: 'Push Notifications', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '6',
    name: 'Audit Trail',
    package: '@kgc/audit',
    layer: 'core',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '6-1', name: 'Audit Log Service', status: 'done', tasks: [] },
      { id: '6-2', name: 'PII Encryption', status: 'done', tasks: [] },
      { id: '6-3', name: 'GDPR Cascade Delete', status: 'done', tasks: [] },
      { id: '6-4', name: 'Audit Log Query és Export', status: 'done', tasks: [] },
      { id: '6-5', name: 'Retention Policy és Archival', status: 'done', tasks: [] },
    ],
  },
  // ============================================
  // SHARED LAYER
  // ============================================
  {
    epic: '7',
    name: 'Partner Management',
    package: '@kgc/partner',
    layer: 'shared',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '7-1', name: 'Partner CRUD (Magánszemély és Cég)', status: 'done', tasks: [] },
      { id: '7-2', name: 'Meghatalmazott Kezelés', status: 'done', tasks: [] },
      { id: '7-3', name: 'Törzsvendég Kártya Rendszer', status: 'done', tasks: [] },
      { id: '7-4', name: 'Partner Hitelkeret Kezelés', status: 'done', tasks: [] },
      { id: '7-5', name: 'Partner Blacklist és Figyelmeztetések', status: 'done', tasks: [] },
      { id: '7-6', name: 'Partner Keresés és Azonosítás', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '8',
    name: 'Product Catalog',
    package: '@kgc/cikk',
    layer: 'shared',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '8-1', name: 'Cikk CRUD', status: 'done', tasks: [] },
      { id: '8-2', name: 'Cikkcsoport Hierarchia', status: 'done', tasks: [] },
      { id: '8-3', name: 'Beszállító Kapcsolat és Import', status: 'done', tasks: [] },
      { id: '8-4', name: 'Vonalkód és QR-kód Kezelés', status: 'done', tasks: [] },
      { id: '8-5', name: 'Árszabály Kezelés', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '9',
    name: 'Inventory Core',
    package: '@kgc/inventory',
    layer: 'shared',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '9-1', name: 'Készlet Nyilvántartás Alap', status: 'done', tasks: [] },
      { id: '9-2', name: 'K-P-D Helykód Rendszer', status: 'done', tasks: [] },
      { id: '9-3', name: 'Multi-Warehouse Támogatás', status: 'done', tasks: [] },
      { id: '9-4', name: 'Készlet Mozgás Audit Trail', status: 'done', tasks: [] },
      { id: '9-5', name: 'Serial Number és Batch Tracking', status: 'done', tasks: [] },
      { id: '9-6', name: 'Minimum Stock Alert', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '10',
    name: 'Invoice Core',
    package: '@kgc/sales-invoice',
    layer: 'shared',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '10-1', name: 'Számla CRUD', status: 'done', tasks: [] },
      { id: '10-2', name: 'Számla Tétel Kezelés', status: 'done', tasks: [] },
      { id: '10-3', name: 'Számla PDF Generálás', status: 'backlog', tasks: [] },
      { id: '10-4', name: 'Számla Státusz Workflow', status: 'done', tasks: [] },
      { id: '10-5', name: 'Sztornó Számla', status: 'done', tasks: [] },
      { id: '10-6', name: 'Számla Láthatóság RBAC', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '11',
    name: 'NAV Integration',
    package: '@kgc/nav-online',
    layer: 'shared',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '11-1', name: 'Számlázz.hu API Integráció', status: 'done', tasks: [] },
      { id: '11-2', name: 'NAV XML Builder', status: 'done', tasks: [] },
      { id: '11-3', name: 'Retry Logic és Error Handling', status: 'done', tasks: [] },
      { id: '11-4', name: 'NAV Számla Státusz Követés', status: 'done', tasks: [] },
      { id: '11-5', name: 'Offline Fallback és Queue', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '12',
    name: 'Task List Widget',
    package: '@kgc/feladatlista',
    layer: 'shared',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '12-1', name: 'Bevásárlólista Tétel', status: 'done', tasks: [] },
      { id: '12-2', name: 'To-Do Feladat Felelőssel', status: 'done', tasks: [] },
      { id: '12-3', name: 'Feladat Státusz és Kipipálás', status: 'done', tasks: [] },
      { id: '12-4', name: 'Személyes Jegyzet', status: 'done', tasks: [] },
      { id: '12-5', name: 'Boltvezető Lista Hozzáférés', status: 'done', tasks: [] },
    ],
  },
  // ============================================
  // BÉRLÉS LAYER
  // ============================================
  {
    epic: '13',
    name: 'Rental Equipment',
    package: '@kgc/bergep',
    layer: 'berles',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '13-1', name: 'Bérgép CRUD', status: 'done', tasks: [] },
      { id: '13-2', name: 'Bérgép Státusz Lifecycle', status: 'done', tasks: [] },
      { id: '13-3', name: 'Serial Number és QR-kód', status: 'done', tasks: [] },
      { id: '13-4', name: 'Tartozék Kezelés', status: 'done', tasks: [] },
      { id: '13-5', name: 'Bérgép Előzmények és Karbantartás', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '14',
    name: 'Rental Operations',
    package: '@kgc/rental-core',
    layer: 'berles',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '14-1', name: 'Bérlés Kiadás Wizard', status: 'done', tasks: [] },
      { id: '14-2', name: 'Bérlési Díj Kalkuláció', status: 'done', tasks: [] },
      { id: '14-3', name: 'Kedvezmény Kezelés (Role-based)', status: 'done', tasks: [] },
      { id: '14-4', name: 'Bérlés Visszavétel Workflow', status: 'done', tasks: [] },
      { id: '14-5', name: 'Bérlés Hosszabbítás', status: 'done', tasks: [] },
      { id: '14-6', name: 'Késedelmi Díj Számítás', status: 'done', tasks: [] },
      { id: '14-7', name: 'Bérlés Státuszok és Audit', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '15',
    name: 'Rental Contracts',
    package: '@kgc/rental-contract',
    layer: 'berles',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '15-1', name: 'Szerződés Template Kezelés', status: 'done', tasks: [] },
      { id: '15-2', name: 'Szerződés PDF Generálás', status: 'done', tasks: [] },
      { id: '15-3', name: 'Digitális Aláírás', status: 'done', tasks: [] },
      { id: '15-4', name: 'Szerződés Archiválás', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '16',
    name: 'Deposit Management',
    package: '@kgc/rental-checkout',
    layer: 'berles',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '16-1', name: 'Kaució Felvétel (Készpénz/Kártya)', status: 'done', tasks: [] },
      { id: '16-2', name: 'MyPOS Pre-Authorization', status: 'done', tasks: [] },
      { id: '16-3', name: 'Kaució Visszaadás', status: 'done', tasks: [] },
      { id: '16-4', name: 'Kaució Visszatartás (Sérülés)', status: 'done', tasks: [] },
      { id: '16-5', name: 'Kaució Könyvelés és Riport', status: 'done', tasks: [] },
    ],
  },
  // ============================================
  // SZERVIZ LAYER
  // ============================================
  {
    epic: '17',
    name: 'Work Orders',
    package: '@kgc/service-worksheet',
    layer: 'szerviz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '17-1', name: 'Munkalap CRUD', status: 'done', tasks: [] },
      { id: '17-2', name: 'Munkalap Státusz Workflow', status: 'done', tasks: [] },
      { id: '17-3', name: 'Diagnosztika és Hibaok', status: 'done', tasks: [] },
      { id: '17-4', name: 'Alkatrész Felhasználás', status: 'done', tasks: [] },
      { id: '17-5', name: 'Munkadíj Kalkuláció', status: 'done', tasks: [] },
      { id: '17-6', name: 'Munkalap-Bérlés Kapcsolat', status: 'done', tasks: [] },
      { id: '17-7', name: 'Prioritás és Várakozási Lista', status: 'done', tasks: [] },
      { id: '17-8', name: 'Tárolási Díj Kezelés', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '18',
    name: 'Quotations',
    package: '@kgc/sales-quote',
    layer: 'szerviz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '18-1', name: 'Árajánlat Generálás', status: 'done', tasks: [] },
      {
        id: '18-2',
        name: 'Robbantott Ábra Alapú Alkatrész Kiválasztás',
        status: 'done',
        tasks: [],
      },
      { id: '18-3', name: 'Árajánlat PDF és Email', status: 'done', tasks: [] },
      { id: '18-4', name: 'Árajánlat Elfogadás → Munkalap', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '19',
    name: 'Warranty Claims',
    package: '@kgc/service-warranty',
    layer: 'szerviz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '19-1', name: 'Garanciális vs Fizetős Megkülönböztetés', status: 'done', tasks: [] },
      { id: '19-2', name: 'Warranty Claim Létrehozás', status: 'done', tasks: [] },
      { id: '19-3', name: 'Claim Státusz Tracking', status: 'done', tasks: [] },
      { id: '19-4', name: 'Claim Elszámolás', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '20',
    name: 'Service Standards',
    package: '@kgc/service-norma',
    layer: 'szerviz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '20-1', name: 'Norma Tétel Import', status: 'done', tasks: [] },
      { id: '20-2', name: 'Norma Alapú Munkadíj', status: 'done', tasks: [] },
      { id: '20-3', name: 'Norma Lista Frissítés', status: 'done', tasks: [] },
    ],
  },
  // ============================================
  // ÁRUHÁZ LAYER
  // ============================================
  {
    epic: '21',
    name: 'Goods Receipt',
    package: '@kgc/bevetelezes',
    layer: 'aruhaz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '21-1', name: 'Avizo Kezelés', status: 'done', tasks: [] },
      { id: '21-2', name: 'Bevételezés Workflow', status: 'done', tasks: [] },
      { id: '21-3', name: 'Bevételezés Eltérés Kezelés', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '22',
    name: 'Point of Sale',
    package: '@kgc/sales-pos',
    layer: 'aruhaz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '22-1', name: 'Értékesítés Kasszából', status: 'done', tasks: [] },
      { id: '22-2', name: 'Fizetési Módok', status: 'done', tasks: [] },
      { id: '22-3', name: 'Napi Pénztárzárás', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '23',
    name: 'Pricing & Margin',
    package: '@kgc/arres',
    layer: 'aruhaz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '23-1', name: 'Beszerzési Ár Tracking', status: 'done', tasks: [] },
      { id: '23-2', name: 'Árrés Kalkuláció és Riport', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '24',
    name: 'Stock Count',
    package: '@kgc/leltar',
    layer: 'aruhaz',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '24-1', name: 'Leltár Indítás', status: 'done', tasks: [] },
      { id: '24-2', name: 'Leltár Rögzítés', status: 'done', tasks: [] },
      { id: '24-3', name: 'Leltár Eltérés és Korrekció', status: 'done', tasks: [] },
    ],
  },
  // ============================================
  // INTEGRATION LAYER
  // ============================================
  {
    epic: '25',
    name: 'Equipment-Service Integration',
    package: '@kgc/bergep-szerviz',
    layer: 'integration',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '25-1', name: 'Bérgép Szervizbe Küldés Automatizálás', status: 'done', tasks: [] },
      { id: '25-2', name: 'Szerviz Kész → Bérgép Visszaáll', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '26',
    name: 'Online Booking',
    package: '@kgc/online-booking',
    layer: 'integration',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '26-1', name: 'Online Foglalás Felület', status: 'done', tasks: [] },
      { id: '26-2', name: 'Foglalás Megerősítés', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '27',
    name: 'Reporting Engine',
    package: '@kgc/reporting',
    layer: 'integration',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '27-1', name: 'Dashboard Widgetek', status: 'done', tasks: [] },
      { id: '27-2', name: 'Részletes Riportok', status: 'done', tasks: [] },
      { id: '27-3', name: 'Cross-Tenant Riportok', status: 'done', tasks: [] },
    ],
  },
  // ============================================
  // PLUGIN LAYER
  // ============================================
  {
    epic: '28',
    name: 'Twenty CRM Integration',
    package: '@kgc/twenty-crm',
    layer: 'plugin',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '28-1', name: 'Partner Szinkronizálás', status: 'done', tasks: [] },
      { id: '28-2', name: 'CRM Dashboard Embed', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '29',
    name: 'Chatwoot Integration',
    package: '@kgc/chatwoot',
    layer: 'plugin',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '29-1', name: 'Support Ticket Integráció', status: 'done', tasks: [] },
      { id: '29-2', name: 'AI Escalation → Chatwoot-ba', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '30',
    name: 'Horilla HR Integration',
    package: '@kgc/horilla-hr',
    layer: 'plugin',
    status: 'done',
    retrospectiveDone: true,
    stories: [{ id: '30-1', name: 'Dolgozó Adatok Szinkronizálás', status: 'done', tasks: [] }],
  },
  {
    epic: '31',
    name: 'Koko AI Chatbot',
    package: '@kgc/koko-ai',
    layer: 'plugin',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '31-1', name: 'Koko Chatbot Widget', status: 'done', tasks: [] },
      { id: '31-2', name: 'Intent Classification és Routing', status: 'done', tasks: [] },
      { id: '31-3', name: 'AI Quota és Rate Limiting', status: 'done', tasks: [] },
    ],
  },
  {
    epic: '32',
    name: 'Internal Chat',
    package: '@kgc/chat',
    layer: 'plugin',
    status: 'done',
    retrospectiveDone: true,
    stories: [
      { id: '32-1', name: 'Real-time 1-to-1 Chat', status: 'done', tasks: [] },
      { id: '32-2', name: 'Online/Offline Státusz', status: 'done', tasks: [] },
      { id: '32-3', name: 'Chat Értesítések', status: 'done', tasks: [] },
      { id: '32-4', name: 'Chat Előzmények', status: 'done', tasks: [] },
    ],
  },
  // ============================================
  // INFRASTRUCTURE LAYER
  // ============================================
  {
    epic: '33',
    name: 'Infrastructure & Deployment',
    package: 'infra',
    layer: 'infra',
    status: 'in-progress',
    retrospectiveDone: false,
    stories: [
      { id: '33-1', name: 'Twenty CRM Docker Setup', status: 'review', tasks: [] },
      { id: '33-2', name: 'Chatwoot Docker Setup', status: 'review', tasks: [] },
      { id: '33-3', name: 'Horilla HR Docker Setup', status: 'review', tasks: [] },
      { id: '33-4', name: 'Full Stack Docker Compose', status: 'backlog', tasks: [] },
      { id: '33-5', name: 'Kubernetes Manifests (Production)', status: 'backlog', tasks: [] },
      { id: '33-6', name: 'CI/CD Pipeline Setup', status: 'backlog', tasks: [] },
      { id: '33-7', name: 'Monitoring & Observability Stack', status: 'backlog', tasks: [] },
    ],
  },
];

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
