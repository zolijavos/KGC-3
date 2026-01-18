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
      'Az új KGC ERP rendszer teljes újratervezéssel érkezik, modern felülettel és új funkciókkal.',
    testSummary: { total: 324, passed: 318, failed: 6, coverage: 85 },
    reviewSummary: { total: 47, fixed: 45, open: 2 },
    changes: [
      {
        category: 'new',
        title: 'Új Dashboard',
        description: 'Teljesen megújult vezetői dashboard valós idejű statisztikákkal.',
        details: [
          'Executive nézet: KPI-k és projekt státusz egy helyen',
          'Developer nézet: Epic és story részletek, haladás követés',
          'QA nézet: Teszt metrikák és code review eredmények',
          'Statisztikák: Részletes analitika és trendek',
        ],
        tests: [
          {
            name: 'Dashboard renderelés',
            status: 'pass',
            duration: '0.5s',
            file: 'dashboard.spec.ts',
          },
          {
            name: 'KPI számítások helyessége',
            status: 'pass',
            duration: '0.2s',
            file: 'stats.spec.ts',
          },
          { name: 'Nézet váltás', status: 'pass', duration: '0.3s', file: 'navigation.spec.ts' },
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
