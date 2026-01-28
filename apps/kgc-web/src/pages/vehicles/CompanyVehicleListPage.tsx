/**
 * Company Vehicle List Page
 * Epic 34: Járműnyilvántartás (ADR-027)
 * Céges gépkocsik: személyautók, furgonok
 */

import {
  AlertTriangle,
  Car,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Shield,
  Ticket,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type VehicleType = 'car' | 'van' | 'truck';
type VehicleStatus = 'active' | 'in_use' | 'maintenance' | 'inactive';

interface CompanyVehicle {
  id: string;
  licensePlate: string;
  type: VehicleType;
  name: string;
  brand: string;
  model: string;
  year: number;
  status: VehicleStatus;
  assignedTo?: string;
  assignedTenantId?: string;
  assignedTenantName?: string;
  technicalExpiryDate: string;
  registrationExpiryDate: string;
  kgfbExpiryDate: string;
  cascoExpiryDate?: string;
  highwayPassExpiryDate?: string;
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  mileage: number;
}

const MOCK_VEHICLES: CompanyVehicle[] = [
  {
    id: '1',
    licensePlate: 'ABC-001',
    type: 'car',
    name: 'Szolgálati autó 1',
    brand: 'Škoda',
    model: 'Octavia',
    year: 2022,
    status: 'active',
    technicalExpiryDate: '2025-08-15',
    registrationExpiryDate: '2025-12-01',
    kgfbExpiryDate: '2025-04-20',
    cascoExpiryDate: '2025-04-20',
    highwayPassExpiryDate: '2025-12-31',
    fuelType: 'diesel',
    mileage: 45230,
  },
  {
    id: '2',
    licensePlate: 'DEF-002',
    type: 'van',
    name: 'Szállító furgon',
    brand: 'Mercedes',
    model: 'Sprinter',
    year: 2021,
    status: 'in_use',
    assignedTo: 'Kovács István',
    assignedTenantId: 't1',
    assignedTenantName: 'KGC Budapest',
    technicalExpiryDate: '2025-06-20',
    registrationExpiryDate: '2025-10-15',
    kgfbExpiryDate: '2025-03-10',
    highwayPassExpiryDate: '2025-06-30',
    fuelType: 'diesel',
    mileage: 78540,
  },
  {
    id: '3',
    licensePlate: 'GHI-003',
    type: 'car',
    name: 'Ügyfélszolgálat',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2023,
    status: 'maintenance',
    technicalExpiryDate: '2026-02-01',
    registrationExpiryDate: '2026-01-15',
    kgfbExpiryDate: '2025-11-30',
    cascoExpiryDate: '2025-11-30',
    fuelType: 'hybrid',
    mileage: 12340,
  },
  {
    id: '4',
    licensePlate: 'JKL-004',
    type: 'truck',
    name: 'Tehergépkocsi',
    brand: 'Iveco',
    model: 'Daily',
    year: 2020,
    status: 'inactive',
    technicalExpiryDate: '2024-06-01',
    registrationExpiryDate: '2024-12-01',
    kgfbExpiryDate: '2024-08-15',
    fuelType: 'diesel',
    mileage: 125000,
  },
];

const TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Személyautó',
  van: 'Furgon',
  truck: 'Tehergépkocsi',
};

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  active: {
    label: 'Elérhető',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  in_use: {
    label: 'Használatban',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
  },
  maintenance: {
    label: 'Szervizben',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: AlertTriangle,
  },
  inactive: {
    label: 'Inaktív',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: XCircle,
  },
};

const FUEL_LABELS: Record<string, string> = {
  petrol: 'Benzin',
  diesel: 'Dízel',
  electric: 'Elektromos',
  hybrid: 'Hibrid',
};

