/**
 * Expiring Documents Page
 * Epic 34: Járműnyilvántartás (ADR-027)
 * Lejáró dokumentumok áttekintése
 */

import { AlertTriangle, Calendar, Car, Clock, Eye, Shield, Ticket, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type DocumentType = 'technical' | 'registration' | 'kgfb' | 'casco' | 'highway' | 'insurance';
type VehicleCategory = 'rental' | 'company';
type FilterPeriod = 'all' | 'expired' | '30days' | '60days';

interface ExpiringDocument {
  id: string;
  vehicleId: string;
  vehicleLicensePlate: string;
  vehicleName: string;
  vehicleCategory: VehicleCategory;
  documentType: DocumentType;
  expiryDate: string;
}

const MOCK_DOCUMENTS: ExpiringDocument[] = [
  {
    id: '1',
    vehicleId: 'r1',
    vehicleLicensePlate: 'ABC-123',
    vehicleName: 'Utánfutó 1',
    vehicleCategory: 'rental',
    documentType: 'technical',
    expiryDate: '2025-02-15',
  },
  {
    id: '2',
    vehicleId: 'r1',
    vehicleLicensePlate: 'ABC-123',
    vehicleName: 'Utánfutó 1',
    vehicleCategory: 'rental',
    documentType: 'insurance',
    expiryDate: '2025-02-20',
  },
  {
    id: '3',
    vehicleId: 'c1',
    vehicleLicensePlate: 'DEF-001',
    vehicleName: 'Szolgálati autó 1',
    vehicleCategory: 'company',
    documentType: 'kgfb',
    expiryDate: '2025-02-10',
  },
  {
    id: '4',
    vehicleId: 'c2',
    vehicleLicensePlate: 'GHI-002',
    vehicleName: 'Furgon 1',
    vehicleCategory: 'company',
    documentType: 'highway',
    expiryDate: '2025-01-31',
  },
  {
    id: '5',
    vehicleId: 'r2',
    vehicleLicensePlate: 'JKL-456',
    vehicleName: 'Aggregátor Honda',
    vehicleCategory: 'rental',
    documentType: 'registration',
    expiryDate: '2025-03-01',
  },
  {
    id: '6',
    vehicleId: 'c1',
    vehicleLicensePlate: 'DEF-001',
    vehicleName: 'Szolgálati autó 1',
    vehicleCategory: 'company',
    documentType: 'casco',
    expiryDate: '2025-02-10',
  },
  {
    id: '7',
    vehicleId: 'c3',
    vehicleLicensePlate: 'MNO-003',
    vehicleName: 'Tehergépkocsi',
    vehicleCategory: 'company',
    documentType: 'technical',
    expiryDate: '2024-12-15',
  },
  {
    id: '8',
    vehicleId: 'r3',
    vehicleLicensePlate: 'PQR-789',
    vehicleName: 'Platform',
    vehicleCategory: 'rental',
    documentType: 'technical',
    expiryDate: '2024-11-01',
  },
];

const DOC_TYPE_CONFIG: Record<
  DocumentType,
  { label: string; icon: typeof Calendar; color: string }
> = {
  technical: {
    label: 'Műszaki vizsga',
    icon: Calendar,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  },
  registration: {
    label: 'Forgalmi engedély',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  },
  kgfb: {
    label: 'KGFB biztosítás',
    icon: Shield,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  },
  casco: {
    label: 'CASCO biztosítás',
    icon: Shield,
    color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
  },
  highway: {
    label: 'Autópálya matrica',
    icon: Ticket,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  },
  insurance: {
    label: 'Biztosítás',
    icon: Shield,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
  },
};

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) <= new Date();
}

function daysUntilExpiry(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('hu-HU');
}

