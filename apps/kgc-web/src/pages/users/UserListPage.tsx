import { Button, Card, CardContent, Input } from '@/components/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_ROLES, MOCK_TENANTS, MOCK_USERS, USER_STATUSES } from './mock-data';
import type { UserStatus } from './types';

export function UserListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    return MOCK_USERS.filter(user => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          user.fullName.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.username.toLowerCase().includes(search) ||
          (user.phone?.includes(search) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;

      // Role filter
      if (roleFilter !== 'all' && !user.roles.includes(roleFilter)) return false;

      // Tenant filter
      if (tenantFilter !== 'all' && user.tenantId !== tenantFilter) return false;

      return true;
    });
  }, [searchTerm, statusFilter, roleFilter, tenantFilter]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: UserStatus) => {
    const config = USER_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const getRoleBadges = (roleIds: string[]) => {
    return roleIds.map(roleId => {
      const role = MOCK_ROLES.find(r => r.id === roleId);
      return (
        <span
          key={roleId}
          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
        >
          {role?.name ?? roleId}
        </span>
      );
    });
  };

  // Stats
  const stats = {
    total: MOCK_USERS.length,
    active: MOCK_USERS.filter(u => u.status === 'active').length,
    inactive: MOCK_USERS.filter(u => u.status === 'inactive').length,
    suspended: MOCK_USERS.filter(u => u.status === 'suspended').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Felhasználók</h1>
              <p className="text-sm text-gray-500">Felhasználók és jogosultságok kezelése</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/users/roles')}>
              Szerepkörök
            </Button>
            <Button
              onClick={() => navigate('/users/new')}
              className="bg-kgc-primary hover:bg-kgc-primary/90"
            >
              + Új felhasználó
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Összes felhasználó</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-gray-500">Aktív</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              <p className="text-sm text-gray-500">Inaktív</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
              <p className="text-sm text-gray-500">Felfüggesztve</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[250px] flex-1">
                <Input
                  placeholder="Keresés név, email, felhasználónév..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as UserStatus | 'all')}
                className="rounded-md border px-3 py-2"
              >
                <option value="all">Minden státusz</option>
                {USER_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="rounded-md border px-3 py-2"
              >
                <option value="all">Minden szerepkör</option>
                {MOCK_ROLES.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                value={tenantFilter}
                onChange={e => setTenantFilter(e.target.value)}
                className="rounded-md border px-3 py-2"
              >
                <option value="all">Minden üzlet</option>
                {MOCK_TENANTS.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Users table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Felhasználó
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Szerepkörök
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Üzlet</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      Utolsó belépés
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">PIN</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                      Státusz
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map(user => (
                    <tr
                      key={user.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kgc-primary/10 font-medium text-kgc-primary">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.fullName}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">{getRoleBadges(user.roles)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{user.tenantName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {formatDate(user.lastLoginAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.hasPinCode ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(user.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/users/${user.id}`);
                          }}
                        >
                          Részletek →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  <p>Nincs találat a szűrési feltételeknek megfelelően.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-gray-500">
          {filteredUsers.length} felhasználó megjelenítve
        </p>
      </main>
    </div>
  );
}
