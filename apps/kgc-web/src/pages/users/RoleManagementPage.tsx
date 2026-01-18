import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_ROLES, PERMISSION_MODULES, getPermissionsByModule } from './mock-data';
import type { PermissionModule, Role } from './types';

export function RoleManagementPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<Role | null>(MOCK_ROLES[0] ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPermissions, setEditPermissions] = useState<Set<string>>(new Set());

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditPermissions(new Set(role.permissions));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (selectedRole) {
      setEditPermissions(new Set(selectedRole.permissions));
    }
  };

  const handleSaveRole = () => {
    // In real app, this would call API
    alert(`Szerepkör mentve: ${selectedRole?.name}\n${editPermissions.size} jogosultság`);
    setIsEditing(false);
  };

  const togglePermission = (permissionId: string) => {
    const newPermissions = new Set(editPermissions);
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId);
    } else {
      newPermissions.add(permissionId);
    }
    setEditPermissions(newPermissions);
  };

  const toggleModulePermissions = (module: PermissionModule, enable: boolean) => {
    const modulePermissions = getPermissionsByModule(module);
    const newPermissions = new Set(editPermissions);
    modulePermissions.forEach(p => {
      if (enable) {
        newPermissions.add(p.id);
      } else {
        newPermissions.delete(p.id);
      }
    });
    setEditPermissions(newPermissions);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/users')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Szerepkörök és jogosultságok</h1>
              <p className="text-sm text-gray-500">RBAC kezelés</p>
            </div>
          </div>
          <Button className="bg-kgc-primary hover:bg-kgc-primary/90">+ Új szerepkör</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Role list */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Szerepkörök ({MOCK_ROLES.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {MOCK_ROLES.map(role => (
                    <button
                      key={role.id}
                      onClick={() => {
                        setSelectedRole(role);
                        setEditPermissions(new Set(role.permissions));
                        setIsEditing(false);
                      }}
                      className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                        selectedRole?.id === role.id
                          ? 'bg-kgc-primary/5 border-l-4 border-kgc-primary'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{role.name}</p>
                          <p className="text-sm text-gray-500">{role.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-600">
                            {role.userCount} felhasználó
                          </p>
                          {role.isSystem && <span className="text-xs text-gray-400">Rendszer</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Role details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedRole ? (
              <>
                {/* Role info */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{selectedRole.name}</CardTitle>
                      <p className="text-sm text-gray-500">{selectedRole.description}</p>
                    </div>
                    {!isEditing ? (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleEditRole(selectedRole)}>
                          Szerkesztés
                        </Button>
                        {!selectedRole.isSystem && (
                          <Button variant="outline" className="text-red-600 hover:bg-red-50">
                            Törlés
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleCancelEdit}>
                          Mégse
                        </Button>
                        <Button
                          className="bg-kgc-primary hover:bg-kgc-primary/90"
                          onClick={handleSaveRole}
                        >
                          Mentés
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3 text-sm">
                      <div>
                        <span className="text-gray-500">Kód:</span>
                        <span className="ml-2 font-medium">{selectedRole.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Felhasználók:</span>
                        <span className="ml-2 font-medium">{selectedRole.userCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Jogosultságok:</span>
                        <span className="ml-2 font-medium">
                          {isEditing ? editPermissions.size : selectedRole.permissions.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Típus:</span>
                        <span className="ml-2 font-medium">
                          {selectedRole.isSystem ? 'Rendszer szerepkör' : 'Egyedi szerepkör'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Létrehozva:</span>
                        <span className="ml-2 font-medium">
                          {formatDate(selectedRole.createdAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Módosítva:</span>
                        <span className="ml-2 font-medium">
                          {formatDate(selectedRole.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Permissions */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Jogosultságok (
                      {isEditing ? editPermissions.size : selectedRole.permissions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {PERMISSION_MODULES.map(module => {
                        const modulePermissions = getPermissionsByModule(module.value);
                        const grantedCount = modulePermissions.filter(p =>
                          isEditing
                            ? editPermissions.has(p.id)
                            : selectedRole.permissions.includes(p.id)
                        ).length;

                        return (
                          <div key={module.value} className="rounded-lg border p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <h3 className="flex items-center gap-2 font-medium text-gray-900">
                                <span>{module.icon}</span>
                                {module.label}
                                <span className="text-sm font-normal text-gray-500">
                                  ({grantedCount}/{modulePermissions.length})
                                </span>
                              </h3>
                              {isEditing && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => toggleModulePermissions(module.value, true)}
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    Mind
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={() => toggleModulePermissions(module.value, false)}
                                    className="text-sm text-gray-500 hover:underline"
                                  >
                                    Egyik sem
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {modulePermissions.map(permission => {
                                const isGranted = isEditing
                                  ? editPermissions.has(permission.id)
                                  : selectedRole.permissions.includes(permission.id);

                                return isEditing ? (
                                  <label
                                    key={permission.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                      isGranted
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isGranted}
                                      onChange={() => togglePermission(permission.id)}
                                      className="h-4 w-4 rounded"
                                    />
                                    <div>
                                      <p
                                        className={`font-medium ${isGranted ? 'text-green-800' : 'text-gray-700'}`}
                                      >
                                        {permission.name}
                                      </p>
                                      <p
                                        className={`text-sm ${isGranted ? 'text-green-600' : 'text-gray-500'}`}
                                      >
                                        {permission.description}
                                      </p>
                                    </div>
                                  </label>
                                ) : (
                                  <div
                                    key={permission.id}
                                    className={`rounded-lg border p-3 ${
                                      isGranted
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-200 bg-gray-50 opacity-50'
                                    }`}
                                  >
                                    <p
                                      className={`font-medium ${isGranted ? 'text-green-800' : 'text-gray-500'}`}
                                    >
                                      {permission.name}
                                    </p>
                                    <p
                                      className={`text-sm ${isGranted ? 'text-green-600' : 'text-gray-400'}`}
                                    >
                                      {permission.description}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    Válasszon ki egy szerepkört a részletek megtekintéséhez.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