export function ExpiringDocumentsPage() {
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('all');
  const [categoryFilter, setCategoryFilter] = useState<VehicleCategory | 'all'>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentType | 'all'>('all');

  const filteredDocuments = useMemo(() => {
    return MOCK_DOCUMENTS.filter(doc => {
      const days = daysUntilExpiry(doc.expiryDate);
      const expired = isExpired(doc.expiryDate);

      let matchesPeriod = true;
      if (periodFilter === 'expired') matchesPeriod = expired;
      else if (periodFilter === '30days') matchesPeriod = days <= 30 && days > 0;
      else if (periodFilter === '60days') matchesPeriod = days <= 60 && days > 0;

      const matchesCategory = categoryFilter === 'all' || doc.vehicleCategory === categoryFilter;
      const matchesDocType = docTypeFilter === 'all' || doc.documentType === docTypeFilter;

      return matchesPeriod && matchesCategory && matchesDocType;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [periodFilter, categoryFilter, docTypeFilter]);

  const stats = useMemo(() => {
    const expired = MOCK_DOCUMENTS.filter(d => isExpired(d.expiryDate)).length;
    const within30 = MOCK_DOCUMENTS.filter(d => {
      const days = daysUntilExpiry(d.expiryDate);
      return days > 0 && days <= 30;
    }).length;
    const within60 = MOCK_DOCUMENTS.filter(d => {
      const days = daysUntilExpiry(d.expiryDate);
      return days > 30 && days <= 60;
    }).length;
    return { expired, within30, within60, total: MOCK_DOCUMENTS.length };
  }, []);

  return (
    <div className="kgc-bg min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lejáró dokumentumok</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Bérgép és céges járművek lejáró dokumentumai
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="kgc-card-bg rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">Lejárt</p>
              <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
            </div>
          </div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-600">30 napon belül</p>
              <p className="text-2xl font-bold text-orange-700">{stats.within30}</p>
            </div>
          </div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">60 napon belül</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.within60}</p>
            </div>
          </div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Összes figyelt</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
          {(['all', 'expired', '30days', '60days'] as FilterPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${periodFilter === p ? 'bg-kgc-primary text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
            >
              {p === 'all'
                ? 'Összes'
                : p === 'expired'
                  ? 'Lejárt'
                  : p === '30days'
                    ? '30 napon belül'
                    : '60 napon belül'}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as VehicleCategory | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">Összes kategória</option>
          <option value="rental">Bérgép járművek</option>
          <option value="company">Céges járművek</option>
        </select>

        <select
          value={docTypeFilter}
          onChange={e => setDocTypeFilter(e.target.value as DocumentType | 'all')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">Összes dokumentum</option>
          {Object.entries(DOC_TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      {/* Document List */}
      <div className="kgc-card-bg overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            Nincs lejáró dokumentum a kiválasztott szűrőkkel.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDocuments.map(doc => {
              const expired = isExpired(doc.expiryDate);
              const days = daysUntilExpiry(doc.expiryDate);
              const config = DOC_TYPE_CONFIG[doc.documentType];
              const Icon = config.icon;
              const VehicleIcon = doc.vehicleCategory === 'company' ? Car : Truck;

              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-4 ${expired ? 'bg-red-50 dark:bg-red-900/10' : days <= 30 ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {config.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${doc.vehicleCategory === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}
                        >
                          <VehicleIcon className="h-3 w-3" />
                          {doc.vehicleCategory === 'company' ? 'Céges' : 'Bérgép'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {doc.vehicleLicensePlate} - {doc.vehicleName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`font-medium ${expired ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}
                      >
                        {formatDate(doc.expiryDate)}
                      </p>
                      <p
                        className={`text-sm ${expired ? 'text-red-500' : days <= 30 ? 'text-orange-500' : 'text-gray-500'}`}
                      >
                        {expired ? `${Math.abs(days)} napja lejárt` : `${days} nap múlva`}
                      </p>
                    </div>
                    <Link
                      to={
                        doc.vehicleCategory === 'company'
                          ? `/vehicles/company/${doc.vehicleId}`
                          : `/vehicles/rental/${doc.vehicleId}`
                      }
                      className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      title="Részletek"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