function isExpiringSoon(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return date <= thirtyDaysFromNow && date > now;
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) <= new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function CompanyVehicleListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VehicleType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const filteredVehicles = useMemo(() => {
    return MOCK_VEHICLES.filter(vehicle => {
      const matchesSearch =
        searchQuery === '' ||
        vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || vehicle.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = MOCK_VEHICLES.length;
    const active = MOCK_VEHICLES.filter(v => v.status === 'active').length;
    const inUse = MOCK_VEHICLES.filter(v => v.status === 'in_use').length;
    const expiringSoon = MOCK_VEHICLES.filter(
      v =>
        isExpiringSoon(v.kgfbExpiryDate) ||
        isExpiringSoon(v.technicalExpiryDate) ||
        (v.highwayPassExpiryDate && isExpiringSoon(v.highwayPassExpiryDate))
    ).length;
    return { total, active, inUse, expiringSoon };
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Biztosan törölni szeretné a járművet: ${name}?`)) {
      console.log('Delete vehicle:', id);
    }
  };

  return (
    <div className="kgc-bg min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Céges járművek</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Személyautók, furgonok központi kezelése
          </p>
        </div>
        <Link
          to="/vehicles/company/new"
          className="inline-flex items-center gap-2 rounded-lg bg-kgc-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kgc-primary/90"
        >
          <Plus className="h-5 w-5" />
          Új jármű
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Összes jármű</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Elérhető</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Használatban</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inUse}</p>
            </div>
          </div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Lejár 30 napon belül</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.expiringSoon}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Keresés rendszám, név, márka..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowStatusDropdown(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Filter className="h-4 w-4" />
              {typeFilter === 'all' ? 'Típus' : TYPE_LABELS[typeFilter]}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showTypeDropdown && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setShowTypeDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Összes típus
                </button>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTypeFilter(key as VehicleType);
                      setShowTypeDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowTypeDropdown(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {statusFilter === 'all' ? 'Státusz' : STATUS_CONFIG[statusFilter].label}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setShowStatusDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Összes státusz
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setStatusFilter(key as VehicleStatus);
                      setShowStatusDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="kgc-card-bg overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Jármű
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Típus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Státusz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  KGFB
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Műszaki
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Km óra
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Műveletek
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nincs találat.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(vehicle => {
                  const StatusIcon = STATUS_CONFIG[vehicle.status].icon;
                  return (
                    <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {vehicle.licensePlate}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {vehicle.name} • {vehicle.brand} {vehicle.model} ({vehicle.year})
                          </div>
                          {vehicle.assignedTo && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              → {vehicle.assignedTo} ({vehicle.assignedTenantName})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {TYPE_LABELS[vehicle.type]}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {FUEL_LABELS[vehicle.fuelType]}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[vehicle.status].color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_CONFIG[vehicle.status].label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-gray-400" />
                          <span
                            className={
                              isExpired(vehicle.kgfbExpiryDate)
                                ? 'font-medium text-red-600 dark:text-red-400'
                                : isExpiringSoon(vehicle.kgfbExpiryDate)
                                  ? 'font-medium text-orange-600 dark:text-orange-400'
                                  : 'text-gray-700 dark:text-gray-300'
                            }
                          >
                            {formatDate(vehicle.kgfbExpiryDate)}
                          </span>
                        </div>
                        {vehicle.cascoExpiryDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            CASCO: {formatDate(vehicle.cascoExpiryDate)}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={
                            isExpired(vehicle.technicalExpiryDate)
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : isExpiringSoon(vehicle.technicalExpiryDate)
                                ? 'font-medium text-orange-600 dark:text-orange-400'
                                : 'text-gray-700 dark:text-gray-300'
                          }
                        >
                          {formatDate(vehicle.technicalExpiryDate)}
                        </span>
                        {vehicle.highwayPassExpiryDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Ticket className="h-3 w-3" />
                            {formatDate(vehicle.highwayPassExpiryDate)}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {vehicle.mileage.toLocaleString('hu-HU')} km
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/vehicles/company/${vehicle.id}`)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                            title="Részletek"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/vehicles/company/${vehicle.id}/edit`)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                            title="Szerkesztés"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id, vehicle.name)}
                            className="rounded p-1 text-gray-500 hover:bg-red-100 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            title="Törlés"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
