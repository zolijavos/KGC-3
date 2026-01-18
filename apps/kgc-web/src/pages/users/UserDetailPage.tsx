import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MOCK_PERMISSIONS,
  MOCK_ROLES,
  MOCK_TENANTS,
  MOCK_USERS,
  PERMISSION_MODULES,
  USER_STATUSES,
} from './mock-data';
import type { UserStatus } from './types';

type TabType = 'overview' | 'permissions' | 'security' | 'activity';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);

  const user = MOCK_USERS.find(u => u.id === id);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Felhasználó nem található</h1>
          <Button onClick={() => navigate('/users')} className="mt-4">
            Vissza a listához
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('hu-HU');
  };

  const getStatusBadge = (status: UserStatus) => {
    const config = USER_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  // Get user's permissions through roles
  const userPermissionIds = new Set<string>();
  user.roles.forEach(roleId => {
    const role = MOCK_ROLES.find(r => r.id === roleId);
    role?.permissions.forEach(pId => userPermissionIds.add(pId));
  });

  const userPermissions = MOCK_PERMISSIONS.filter(p => userPermissionIds.has(p.id));

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Áttekintés' },
    { id: 'permissions', label: 'Jogosultságok' },
    { id: 'security', label: 'Biztonság' },
    { id: 'activity', label: 'Tevékenység' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/users')}>
                ← Vissza
              </Button>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kgc-primary/10 text-lg font-medium text-kgc-primary">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{user.fullName}</h1>
                  {getStatusBadge(user.status)}
                </div>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Mégse
                  </Button>
                  <Button
                    className="bg-kgc-primary hover:bg-kgc-primary/90"
                    onClick={() => setIsEditing(false)}
                  >
                    Mentés
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Szerkesztés
                  </Button>
                  {user.status === 'active' && (
                    <Button variant="outline" className="text-red-600 hover:bg-red-50">
                      Felfüggesztés
                    </Button>
                  )}
                  {user.status === 'suspended' && (
                    <Button variant="outline" className="text-green-600 hover:bg-green-50">
                      Aktiválás
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-kgc-primary text-kgc-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic info */}
              <Card>
                <CardHeader>
                  <CardTitle>Alapadatok</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Vezetéknév</label>
                        <Input defaultValue={user.lastName} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Keresztnév</label>
                        <Input defaultValue={user.firstName} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Email</label>
                        <Input type="email" defaultValue={user.email} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Telefon</label>
                        <Input defaultValue={user.phone ?? ''} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Felhasználónév</label>
                        <Input defaultValue={user.username} />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Üzlet</label>
                        <select
                          defaultValue={user.tenantId}
                          className="w-full rounded-md border px-3 py-2"
                        >
                          {MOCK_TENANTS.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Teljes név</label>
                        <p className="text-gray-900">{user.fullName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Felhasználónév</label>
                        <p className="text-gray-900">{user.username}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">
                          <a
                            href={`mailto:${user.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {user.email}
                          </a>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Telefon</label>
                        <p className="text-gray-900">
                          {user.phone ? (
                            <a href={`tel:${user.phone}`} className="text-blue-600 hover:underline">
                              {user.phone}
                            </a>
                          ) : (
                            '-'
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Üzlet</label>
                        <p className="text-gray-900">{user.tenantName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Létrehozva</label>
                        <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Roles */}
              <Card>
                <CardHeader>
                  <CardTitle>Szerepkörök</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.roles.map(roleId => {
                      const role = MOCK_ROLES.find(r => r.id === roleId);
                      if (!role) return null;
                      return (
                        <div
                          key={roleId}
                          className={`flex items-center justify-between rounded-lg border p-4 ${
                            roleId === user.primaryRole ? 'border-kgc-primary bg-kgc-primary/5' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{role.name}</p>
                              {roleId === user.primaryRole && (
                                <span className="rounded bg-kgc-primary/20 px-2 py-0.5 text-xs font-medium text-kgc-primary">
                                  Elsődleges
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{role.description}</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            {role.permissions.length} jogosultság
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {isEditing && (
                    <Button variant="outline" className="mt-4">
                      + Szerepkör hozzáadása
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Beállítások</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Téma:</span>
                      <span className="font-medium capitalize">{user.preferences.theme}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Értesítések:</span>
                      <span className="font-medium">
                        {user.preferences.notifications ? '✅ Bekapcsolva' : '❌ Kikapcsolva'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email értesítések:</span>
                      <span className="font-medium">
                        {user.preferences.emailNotifications ? '✅ Bekapcsolva' : '❌ Kikapcsolva'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nyelv:</span>
                      <span className="font-medium">{user.locale}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Időzóna:</span>
                      <span className="font-medium">{user.timezone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Biztonság</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">PIN kód:</span>
                      <span
                        className={`font-medium ${user.hasPinCode ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        {user.hasPinCode ? '✅ Beállítva' : '❌ Nincs'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Utolsó belépés:</span>
                      <span className="font-medium text-sm">{formatDate(user.lastLoginAt)}</span>
                    </div>
                    {user.lastLoginIp && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">IP cím:</span>
                        <span className="font-medium text-sm">{user.lastLoginIp}</span>
                      </div>
                    )}
                    {user.failedLoginAttempts > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sikertelen belépések:</span>
                        <span className="font-medium text-red-600">{user.failedLoginAttempts}</span>
                      </div>
                    )}
                    {user.lockedUntil && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-3">
                        <p className="text-sm font-medium text-red-600">
                          Fiók zárolva: {formatDate(user.lockedUntil)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <Card>
            <CardHeader>
              <CardTitle>Jogosultságok ({userPermissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {PERMISSION_MODULES.map(module => {
                  const modulePermissions = userPermissions.filter(p => p.module === module.value);
                  if (modulePermissions.length === 0) return null;

                  return (
                    <div key={module.value}>
                      <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                        <span>{module.icon}</span>
                        {module.label}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {modulePermissions.map(permission => (
                          <div key={permission.id} className="rounded-lg border bg-green-50 p-3">
                            <p className="font-medium text-green-800">{permission.name}</p>
                            <p className="text-sm text-green-600">{permission.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Jelszó kezelés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Jelszó visszaállítása</p>
                    <p className="text-sm text-gray-500">Email küldése új jelszó beállításához</p>
                  </div>
                  <Button variant="outline">Jelszó reset email küldése</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PIN kód</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Kiosk mód PIN kód</p>
                    <p className="text-sm text-gray-500">
                      {user.hasPinCode
                        ? 'PIN kód beállítva a gyors belépéshez'
                        : 'Nincs PIN kód beállítva'}
                    </p>
                  </div>
                  <Button variant="outline">
                    {user.hasPinCode ? 'PIN kód törlése' : 'PIN kód beállítása'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Munkamenetek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Összes munkamenet kijelentkeztetése</p>
                    <p className="text-sm text-gray-500">
                      A felhasználó minden aktív munkamenetét lezárja
                    </p>
                  </div>
                  <Button variant="outline" className="text-red-600 hover:bg-red-50">
                    Összes kijelentkeztetése
                  </Button>
                </div>
              </CardContent>
            </Card>

            {user.failedLoginAttempts > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Fiók feloldása</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-600">
                        {user.failedLoginAttempts} sikertelen bejelentkezési kísérlet
                      </p>
                      <p className="text-sm text-gray-500">
                        {user.lockedUntil
                          ? `Zárolva: ${formatDate(user.lockedUntil)}`
                          : 'A fiók nincs zárolva'}
                      </p>
                    </div>
                    <Button variant="outline" className="text-green-600 hover:bg-green-50">
                      Számláló nullázása
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <Card>
            <CardHeader>
              <CardTitle>Tevékenység napló</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {user.lastLoginAt && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">{formatDate(user.lastLoginAt)}</p>
                    <p className="font-medium">Bejelentkezés</p>
                    <p className="text-sm text-gray-500">IP: {user.lastLoginIp ?? 'Ismeretlen'}</p>
                  </div>
                )}
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">{formatDate(user.updatedAt)}</p>
                  <p className="font-medium">Profil frissítve</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">{formatDate(user.createdAt)}</p>
                  <p className="font-medium">Felhasználó létrehozva</p>
                  {user.createdBy && (
                    <p className="text-sm text-gray-500">Létrehozta: {user.createdBy}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
