/**
 * Rental Vehicle List Page
 * Epic 34: Járműnyilvántartás (ADR-027)
 * Bérgép járművek: utánfutók, aggregátorok
 */

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Vehicle types
type VehicleType = 'trailer' | 'aggregator' | 'platform' | 'other';
type VehicleStatus = 'active' | 'rented' | 'maintenance' | 'inactive';

interface RentalVehicle {
  id: string;
  licensePlate: string;
  type: VehicleType;
  name: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  technicalExpiryDate: string;
  registrationExpiryDate: string;
  insuranceExpiryDate: string;
  currentRentalId?: string;
  notes?: string;
}

// Mock data
const MOCK_VEHICLES: RentalVehicle[] = [
  {
    id: '1',
    licensePlate: 'ABC-123',
    type: 'trailer',
    name: 'Utánfutó 1',
    brand: 'Böckmann',
    model: 'Cargo 2500',
    status: 'active',
    technicalExpiryDate: '2025-06-15',
    registrationExpiryDate: '2025-12-01',
    insuranceExpiryDate: '2025-03-20',
  },
  {
    id: '2',
    licensePlate: 'DEF-456',
    type: 'aggregator',
    name: 'Aggregátor Honda',
    brand: 'Honda',
    model: 'EU70is',
    status: 'rented',
    technicalExpiryDate: '2025-08-20',
    registrationExpiryDate: '2025-10-15',
    insuranceExpiryDate: '2025-05-10',
    currentRentalId: 'R-2024-0125',
  },
  {
    id: '3',
    licensePlate: 'GHI-789',
    type: 'platform',
    name: 'Emelő platform',
    brand: 'Genie',
    model: 'GS-1930',
    status: 'maintenance',
    technicalExpiryDate: '2024-12-01',
    registrationExpiryDate: '2025-06-30',
    insuranceExpiryDate: '2025-04-15',
    notes: 'Hidraulika javítás szükséges',
  },
  {
    id: '4',
    licensePlate: 'JKL-012',
    type: 'trailer',
    name: 'Utánfutó 2',
    brand: 'Humbaur',
    model: 'HA 203015',
    status: 'inactive',
    technicalExpiryDate: '2024-06-01',
    registrationExpiryDate: '2024-12-01',
    insuranceExpiryDate: '2024-08-15',
  },
  {
    id: '5',
    licensePlate: 'MNO-345',
    type: 'aggregator',
    name: 'Aggregátor Kipor',
    brand: 'Kipor',
    model: 'KDE6500T',
    status: 'active',
    technicalExpiryDate: '2026-02-28',
    registrationExpiryDate: '2026-01-15',
    insuranceExpiryDate: '2025-11-30',
  },
];

const TYPE_LABELS: Record<VehicleType, string> = {
  trailer: 'Utánfutó',
  aggregator: 'Aggregátor',
  platform: 'Platform',
  other: 'Egyéb',
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
  rented: {
    label: 'Kiadva',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
  },
  maintenance: {
    label: 'Karbantartás',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: AlertTriangle,
  },
  inactive: {
    label: 'Inaktív',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: XCircle,
  },
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

export function RentalVehicleListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VehicleType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Filter vehicles
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

  // Stats
  const stats = useMemo(() => {
    const total = MOCK_VEHICLES.length;
    const active = MOCK_VEHICLES.filter(v => v.status === 'active').length;
    const rented = MOCK_VEHICLES.filter(v => v.status === 'rented').length;
    const expiringSoon = MOCK_VEHICLES.filter(
      v =>
        isExpiringSoon(v.technicalExpiryDate) ||
        isExpiringSoon(v.registrationExpiryDate) ||
        isExpiringSoon(v.insuranceExpiryDate)
    ).length;
    return { total, active, rented, expiringSoon };
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Biztosan törölni szeretné a járművet: ${name}?`)) {
      // TODO: API call
      console.log('Delete vehicle:', id);
    }
  };

  return (
    <div className="kgc-bg min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bérgép járművek</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Utánfutók, aggregátorok, platformok kezelése
          </p>
        </div>
        <Link
          to="/vehicles/rental/new"
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
              <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Kiadva</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rented}</p>
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
          {/* Type Filter */}
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

          {/* Status Filter */}
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
                  Műszaki lejárat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Forgalmi lejárat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Biztosítás lejárat
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
                    Nincs találat a keresési feltételeknek megfelelően.
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
                            {vehicle.name} • {vehicle.brand} {vehicle.model}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {TYPE_LABELS[vehicle.type]}
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
                          {isExpired(vehicle.technicalExpiryDate) && (
                            <AlertTriangle className="ml-1 inline h-3 w-3" />
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={
                            isExpired(vehicle.registrationExpiryDate)
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : isExpiringSoon(vehicle.registrationExpiryDate)
                                ? 'font-medium text-orange-600 dark:text-orange-400'
                                : 'text-gray-700 dark:text-gray-300'
                          }
                        >
                          {formatDate(vehicle.registrationExpiryDate)}
                          {isExpired(vehicle.registrationExpiryDate) && (
                            <AlertTriangle className="ml-1 inline h-3 w-3" />
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={
                            isExpired(vehicle.insuranceExpiryDate)
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : isExpiringSoon(vehicle.insuranceExpiryDate)
                                ? 'font-medium text-orange-600 dark:text-orange-400'
                                : 'text-gray-700 dark:text-gray-300'
                          }
                        >
                          {formatDate(vehicle.insuranceExpiryDate)}
                          {isExpired(vehicle.insuranceExpiryDate) && (
                            <AlertTriangle className="ml-1 inline h-3 w-3" />
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/vehicles/rental/${vehicle.id}`)}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                            title="Részletek"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/vehicles/rental/${vehicle.id}/edit`)}
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
