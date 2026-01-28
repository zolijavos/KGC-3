/**
 * User Form Page
 * Felhasználó létrehozása és szerkesztése
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_ROLES, MOCK_TENANTS, MOCK_USERS, USER_STATUSES } from './mock-data';
import type { User, UserStatus } from './types';

interface FormData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: UserStatus;
  roles: string[];
  primaryRole: string;
  tenantId: string;
  locale: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  emailNotifications: boolean;
  pinCode: string;
  confirmPinCode: string;
}

const defaultFormData: FormData = {
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  phone: '',
  status: 'active',
  roles: [],
  primaryRole: '',
  tenantId: MOCK_TENANTS[0]?.id ?? '',
  locale: 'hu-HU',
  timezone: 'Europe/Budapest',
  theme: 'light',
  notifications: true,
  emailNotifications: true,
  pinCode: '',
  confirmPinCode: '',
};

function userToFormData(user: User): FormData {
  return {
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? '',
    status: user.status,
    roles: user.roles,
    primaryRole: user.primaryRole,
    tenantId: user.tenantId,
    locale: user.locale ?? 'hu-HU',
    timezone: user.timezone ?? 'Europe/Budapest',
    theme: user.preferences?.theme ?? 'light',
    notifications: user.preferences?.notifications ?? true,
    emailNotifications: user.preferences?.emailNotifications ?? true,
    pinCode: '',
    confirmPinCode: '',
  };
}

export function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    if (isEditMode && id) {
      const found = MOCK_USERS.find(u => u.id === id);
      if (found) {
        setUser(found);
        setFormData(userToFormData(found));
      }
      setIsLoading(false);
    }
  }, [id, isEditMode]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleRole = (roleId: string) => {
    setFormData(prev => {
      const newRoles = prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId];

      // If primary role was removed, clear it
      const newPrimaryRole = newRoles.includes(prev.primaryRole)
        ? prev.primaryRole
        : (newRoles[0] ?? '');

      return { ...prev, roles: newRoles, primaryRole: newPrimaryRole };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email cím kötelező';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Érvénytelen email cím';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Felhasználónév kötelező';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Legalább 3 karakter';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Vezetéknév kötelező';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Keresztnév kötelező';
    }

    if (formData.roles.length === 0) {
      newErrors.roles = 'Legalább egy szerepkör kötelező';
    }

    if (!formData.tenantId) {
      newErrors.tenantId = 'Üzlet kiválasztása kötelező';
    }

    if (formData.pinCode && formData.pinCode.length !== 4) {
      newErrors.pinCode = 'PIN kód 4 számjegy';
    }

    if (formData.pinCode && formData.pinCode !== formData.confirmPinCode) {
      newErrors.confirmPinCode = 'PIN kódok nem egyeznek';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const fullName = `${formData.lastName} ${formData.firstName}`;

    if (isEditMode) {
      alert(`Felhasználó frissítve!\nNév: ${fullName}\nEmail: ${formData.email}`);
      navigate(`/users/${id}`);
    } else {
      alert(`Felhasználó létrehozva!\nNév: ${fullName}\nEmail: ${formData.email}`);
      navigate('/users');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  }

  if (isEditMode && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Felhasználó nem található.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(isEditMode ? `/users/${id}` : '/users')}
            >
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? 'Felhasználó szerkesztése' : 'Új felhasználó'}
              </h1>
              {isEditMode && user && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.fullName}</p>
              )}
            </div>
          </div>
          <Button onClick={handleSubmit} className="bg-kgc-primary hover:bg-kgc-primary/90">
            {isEditMode ? 'Mentés' : 'Létrehozás'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Alapadatok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email cím *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="felhasznalo@example.hu"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Felhasználónév *
                  </label>
                  <Input
                    value={formData.username}
                    onChange={e => updateField('username', e.target.value)}
                    placeholder="felhasznalonev"
                    className={errors.username ? 'border-red-500' : ''}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vezetéknév *
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={e => updateField('lastName', e.target.value)}
                    placeholder="Kovács"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Keresztnév *
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={e => updateField('firstName', e.target.value)}
                    placeholder="János"
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefonszám
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    placeholder="+36 30 123 4567"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Státusz
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => updateField('status', e.target.value as UserStatus)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {USER_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenant & Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Üzlet és szerepkörök</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Üzlet *
                  </label>
                  <select
                    value={formData.tenantId}
                    onChange={e => updateField('tenantId', e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white ${errors.tenantId ? 'border-red-500' : 'border-gray-300 bg-white'}`}
                  >
                    <option value="">Válasszon üzletet...</option>
                    {MOCK_TENANTS.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {errors.tenantId && (
                    <p className="mt-1 text-sm text-red-500">{errors.tenantId}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Szerepkörök * (legalább egy)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_ROLES.map(role => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          formData.roles.includes(role.id)
                            ? 'bg-kgc-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                  {errors.roles && <p className="mt-1 text-sm text-red-500">{errors.roles}</p>}
                </div>

                {formData.roles.length > 1 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Elsődleges szerepkör
                    </label>
                    <select
                      value={formData.primaryRole}
                      onChange={e => updateField('primaryRole', e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      {formData.roles.map(roleId => {
                        const role = MOCK_ROLES.find(r => r.id === roleId);
                        return (
                          <option key={roleId} value={roleId}>
                            {role?.name ?? roleId}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PIN Code */}
          <Card>
            <CardHeader>
              <CardTitle>PIN kód (Kiosk mód)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isEditMode ? 'Új PIN kód' : 'PIN kód'} (4 számjegy)
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={formData.pinCode}
                    onChange={e => updateField('pinCode', e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className={errors.pinCode ? 'border-red-500' : ''}
                  />
                  {errors.pinCode && <p className="mt-1 text-sm text-red-500">{errors.pinCode}</p>}
                  {isEditMode && (
                    <p className="mt-1 text-xs text-gray-500">
                      Hagyja üresen, ha nem kívánja módosítani
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    PIN kód megerősítése
                  </label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={formData.confirmPinCode}
                    onChange={e => updateField('confirmPinCode', e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className={errors.confirmPinCode ? 'border-red-500' : ''}
                  />
                  {errors.confirmPinCode && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPinCode}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Beállítások</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Téma
                    </label>
                    <select
                      value={formData.theme}
                      onChange={e =>
                        updateField('theme', e.target.value as 'light' | 'dark' | 'system')
                      }
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="light">Világos</option>
                      <option value="dark">Sötét</option>
                      <option value="system">Rendszer</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nyelv
                    </label>
                    <select
                      value={formData.locale}
                      onChange={e => updateField('locale', e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="hu-HU">Magyar</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Időzóna
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={e => updateField('timezone', e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="Europe/Budapest">Europe/Budapest</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.notifications}
                      onChange={e => updateField('notifications', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Értesítések</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.emailNotifications}
                      onChange={e => updateField('emailNotifications', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Email értesítések
                    </span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isEditMode ? `/users/${id}` : '/users')}
            >
              Mégse
            </Button>
            <Button type="submit" className="bg-kgc-primary hover:bg-kgc-primary/90">
              {isEditMode ? 'Változtatások mentése' : 'Felhasználó létrehozása'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
