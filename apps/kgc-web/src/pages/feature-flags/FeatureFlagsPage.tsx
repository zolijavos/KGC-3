import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { FLAG_CATEGORIES, MOCK_FEATURE_FLAGS } from './mock-data';
import type { FeatureFlag, FeatureFlagCategory } from './types';

export function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(MOCK_FEATURE_FLAGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeatureFlagCategory | 'all'>('all');

  const filteredFlags = flags.filter(flag => {
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        flag.name.toLowerCase().includes(search) ||
        flag.description.toLowerCase().includes(search) ||
        flag.key.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && flag.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const groupedFlags = FLAG_CATEGORIES.map(category => ({
    ...category,
    flags: filteredFlags.filter(f => f.category === category.value),
  })).filter(group => group.flags.length > 0);

  const stats = {
    total: flags.length,
    enabled: flags.filter(f => f.enabled).length,
    disabled: flags.filter(f => !f.enabled).length,
    beta: flags.filter(f => f.isBeta).length,
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  const handleToggleFlag = (flagId: string) => {
    setFlags(prev =>
      prev.map(f =>
        f.id === flagId
          ? {
              ...f,
              enabled: !f.enabled,
              updatedAt: new Date().toISOString(),
              updatedBy: 'current_user',
            }
          : f
      )
    );
  };

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Feature Flags</h1>
              <p className="text-gray-500 dark:text-gray-400">Funkciók be- és kikapcsolása</p>
            </div>
            <Button variant="outline">Változások mentése</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Összes flag</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-green-600 dark:text-green-300">Bekapcsolva</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-200">
                  {stats.enabled}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Kikapcsolva</p>
                <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                  {stats.disabled}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-pink-600 dark:text-pink-300">Beta</p>
                <p className="text-3xl font-bold text-pink-700 dark:text-pink-200">{stats.beta}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  type="search"
                  placeholder="Keresés (név, leírás, kulcs)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-kgc-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
                  }`}
                >
                  Mind
                </button>
                {FLAG_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedCategory === cat.value
                        ? cat.color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grouped Flags */}
        <div className="space-y-6">
          {groupedFlags.map(group => (
            <Card key={group.value}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-sm text-gray-600 dark:bg-slate-700 dark:text-gray-300">
                    {group.flags.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y dark:divide-slate-700">
                  {group.flags.map(flag => {
                    const hasDependency = flag.dependencies?.some(dep => {
                      const depFlag = flags.find(f => f.key === dep);
                      return depFlag && !depFlag.enabled;
                    });

                    return (
                      <div
                        key={flag.id}
                        className={`flex items-center justify-between p-4 ${
                          hasDependency ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {flag.name}
                            </h3>
                            {flag.isNew && (
                              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                ÚJ
                              </span>
                            )}
                            {flag.isBeta && (
                              <span className="rounded bg-pink-100 px-1.5 py-0.5 text-xs font-medium text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                                BETA
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {flag.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                              {flag.key}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Frissítve: {formatDate(flag.updatedAt)}
                              {flag.updatedBy && ` (${flag.updatedBy})`}
                            </span>
                            {flag.dependencies && flag.dependencies.length > 0 && (
                              <span className="text-xs text-orange-500 dark:text-orange-400">
                                Függ: {flag.dependencies.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => handleToggleFlag(flag.id)}
                            disabled={hasDependency}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              flag.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                            } ${hasDependency ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            title={hasDependency ? 'Függőség nincs bekapcsolva' : undefined}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                flag.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {groupedFlags.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Nincs találat a megadott szűrőkkel
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Feature Flags használata
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  A feature flags-ek lehetővé teszik funkciók be- és kikapcsolását az alkalmazásban.
                  Néhány flag függhet másik flag-től - ezek csak akkor kapcsolhatók be, ha a
                  függőség aktív. A BETA jelölésű funkciók még tesztelés alatt állnak.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
