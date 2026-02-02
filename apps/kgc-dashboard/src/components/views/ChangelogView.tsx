import { cn } from '@/lib/utils';
import { useState } from 'react';

type ReleaseType = 'major' | 'minor' | 'patch';
type ChangeCategory = 'new' | 'improved' | 'fixed';

interface TestDetail {
  name: string;
  status: 'pass' | 'fail';
  duration?: string;
  file?: string;
}

interface ReviewDetail {
  reviewer: string;
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  status: 'fixed' | 'open' | 'wontfix';
  file?: string;
  line?: number;
}

interface ChangeItem {
  category: ChangeCategory;
  title: string;
  description: string;
  details?: string[];
  tests?: TestDetail[];
  reviews?: ReviewDetail[];
}

interface Release {
  version: string;
  date: string;
  type: ReleaseType;
  title: string;
  summary: string;
  changes: ChangeItem[];
  testSummary?: {
    total: number;
    passed: number;
    failed: number;
    coverage?: number;
  };
  reviewSummary?: {
    total: number;
    fixed: number;
    open: number;
  };
}

// Changelog data - in production this would come from an API
// Ordered by version DESCENDING (newest first)
const RELEASES: Release[] = [
  {
    version: '7.0.3',
    date: '2026. február 2.',
    type: 'patch',
    title: 'Infrastruktúra Javítások és E2E Teszt Fejlesztések',
    summary:
      'MyForgeOS deployment javítás, Horilla HR healthcheck fix, és E2E teszt infrastruktúra fejlesztések.',
    testSummary: { total: 40, passed: 37, failed: 3, coverage: 87 },
    reviewSummary: { total: 5, fixed: 5, open: 0 },
    changes: [
      {
        category: 'fixed',
        title: 'MyForgeOS Deployment Javítás',
        description:
          'A myforgeos.mflerp.com URL most már helyesen a MyForgeOS Dashboard-ot szolgálja ki az MFOPS helyett.',
        details: [
          'kgc-dashboard/dist feltöltve a VPS-re (/var/www/myforgeos/)',
          'nginx konfig átírva: proxy → static file serving',
          'SPA routing támogatás (try_files $uri /index.html)',
          'iframe embedding engedélyezve demo-kgc.mflerp.com számára',
        ],
        tests: [
          {
            name: 'MyForgeOS URL elérhetőség',
            status: 'pass',
            duration: '0.3s',
            file: 'infrastructure.e2e.ts',
          },
          {
            name: 'Helyes title megjelenés',
            status: 'pass',
            duration: '0.1s',
            file: 'infrastructure.e2e.ts',
          },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'critical',
            title: 'Rossz alkalmazás szolgáltatása',
            description:
              'A myforgeos.mflerp.com az MFOPS-t szolgálta ki a MyForgeOS Dashboard helyett a hibás nginx proxy konfig miatt.',
            status: 'fixed',
            file: 'myforgeos.mflerp.com.conf',
            line: 25,
          },
        ],
      },
      {
        category: 'fixed',
        title: 'Horilla HR Healthcheck Javítás',
        description:
          'A Horilla HR konténer healthcheck-je most már Python-t használ curl helyett, ami nem volt telepítve.',
        details: [
          'Healthcheck átírva: curl → python3 urllib.request',
          'Container státusz: unhealthy → healthy',
          'start_period: 120s (Django startup idő)',
        ],
        tests: [
          {
            name: 'Horilla container health',
            status: 'pass',
            duration: '2.1s',
            file: 'docker-health.e2e.ts',
          },
          {
            name: 'HR endpoint válasz',
            status: 'pass',
            duration: '0.5s',
            file: 'horilla-hr.api.e2e.ts',
          },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'major',
            title: 'Hiányzó curl a konténerben',
            description:
              'A healthcheck curl-t használt, ami nem volt telepítve a Horilla image-ben. 12000+ egymást követő healthcheck hiba.',
            status: 'fixed',
            file: 'docker-compose.yml',
            line: 64,
          },
        ],
      },
      {
        category: 'improved',
        title: 'E2E Teszt Infrastruktúra',
        description: 'Playwright E2E tesztek stabilitása és megbízhatósága javítva.',
        details: [
          'Auth setup: React hydration race condition fix (waitForTimeout + Promise.all)',
          'new-pages tesztek: stored auth state használata login helyett',
          'Rate limiter: 1000 req/min dev/test környezetben',
          'YOLO mód: gyorsabb tesztelés fejlesztés közben',
        ],
        tests: [
          {
            name: 'Auth setup stability',
            status: 'pass',
            duration: '3.2s',
            file: 'auth.setup.ts',
          },
          {
            name: 'New pages smoke tests',
            status: 'pass',
            duration: '4.5s',
            file: 'new-pages.e2e.ts',
          },
          {
            name: 'Critical test suite',
            status: 'pass',
            duration: '45s',
            file: 'critical/*.e2e.ts',
          },
        ],
      },
      {
        category: 'improved',
        title: 'Dokumentáció Frissítés',
        description: 'Infrastruktúra státusz dokumentáció és deployment útmutatók.',
        details: [
          'MFL-Infrastructure-Status-2026-02-02.md létrehozva',
          'URL → konténer mapping dokumentálva',
          'Hiányzó DNS rekordok azonosítva (ops, hr-demo)',
        ],
      },
    ],
  },
  {
    version: '7.0.2',
    date: '2026. január 18.',
    type: 'minor',
    title: 'Interaktív Dashboard Grafikonok',
    summary:
      'Új interaktív grafikonok és vizualizációk a Developer és QA nézeteken a jobb áttekinthetőségért.',
    testSummary: { total: 852, passed: 852, failed: 0, coverage: 87 },
    reviewSummary: { total: 22, fixed: 20, open: 2 },
    changes: [
      {
        category: 'new',
        title: 'Developer Áttekintés Grafikonok',
        description: 'Új interaktív Recharts grafikonok a fejlesztői áttekintés oldalon.',
        details: [
          'Story Státusz Donut Chart - DONE/IN_PROGRESS/Backlog arány vizuálisan',
          'Epic Haladás Bar Chart - Epic-enkénti százalékos haladás színkódolva',
          'Befejezési Trend Area Chart - Kumulatív befejezett story-k időbeli alakulása',
          'Top Stats Kártyák - Epics, Stories, Befejezett, Haladás % összefoglaló',
        ],
        tests: [
          {
            name: 'DeveloperView renderelés',
            status: 'pass',
            duration: '0.3s',
            file: 'DeveloperView.spec.ts',
          },
          {
            name: 'PieChart adatok helyessége',
            status: 'pass',
            duration: '0.1s',
            file: 'DeveloperView.spec.ts',
          },
          {
            name: 'BarChart tooltip működése',
            status: 'pass',
            duration: '0.2s',
            file: 'DeveloperView.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'QA Dashboard Grafikonok',
        description: 'Részletes QA metrikák vizualizálása interaktív grafikonokkal.',
        details: [
          'Pass Rate & Coverage Trend - Sprint trend kettős vonallal (Line Chart)',
          'Coverage Package Szerint - Package-enkénti coverage színkódolva (Bar Chart)',
          'Hiba Súlyosság Eloszlás - Kritikus/Magas/Közepes/Alacsony pie chart',
          'Claude vs Gemini Radar Chart - AI összehasonlítás kategóriánként',
          'Issue Resolution Flow - Talált → Javított → Nyitott funnel vizualizáció',
        ],
        tests: [
          { name: 'QAView renderelés', status: 'pass', duration: '0.4s', file: 'QAView.spec.ts' },
          { name: 'RadarChart adatok', status: 'pass', duration: '0.2s', file: 'QAView.spec.ts' },
          { name: 'LineChart tooltip', status: 'pass', duration: '0.1s', file: 'QAView.spec.ts' },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'minor',
            title: 'TypeScript implicit any típus',
            description: 'A Pie chart label funkciónál hiányzott a típus annotáció.',
            status: 'fixed',
            file: 'QAView.tsx',
            line: 182,
          },
        ],
      },
      {
        category: 'improved',
        title: 'Egységes Chart Stílus',
        description: 'A StatisticsView stílusának kiterjesztése az összes nézetre.',
        details: [
          'AI Mystic színpaletta minden grafikonon',
          'Egységes tooltip megjelenés sötét/világos módban',
          'Konzisztens grid és tengely stílusok',
          'Reszponzív ResponsiveContainer minden chartnál',
        ],
      },
      {
        category: 'improved',
        title: 'Developer View Elrendezés',
        description: 'Átdolgozott grid elrendezés a jobb olvashatóságért.',
        details: [
          'Folyamatban lévő Epics grid 3 oszlopos elrendezésben',
          'glass-card stílus minden szekción',
          'Epic & Story összesítés kombinált nézet',
        ],
      },
    ],
  },
  {
    version: '7.1.0',
    date: 'Hamarosan',
    type: 'minor',
    title: 'Riportok és Exportok',
    summary: 'Új riportolási funkciók és adat export lehetőségek az üzleti elemzéshez.',
    testSummary: { total: 45, passed: 45, failed: 0, coverage: 92 },
    reviewSummary: { total: 8, fixed: 8, open: 0 },
    changes: [
      {
        category: 'new',
        title: 'PDF Riportok',
        description: 'Automatikus PDF riport generálás napi, heti és havi bontásban.',
        details: [
          'Vezetői összefoglaló riport egyetlen oldalon',
          'Részletes sprint riport grafikon nélkül, tiszta adatokkal',
          'Pénzügyi áttekintés export számlázáshoz',
        ],
        tests: [
          {
            name: 'PDF generálás alapvető működése',
            status: 'pass',
            duration: '1.2s',
            file: 'pdf-generator.spec.ts',
          },
          {
            name: 'Riport sablon betöltése',
            status: 'pass',
            duration: '0.3s',
            file: 'pdf-generator.spec.ts',
          },
          {
            name: 'Magyar karakterek kezelése',
            status: 'pass',
            duration: '0.5s',
            file: 'pdf-generator.spec.ts',
          },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'minor',
            title: 'Hiányzó null check',
            description: 'A reportData.items iterálásnál nincs null ellenőrzés.',
            status: 'fixed',
            file: 'pdf-generator.ts',
            line: 45,
          },
        ],
      },
      {
        category: 'new',
        title: 'Excel Export',
        description: 'Részletes adatok exportálása Excel formátumban további elemzéshez.',
        details: [
          'Több munkalap támogatás: összefoglaló, epics, stories',
          'Szűrt adatok exportálása az aktuális nézetből',
          'Automatikus oszlopszélesség és formázás',
        ],
        tests: [
          {
            name: 'XLSX fájl generálás',
            status: 'pass',
            duration: '0.8s',
            file: 'excel-export.spec.ts',
          },
          {
            name: 'Több munkalap létrehozása',
            status: 'pass',
            duration: '0.4s',
            file: 'excel-export.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Ütemezett Riportok',
        description: 'Automatikus riport küldés emailben beállított időpontokban.',
        details: [
          'Napi, heti vagy havi ütemezés választható',
          'Több címzett megadható csoportonként',
          'Riport típus és formátum kiválasztása',
        ],
      },
      {
        category: 'improved',
        title: 'Szűrési Lehetőségek',
        description: 'Bővített szűrési és keresési funkciók minden listanézetben.',
        details: [
          'Dátum tartomány szűrő minden listához',
          'Mentett szűrők felhasználónként',
          'Gyors szűrés gomb gyakori lekérdezésekhez',
        ],
      },
    ],
  },
  {
    version: '7.0.1',
    date: '2025. január 18.',
    type: 'patch',
    title: 'Hibajavítások és Finomhangolás',
    summary: 'Apróbb hibajavítások és teljesítmény optimalizálások az első visszajelzések alapján.',
    testSummary: { total: 137, passed: 137, failed: 0, coverage: 89 },
    reviewSummary: { total: 12, fixed: 12, open: 0 },
    changes: [
      {
        category: 'fixed',
        title: 'Bejelentkezési Token Frissítés',
        description:
          'Javítottuk a bejelentkezési token frissítési problémát hosszabb használat esetén.',
        details: [
          'A token lejárat előtt 5 perccel automatikusan frissül',
          'Párhuzamos kérések esetén nincs többszörös frissítés',
          'Offline állapotból visszatéréskor automatikus újracsatlakozás',
        ],
        tests: [
          {
            name: 'Token refresh 5 perccel lejárat előtt',
            status: 'pass',
            duration: '0.2s',
            file: 'auth.service.spec.ts',
          },
          {
            name: 'Race condition védelem',
            status: 'pass',
            duration: '0.3s',
            file: 'auth.service.spec.ts',
          },
          {
            name: 'Offline → online újracsatlakozás',
            status: 'pass',
            duration: '1.1s',
            file: 'auth.service.spec.ts',
          },
          {
            name: 'Invalid refresh token kezelése',
            status: 'pass',
            duration: '0.1s',
            file: 'auth.service.spec.ts',
          },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'critical',
            title: 'Race condition a token frissítésnél',
            description:
              'Több párhuzamos kérés egyszerre próbálta frissíteni a tokent, ami 401-es hibákat okozott.',
            status: 'fixed',
            file: 'auth.service.ts',
            line: 78,
          },
          {
            reviewer: 'Gemini',
            severity: 'major',
            title: 'Hiányzó retry logika',
            description: 'Network hiba esetén nem próbálta újra a token frissítést.',
            status: 'fixed',
            file: 'auth.service.ts',
            line: 92,
          },
        ],
      },
      {
        category: 'improved',
        title: 'Oldalbetöltési Sebesség',
        description: 'Gyorsabb oldalbetöltés a főbb nézeteken.',
        details: [
          'Dashboard: 2.1s → 0.8s (62% javulás)',
          'Epic lista: 1.5s → 0.5s (67% javulás)',
          'Lazy loading implementálva a ritkán használt komponensekre',
        ],
        tests: [
          {
            name: 'Dashboard betöltés < 1s',
            status: 'pass',
            duration: '0.8s',
            file: 'performance.e2e.ts',
          },
          {
            name: 'Lazy component betöltés',
            status: 'pass',
            duration: '0.3s',
            file: 'lazy-load.spec.ts',
          },
        ],
      },
      {
        category: 'fixed',
        title: 'Mobilos Menü',
        description: 'A mobil navigáció most már megfelelően jelenik meg minden képernyőméreten.',
        details: [
          'Hamburger menü gomb mindig látható 1024px alatt',
          'Menü bezárás swipe gesztussal támogatott',
          'Aktív oldal kiemelése a mobil menüben',
        ],
        tests: [
          {
            name: 'Mobil menü megjelenés 768px',
            status: 'pass',
            duration: '0.4s',
            file: 'mobile-nav.e2e.ts',
          },
          { name: 'Swipe bezárás', status: 'pass', duration: '0.6s', file: 'mobile-nav.e2e.ts' },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'minor',
            title: 'Z-index konfliktus',
            description: 'A mobil menü overlay z-indexe ütközött a modal ablakokkal.',
            status: 'fixed',
            file: 'MobileSidebar.tsx',
            line: 23,
          },
        ],
      },
    ],
  },
  {
    version: '7.0.0',
    date: '2025. január 15.',
    type: 'major',
    title: 'KGC ERP v7 - Teljes Megújulás',
    summary:
      'Komplett ERP rendszer 45+ frontend oldallal: Bérlés, Munkalap, Értékesítés/POS, Készlet, Partnerek, Termékek, Árajánlatok, Szerződések, Számlák, Chat, Felhasználók, Riportok + 7 dashboard nézet.',
    testSummary: { total: 852, passed: 846, failed: 6, coverage: 87 },
    reviewSummary: { total: 94, fixed: 92, open: 2 },
    changes: [
      {
        category: 'new',
        title: 'Executive (Vezetői) Áttekintés',
        description:
          'Teljesen megújult vezetői dashboard valós idejű KPI-kkal és projekt státusszal.',
        details: [
          'KPI Kártyák: Összesített Epic, Story, befejezettség és haladás százalék',
          'Projekt Haladás Sáv: Vizuális progress bar a teljes projekt állapotáról',
          'Aktív Munkák: Folyamatban lévő epic-ek és story-k gyors áttekintése',
          'Teszt Összefoglaló: Pass rate, coverage, és teszt típusok eloszlása',
          'Review Összefoglaló: Javítási arány és severity eloszlás',
        ],
        tests: [
          {
            name: 'ExecutiveView renderelés',
            status: 'pass',
            duration: '0.5s',
            file: 'ExecutiveView.spec.ts',
          },
          {
            name: 'KPI számítások helyessége',
            status: 'pass',
            duration: '0.2s',
            file: 'stats.spec.ts',
          },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'major',
            title: 'Memória szivárgás useEffect-ben',
            description: 'A dashboard komponens nem tisztította a subscription-öket unmount-kor.',
            status: 'fixed',
            file: 'ExecutiveView.tsx',
            line: 34,
          },
        ],
      },
      {
        category: 'new',
        title: 'Developer (Fejlesztői) Nézet',
        description: 'Részletes fejlesztői áttekintés epic és story szintű haladáskövetéssel.',
        details: [
          'Áttekintés Tab: Epic és story státusz összefoglaló',
          'Epics Tab: Összes epic listázása állapotszűréssel és részletekkel',
          'Stories Tab: Story-k keresése, szűrése epic és státusz szerint',
          'Reviews Tab: Code review eredmények Claude és Gemini AI-tól',
          'Tests Tab: Teszt eredmények epic és package bontásban',
        ],
        tests: [
          {
            name: 'DeveloperView renderelés',
            status: 'pass',
            duration: '0.4s',
            file: 'DeveloperView.spec.ts',
          },
          { name: 'Tab váltás működése', status: 'pass', duration: '0.2s', file: 'tabs.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'QA (Minőségbiztosítási) Nézet',
        description: 'Átfogó minőségbiztosítási dashboard teszt és review metrikákkal.',
        details: [
          'Áttekintés Tab: Pass rate, coverage, és AI review összesítés',
          'Tests Tab: Részletes teszt eredmények epic és file szinten',
          'Reviews Tab: Dual-AI code review eredmények szűréssel',
          'Claude vs Gemini összehasonlítás: Talált hibák és egyedi észrevételek',
        ],
        tests: [
          {
            name: 'QAView renderelés',
            status: 'pass',
            duration: '0.4s',
            file: 'QAView.spec.ts',
          },
          { name: 'Szűrés működése', status: 'pass', duration: '0.3s', file: 'filters.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Statistics (Statisztikák) Nézet',
        description: 'Interaktív Recharts grafikonok a projekt minden aspektusáról.',
        details: [
          'Burndown Chart: Sprint haladás és maradék story-k időbeli alakulása',
          'Velocity Chart: Sprint-enkénti teljesítmény bar charttal',
          'Epic Státusz Pie Chart: DONE/IN_PROGRESS/TODO eloszlás',
          'Story Eloszlás: Epic-enkénti story-k stacked bar chart',
          'Timeline Gantt-szerű Nézet: Epic-ek időbeli ütemezése',
          'Teszt Metrikák: Pass/Fail arány, coverage trend, típus eloszlás',
          'Review Metrikák: Severity eloszlás, fix rate, AI összehasonlítás',
        ],
        tests: [
          {
            name: 'StatisticsView renderelés',
            status: 'pass',
            duration: '0.6s',
            file: 'StatisticsView.spec.ts',
          },
          {
            name: 'Chart adatok helyessége',
            status: 'pass',
            duration: '0.3s',
            file: 'charts.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Knowledge (Tudásbázis) Nézet',
        description: 'Központi dokumentáció és útmutatók a rendszer használatához.',
        details: [
          'Dokumentáció Kategóriák: API, Architektúra, Fejlesztői útmutatók',
          'Gyors Elérés: Legfontosabb dokumentumok kiemelve',
          'Keresés: Dokumentumok közötti gyors keresés',
        ],
        tests: [
          {
            name: 'KnowledgeView renderelés',
            status: 'pass',
            duration: '0.2s',
            file: 'KnowledgeView.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Downloads (Letöltések) Nézet',
        description: 'Riportok és adatok exportálása különböző formátumokban.',
        details: [
          'PDF Riportok: Vezetői összefoglaló, sprint riport generálás',
          'Excel Export: Részletes adatok táblázatos formátumban',
          'Ütemezett Riportok: Automatikus email küldés beállítása',
        ],
        tests: [
          {
            name: 'DownloadsView renderelés',
            status: 'pass',
            duration: '0.2s',
            file: 'DownloadsView.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Changelog (Újdonságok) Nézet',
        description: 'Verziókövetés és változásnapló felhasználóbarát megjelenítéssel.',
        details: [
          'Verzió Történet: Összes kiadás időrendben, szűrhető kategóriák',
          'Részletes Bejegyzések: Teszt és review eredmények minden változáshoz',
          'Összenyitás/Összecsukás: Könnyű navigáció nagy changelog-ban',
          'Severity Színkódolás: Kritikus/Fontos/Kisebb megkülönböztetése',
        ],
        tests: [
          {
            name: 'ChangelogView renderelés',
            status: 'pass',
            duration: '0.3s',
            file: 'ChangelogView.spec.ts',
          },
          {
            name: 'Szűrés és expand/collapse',
            status: 'pass',
            duration: '0.2s',
            file: 'ChangelogView.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Navigáció és Layout',
        description: 'Modern, reszponzív oldalsáv és fejléc a könnyű navigációhoz.',
        details: [
          'Oldalsáv (Sidebar): Összecsukható navigáció MyForgeOS brandinggel',
          'Nézetkategóriák: NÉZETEK (Executive, Developer, QA, Statistics) és SEGÉDLETEK (Knowledge, Downloads, Changelog)',
          'Sötét/Világos Mód: Egy kattintásos témaváltás',
          'Mobil Támogatás: Reszponzív drawer navigáció kisebb képernyőkön',
          'AI Mystic Színpaletta: Egységes lila-cián-zöld gradiens design',
        ],
        tests: [
          { name: 'Sidebar renderelés', status: 'pass', duration: '0.2s', file: 'Sidebar.spec.ts' },
          { name: 'Nézet váltás', status: 'pass', duration: '0.3s', file: 'navigation.spec.ts' },
          { name: 'Téma váltás', status: 'pass', duration: '0.1s', file: 'theme.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Munkalap Kezelés',
        description: 'Fejlett munkalap rendszer állapotkövetéssel, Makita normaidő támogatással.',
        details: [
          'Munkalap létrehozás és szerkesztés teljes workflow',
          'Állapot átmenetek: Felvétel → Diagnosztika → Javítás → Átadás',
          'Makita normaidő adatbázis integrálva',
          'Alkatrész és munkaóra kalkuláció automatikus',
        ],
        tests: [
          {
            name: 'Munkalap state machine átmenetek',
            status: 'pass',
            duration: '0.4s',
            file: 'worksheet-state.spec.ts',
          },
          { name: 'Normaidő lekérdezés', status: 'pass', duration: '0.2s', file: 'norma.spec.ts' },
          {
            name: 'Kalkuláció pontossága',
            status: 'pass',
            duration: '0.3s',
            file: 'calculation.spec.ts',
          },
          {
            name: 'Validáció üres mezőkre',
            status: 'fail',
            duration: '0.1s',
            file: 'worksheet.spec.ts',
          },
        ],
        reviews: [
          {
            reviewer: 'Gemini',
            severity: 'critical',
            title: 'State machine bypass lehetőség',
            description: 'Közvetlen API hívással ki lehetett hagyni állapotokat.',
            status: 'fixed',
            file: 'worksheet.service.ts',
            line: 156,
          },
          {
            reviewer: 'Claude',
            severity: 'minor',
            title: 'Hiányzó audit log',
            description: 'Állapot változásoknál nem készült audit bejegyzés.',
            status: 'open',
            file: 'worksheet.service.ts',
            line: 178,
          },
        ],
      },
      {
        category: 'new',
        title: 'Bérlési Rendszer',
        description: 'Új bérgép kiadás és kaució kezelés MyPOS integrációval.',
        details: [
          'Bérgép foglalás és kiadás folyamat',
          'Kaució kezelés MyPOS terminálon keresztül',
          'Hosszú távú bérleti szerződések támogatása',
          'Késedelmi díj automatikus számítása',
        ],
        tests: [
          {
            name: 'Késedelmi díj kalkuláció',
            status: 'pass',
            duration: '0.2s',
            file: 'late-fee.spec.ts',
          },
          {
            name: 'MyPOS integráció mock',
            status: 'pass',
            duration: '0.5s',
            file: 'mypos.spec.ts',
          },
          {
            name: 'Szerződés generálás',
            status: 'fail',
            duration: '0.3s',
            file: 'contract.spec.ts',
          },
        ],
        reviews: [
          {
            reviewer: 'Claude',
            severity: 'major',
            title: 'Pénzügyi számítás pontosság',
            description: 'Float használata Decimal helyett a díjszámításnál.',
            status: 'fixed',
            file: 'rental-fee.service.ts',
            line: 67,
          },
        ],
      },
      {
        category: 'new',
        title: 'NAV Online Számla',
        description: 'Automatikus NAV Online számlázás Számlázz.hu API-n keresztül.',
        details: [
          'Számla készítés és beküldés egyetlen lépésben',
          'NAV Online validáció beküldés előtt',
          'Hibás számla újraküldés támogatás',
          'Számla állapot követés (befogadva, feldolgozás alatt, elfogadva)',
        ],
      },
      {
        category: 'new',
        title: 'Értékesítés & POS Terminal',
        description: 'Teljes értékesítési modul kasszaterminállal és tranzakció kezeléssel.',
        details: [
          'SalesListPage: Összes értékesítés listázása, szűrés, keresés',
          'SalesPOSPage: Érintőképernyős kasszaterminál felület',
          'Vonalkód olvasó integráció termék azonosításhoz',
          'Kosár kezelés, kedvezmények, fizetési módok',
          'Napi zárás és kasszajelentés generálás',
        ],
        tests: [
          { name: 'POS kosár műveletek', status: 'pass', duration: '0.3s', file: 'pos.spec.ts' },
          { name: 'Fizetési folyamat', status: 'pass', duration: '0.4s', file: 'payment.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Készletkezelés (Inventory)',
        description: 'Átfogó készletnyilvántartás mozgáskövetéssel és árubevéttel.',
        details: [
          'InventoryListPage: Készlet áttekintés raktáranként',
          'InventoryDetailPage: Részletes készletinformációk és előzmények',
          'InventoryMovementsPage: Készletmozgások (be, ki, átvezetés)',
          'InventoryReceivePage: Árubevételi workflow beszállítói rendelésből',
          'Minimális készlet figyelmeztetés automatikusan',
        ],
        tests: [
          {
            name: 'Készletmozgás rögzítés',
            status: 'pass',
            duration: '0.2s',
            file: 'inventory.spec.ts',
          },
          {
            name: 'Készletszint számítás',
            status: 'pass',
            duration: '0.1s',
            file: 'stock.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Partner Kezelés',
        description: 'Ügyfelek és beszállítók központi nyilvántartása.',
        details: [
          'PartnerListPage: Partner lista kereséssel és szűréssel',
          'PartnerDetailPage: Partner részletek, kapcsolattartók, előzmények',
          'PartnerCreatePage: Új partner felvétel validációval',
          'Ügyfél/Beszállító típus megkülönböztetés',
          'Adószám és cégjegyzékszám validálás',
        ],
        tests: [
          { name: 'Partner létrehozás', status: 'pass', duration: '0.2s', file: 'partner.spec.ts' },
          { name: 'Adószám validáció', status: 'pass', duration: '0.1s', file: 'tax-id.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Termékkezelés',
        description: 'Termék törzsadat kezelés teljes CRUD műveletekkel.',
        details: [
          'ProductListPage: Termék katalógus kategória szűréssel',
          'ProductDetailPage: Termék részletek, árak, képek, készletinfo',
          'ProductCreatePage: Új termék felvétel kategória besorolással',
          'ProductEditPage: Termék módosítás verziókövetéssel',
          'Vonalkód generálás és nyomtatás',
        ],
        tests: [
          {
            name: 'Termék CRUD műveletek',
            status: 'pass',
            duration: '0.3s',
            file: 'product.spec.ts',
          },
          { name: 'Vonalkód generálás', status: 'pass', duration: '0.1s', file: 'barcode.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Árajánlat Kezelés',
        description: 'Árajánlatok készítése és konverzió követés.',
        details: [
          'QuotationListPage: Árajánlat lista státusz szűréssel',
          'QuotationDetailPage: Árajánlat részletek, tételek, kalkuláció',
          'PDF export és email küldés közvetlenül',
          'Konverzió rendeléssé egyetlen kattintással',
          'Érvényességi idő és emlékeztető kezelés',
        ],
        tests: [
          {
            name: 'Árajánlat kalkuláció',
            status: 'pass',
            duration: '0.2s',
            file: 'quotation.spec.ts',
          },
          { name: 'PDF generálás', status: 'pass', duration: '0.5s', file: 'pdf.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Szerződés Kezelés',
        description: 'Bérleti és szolgáltatási szerződések nyilvántartása.',
        details: [
          'ContractListPage: Szerződések listája lejárat szerint rendezve',
          'ContractDetailPage: Szerződés részletek, feltételek, módosítások',
          'Automatikus lejárat figyelmeztetés',
          'Szerződés sablon kezelés',
        ],
        tests: [
          {
            name: 'Szerződés státusz kezelés',
            status: 'pass',
            duration: '0.2s',
            file: 'contract.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Számla Nyilvántartás',
        description: 'Kimenő és bejövő számlák központi kezelése.',
        details: [
          'InvoiceListPage: Számla lista típus és státusz szűréssel',
          'InvoiceDetailPage: Számla részletek, tételek, fizetési állapot',
          'NAV Online státusz megjelenítés',
          'Fizetési határidő figyelés és emlékeztetők',
        ],
        tests: [
          { name: 'Számla renderelés', status: 'pass', duration: '0.2s', file: 'invoice.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Felhasználók & Jogosultságok',
        description: 'Felhasználó kezelés RBAC jogosultság rendszerrel.',
        details: [
          'UserListPage: Felhasználók listája aktív/inaktív szűréssel',
          'UserDetailPage: Felhasználó részletek és bejelentkezési előzmények',
          'RoleManagementPage: Szerepkörök és jogosultságok kezelése',
          'Szerepkör alapú menü és funkció korlátozás',
          'Multi-tenant felhasználó hozzárendelés',
        ],
        tests: [
          {
            name: 'RBAC jogosultság ellenőrzés',
            status: 'pass',
            duration: '0.3s',
            file: 'rbac.spec.ts',
          },
          { name: 'Szerepkör módosítás', status: 'pass', duration: '0.2s', file: 'role.spec.ts' },
        ],
      },
      {
        category: 'new',
        title: 'Belső Chat',
        description: 'Valós idejű belső kommunikációs felület a dolgozók között.',
        details: [
          'ChatPage: Üzenetváltás kollégákkal valós időben',
          'Csoportos beszélgetések és csatornák',
          'Fájl megosztás és képek küldése',
          'Online/offline státusz megjelenítés',
          'Push értesítések új üzenetekről',
        ],
        tests: [
          { name: 'WebSocket kapcsolat', status: 'pass', duration: '0.4s', file: 'chat.spec.ts' },
          {
            name: 'Üzenet küldés/fogadás',
            status: 'pass',
            duration: '0.2s',
            file: 'message.spec.ts',
          },
        ],
      },
      {
        category: 'new',
        title: 'Riportok & Beállítások',
        description: 'Üzleti riportok és rendszerbeállítások kezelése.',
        details: [
          'ReportsPage: Üzleti riportok generálása (napi, heti, havi)',
          'SettingsPage: Általános rendszerbeállítások',
          'TenantSettingsPage: Tenant specifikus konfigurációk',
          'FeatureFlagsPage: Funkció kapcsolók kezelése (dev/admin)',
          'TasksPage: Háttérfeladatok és ütemezett műveletek',
        ],
        tests: [
          { name: 'Riport generálás', status: 'pass', duration: '0.6s', file: 'reports.spec.ts' },
          { name: 'Beállítás mentés', status: 'pass', duration: '0.1s', file: 'settings.spec.ts' },
        ],
      },
      {
        category: 'improved',
        title: 'Felhasználói Felület',
        description: 'Modern, reszponzív dizájn amely mobilon és asztali gépen is jól működik.',
        details: [
          'Sötét és világos téma támogatás',
          'Összecsukható oldalsáv nagyobb munkaterületért',
          'Mobil-barát navigáció és gombok',
          'Akadálymentesség (WCAG 2.1 AA szint)',
        ],
      },
    ],
  },
];

const CATEGORY_CONFIG: Record<
  ChangeCategory,
  { icon: string; label: string; color: string; bgColor: string }
> = {
  new: {
    icon: '✨',
    label: 'Új funkció',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/30',
  },
  improved: {
    icon: '⚡',
    label: 'Fejlesztés',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-300 dark:border-cyan-500/30',
  },
  fixed: {
    icon: '🔧',
    label: 'Javítás',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/30',
  },
};

const TYPE_CONFIG: Record<ReleaseType, { label: string; color: string; bgColor: string }> = {
  major: {
    label: 'Főverzió',
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
  },
  minor: {
    label: 'Funkció frissítés',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-300 dark:border-cyan-500/30',
  },
  patch: {
    label: 'Hibajavítás',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted border-border',
  },
};

export function ChangelogView() {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set([RELEASES[0]?.version ?? ''])
  );
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ChangeCategory | 'all'>('all');

  const filteredReleases = RELEASES.map(release => ({
    ...release,
    changes:
      filter === 'all' ? release.changes : release.changes.filter(c => c.category === filter),
  })).filter(release => release.changes.length > 0);

  // Calculate all possible change IDs for current filter
  const allChangeIds = filteredReleases.flatMap(release =>
    release.changes.map((_, ci) => `${release.version}-${ci}`)
  );

  const allVersions = filteredReleases.map(r => r.version);
  const allVersionsExpanded = allVersions.every(v => expandedVersions.has(v));
  const allChangesExpanded =
    allChangeIds.length > 0 && allChangeIds.every(id => expandedChanges.has(id));

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const toggleChange = (changeId: string) => {
    setExpandedChanges(prev => {
      const next = new Set(prev);
      if (next.has(changeId)) {
        next.delete(changeId);
      } else {
        next.add(changeId);
      }
      return next;
    });
  };

  const expandAllVersions = () => {
    setExpandedVersions(new Set(allVersions));
  };

  const collapseAllVersions = () => {
    setExpandedVersions(new Set());
    setExpandedChanges(new Set());
  };

  const expandAllChanges = () => {
    setExpandedVersions(new Set(allVersions));
    setExpandedChanges(new Set(allChangeIds));
  };

  const collapseAllChanges = () => {
    setExpandedChanges(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-foreground via-primary to-accent">
          Változások és Újdonságok
        </h1>
        <p className="text-muted-foreground">
          Kövesse nyomon a rendszer fejlesztéseit és új funkcióit
        </p>
      </div>

      {/* Filter & Expand/Collapse controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <span className="text-sm text-muted-foreground mr-2">Szűrés:</span>
          {[
            { id: 'all' as const, label: 'Minden', icon: '📋' },
            { id: 'new' as const, label: 'Új funkciók', icon: '✨' },
            { id: 'improved' as const, label: 'Fejlesztések', icon: '⚡' },
            { id: 'fixed' as const, label: 'Javítások', icon: '🔧' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                filter === item.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted/50 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Expand/Collapse buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={allVersionsExpanded ? collapseAllVersions : expandAllVersions}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 bg-muted/50 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
            title={allVersionsExpanded ? 'Összes verzió összecsukása' : 'Összes verzió kinyitása'}
          >
            <span>{allVersionsExpanded ? '▲' : '▼'}</span>
            Verziók
          </button>
          <button
            onClick={allChangesExpanded ? collapseAllChanges : expandAllChanges}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 bg-muted/50 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
            title={allChangesExpanded ? 'Összes részlet összecsukása' : 'Összes részlet kinyitása'}
          >
            <span>{allChangesExpanded ? '▲▲' : '▼▼'}</span>
            Részletek
          </button>
        </div>
      </div>

      {/* Releases */}
      <div className="space-y-4">
        {filteredReleases.map(release => (
          <ReleaseCard
            key={release.version}
            release={release}
            isExpanded={expandedVersions.has(release.version)}
            onToggle={() => toggleVersion(release.version)}
            expandedChanges={expandedChanges}
            toggleChange={toggleChange}
          />
        ))}
      </div>

      {/* Subscribe CTA */}
      <div className="glass-card p-6 text-center">
        <span className="text-3xl mb-3 block">📬</span>
        <h3 className="text-lg font-semibold text-foreground mb-2">Értesüljön az újdonságokról!</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Iratkozzon fel hírlevelünkre és elsőként értesüljön az új funkciókról és fejlesztésekről.
        </p>
        <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-purple-500 text-white font-medium hover:shadow-lg hover:shadow-primary/30 transition-all">
          Feliratkozás
        </button>
      </div>
    </div>
  );
}

function ReleaseCard({
  release,
  isExpanded,
  onToggle,
  expandedChanges,
  toggleChange,
}: {
  release: Release;
  isExpanded: boolean;
  onToggle: () => void;
  expandedChanges: Set<string>;
  toggleChange: (id: string) => void;
}) {
  const typeConfig = TYPE_CONFIG[release.type];
  const isUpcoming = release.date === 'Hamarosan';

  return (
    <div
      className={cn(
        'glass-card overflow-hidden transition-all',
        isUpcoming && 'border-dashed opacity-90'
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 md:p-5 text-left hover:bg-primary/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* Version badge */}
          <div
            className={cn(
              'px-3 py-1 rounded-lg text-sm font-bold border w-fit',
              typeConfig.bgColor,
              typeConfig.color
            )}
          >
            v{release.version}
          </div>

          {/* Type & Date */}
          <div className="flex items-center gap-3">
            <span className={cn('text-xs px-2 py-1 rounded border', typeConfig.bgColor)}>
              {typeConfig.label}
            </span>
            <span
              className={cn(
                'text-sm',
                isUpcoming ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              {isUpcoming && '🚀 '}
              {release.date}
            </span>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
            {release.testSummary && (
              <span
                className={cn(
                  release.testSummary.failed > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                🧪 {release.testSummary.passed}/{release.testSummary.total}
              </span>
            )}
            {release.reviewSummary && (
              <span
                className={cn(
                  release.reviewSummary.open > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                🔍 {release.reviewSummary.fixed}/{release.reviewSummary.total}
              </span>
            )}
            <span className="text-muted-foreground">{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mt-3">{release.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{release.summary}</p>
      </button>

      {/* Expanded content - Level 1 */}
      {isExpanded && (
        <div className="border-t border-border dark:border-white/10">
          {/* Test & Review Summary */}
          {(release.testSummary || release.reviewSummary) && (
            <div className="p-4 md:p-5 bg-muted/30 dark:bg-white/[0.02] border-b border-border dark:border-white/10">
              <div className="grid md:grid-cols-2 gap-4">
                {release.testSummary && (
                  <div className="p-3 rounded-lg bg-card/50 dark:bg-white/5 border border-border/50">
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      🧪 Teszt Összefoglaló
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {release.testSummary.passed}
                        </span>{' '}
                        sikeres
                        {release.testSummary.failed > 0 && (
                          <>
                            ,{' '}
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {release.testSummary.failed}
                            </span>{' '}
                            sikertelen
                          </>
                        )}{' '}
                        / {release.testSummary.total} teszt
                      </p>
                      {release.testSummary.coverage && (
                        <p>
                          Kód lefedettség:{' '}
                          <span className="font-medium text-foreground">
                            {release.testSummary.coverage}%
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {release.reviewSummary && (
                  <div className="p-3 rounded-lg bg-card/50 dark:bg-white/5 border border-border/50">
                    <h4 className="text-sm font-medium text-foreground mb-2">
                      🔍 Code Review Összefoglaló
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {release.reviewSummary.fixed}
                        </span>{' '}
                        javítva
                        {release.reviewSummary.open > 0 && (
                          <>
                            ,{' '}
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {release.reviewSummary.open}
                            </span>{' '}
                            nyitott
                          </>
                        )}{' '}
                        / {release.reviewSummary.total} észrevétel
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Changes list */}
          <div className="p-4 md:p-5 space-y-3">
            {release.changes.map((change, index) => {
              const changeId = `${release.version}-${index}`;
              const isChangeExpanded = expandedChanges.has(changeId);
              const config = CATEGORY_CONFIG[change.category];

              return (
                <div key={index} className="rounded-lg border border-border/50 overflow-hidden">
                  {/* Change header - Level 2 toggle */}
                  <button
                    onClick={() => toggleChange(changeId)}
                    className="w-full p-3 text-left bg-card/50 dark:bg-white/5 hover:bg-muted/50 dark:hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border',
                          config.bgColor
                        )}
                      >
                        <span className="text-base">{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground">{change.title}</h4>
                          <span className={cn('text-xs', config.color)}>{config.label}</span>
                          {(change.tests?.length ||
                            change.reviews?.length ||
                            change.details?.length) && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {isChangeExpanded ? '▼' : '▶'} Részletek
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{change.description}</p>
                      </div>
                    </div>
                  </button>

                  {/* Change details - Level 2 expanded */}
                  {isChangeExpanded &&
                    (change.details?.length || change.tests?.length || change.reviews?.length) && (
                      <div className="border-t border-border/50 p-3 space-y-4 bg-muted/20 dark:bg-white/[0.01]">
                        {/* Details list */}
                        {change.details && change.details.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                              Részletek
                            </h5>
                            <ul className="space-y-1.5">
                              {change.details.map((detail, i) => (
                                <li
                                  key={i}
                                  className="text-sm text-foreground/80 flex items-start gap-2"
                                >
                                  <span className="text-primary mt-0.5">•</span>
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Tests */}
                        {change.tests && change.tests.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                              🧪 Kapcsolódó Tesztek ({change.tests.length})
                            </h5>
                            <div className="space-y-1.5">
                              {change.tests.map((test, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    'text-sm p-2 rounded-lg border',
                                    test.status === 'pass'
                                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                                      : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{test.status === 'pass' ? '✓' : '✗'}</span>
                                    <span
                                      className={cn(
                                        'font-medium',
                                        test.status === 'pass'
                                          ? 'text-emerald-700 dark:text-emerald-400'
                                          : 'text-red-700 dark:text-red-400'
                                      )}
                                    >
                                      {test.name}
                                    </span>
                                    {test.duration && (
                                      <span className="text-xs text-muted-foreground ml-auto">
                                        {test.duration}
                                      </span>
                                    )}
                                  </div>
                                  {test.file && (
                                    <div className="text-xs text-muted-foreground mt-1 pl-5">
                                      📄 {test.file}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reviews */}
                        {change.reviews && change.reviews.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                              🔍 Code Review Észrevételek ({change.reviews.length})
                            </h5>
                            <div className="space-y-2">
                              {change.reviews.map((review, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    'text-sm p-3 rounded-lg border',
                                    review.status === 'fixed'
                                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                                      : review.status === 'open'
                                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                                        : 'bg-muted/50 border-border'
                                  )}
                                >
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span
                                      className={cn(
                                        'text-xs font-medium px-2 py-0.5 rounded',
                                        review.severity === 'critical'
                                          ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                          : review.severity === 'major'
                                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                      )}
                                    >
                                      {review.severity === 'critical'
                                        ? 'Kritikus'
                                        : review.severity === 'major'
                                          ? 'Fontos'
                                          : 'Kisebb'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {review.reviewer}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-xs ml-auto',
                                        review.status === 'fixed'
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : review.status === 'open'
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-muted-foreground'
                                      )}
                                    >
                                      {review.status === 'fixed'
                                        ? '✓ Javítva'
                                        : review.status === 'open'
                                          ? '○ Nyitott'
                                          : '— Elutasítva'}
                                    </span>
                                  </div>
                                  <p className="font-medium text-foreground">{review.title}</p>
                                  <p className="text-muted-foreground mt-1">{review.description}</p>
                                  {review.file && (
                                    <div className="text-xs text-muted-foreground mt-2">
                                      📄 {review.file}
                                      {review.line && `:${review.line}`}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
