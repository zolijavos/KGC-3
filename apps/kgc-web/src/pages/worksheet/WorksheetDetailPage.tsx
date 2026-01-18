import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_WORKSHEETS, formatCurrency, formatDate, formatDateTime } from './mock-data';
import {
  CATEGORY_LABELS,
  HISTORY_ACTION_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  WorksheetStatus,
} from './types';

type TabType = 'overview' | 'items' | 'history';

export function WorksheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const worksheet = MOCK_WORKSHEETS.find(w => w.id === id);

  if (!worksheet) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">Munkalap nem található</p>
              <Button onClick={() => navigate('/worksheet')}>Vissza a listához</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: WorksheetStatus) => {
    switch (status) {
      case WorksheetStatus.FELVEVE:
        return 'bg-blue-100 text-blue-800';
      case WorksheetStatus.FOLYAMATBAN:
        return 'bg-yellow-100 text-yellow-800';
      case WorksheetStatus.VARHATO:
        return 'bg-purple-100 text-purple-800';
      case WorksheetStatus.KESZ:
        return 'bg-green-100 text-green-800';
      case WorksheetStatus.SZAMLAZANDO:
        return 'bg-orange-100 text-orange-800';
      case WorksheetStatus.LEZART:
        return 'bg-gray-100 text-gray-800';
      case WorksheetStatus.TOROLVE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Áttekintés' },
    { id: 'items', label: `Tételek (${worksheet.items.length})` },
    { id: 'history', label: 'Történet' },
  ];

  const partsItems = worksheet.items.filter(i => i.type === 'ALKATRESZ');
  const laborItems = worksheet.items.filter(i => i.type === 'MUNKADIJ');
  const otherItems = worksheet.items.filter(i => i.type === 'EGYEB');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/worksheet')}>
                ← Vissza
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{worksheet.worksheetNumber}</h1>
                <p className="text-sm text-gray-500">{worksheet.partnerName}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(worksheet.status)}`}
              >
                {STATUS_LABELS[worksheet.status]}
              </span>
            </div>
            <div className="flex gap-2">
              {worksheet.status === WorksheetStatus.KESZ && <Button>Számlázás</Button>}
              {worksheet.status === WorksheetStatus.FELVEVE && <Button>Munka indítása</Button>}
              {worksheet.status === WorksheetStatus.FOLYAMATBAN && (
                <Button variant="outline">Szerkesztés</Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(`/quotations/new?worksheetId=${worksheet.id}`)}
              >
                📝 Árajánlat
              </Button>
              <Button variant="outline">Nyomtatás</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gép/Termék */}
              <Card>
                <CardHeader>
                  <CardTitle>Gép / Termék</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Megnevezés</p>
                      <p className="font-medium">{worksheet.product.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Kategória</p>
                      <p className="font-medium">{CATEGORY_LABELS[worksheet.product.category]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gyártó / Modell</p>
                      <p className="font-medium">
                        {worksheet.product.brand} {worksheet.product.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gyári szám</p>
                      <p className="font-medium font-mono">
                        {worksheet.product.serialNumber || '-'}
                      </p>
                    </div>
                    {worksheet.product.warrantyExpiry && (
                      <div>
                        <p className="text-sm text-gray-500">Garancia lejár</p>
                        <p
                          className={`font-medium ${new Date(worksheet.product.warrantyExpiry) < new Date() ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {formatDate(worksheet.product.warrantyExpiry.toISOString())}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Hiba leírás */}
              <Card>
                <CardHeader>
                  <CardTitle>Hiba leírás</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{worksheet.faultDescription}</p>
                </CardContent>
              </Card>

              {/* Diagnózis és munka */}
              {(worksheet.diagnosis || worksheet.workPerformed) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Diagnózis és elvégzett munka</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {worksheet.diagnosis && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Diagnózis</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{worksheet.diagnosis}</p>
                      </div>
                    )}
                    {worksheet.workPerformed && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Elvégzett munka</p>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {worksheet.workPerformed}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Megjegyzések */}
              {(worksheet.internalNote || worksheet.customerNote) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Megjegyzések</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {worksheet.customerNote && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium mb-1">Ügyfél megjegyzése</p>
                        <p className="text-blue-800">{worksheet.customerNote}</p>
                      </div>
                    )}
                    {worksheet.internalNote && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-yellow-600 font-medium mb-1">Belső megjegyzés</p>
                        <p className="text-yellow-800">{worksheet.internalNote}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Partner */}
              <Card>
                <CardHeader>
                  <CardTitle>Partner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Név</p>
                    <p className="font-medium">{worksheet.partnerName}</p>
                  </div>
                  {worksheet.partnerPhone && (
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <a
                        href={`tel:${worksheet.partnerPhone}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {worksheet.partnerPhone}
                      </a>
                    </div>
                  )}
                  {worksheet.partnerEmail && (
                    <div>
                      <p className="text-sm text-gray-500">E-mail</p>
                      <a
                        href={`mailto:${worksheet.partnerEmail}`}
                        className="font-medium text-blue-600 hover:underline text-sm"
                      >
                        {worksheet.partnerEmail}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Munkalap adatok */}
              <Card>
                <CardHeader>
                  <CardTitle>Munkalap adatok</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Típus</p>
                    <p className="font-medium">{TYPE_LABELS[worksheet.worksheetType]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prioritás</p>
                    <p className="font-medium">{PRIORITY_LABELS[worksheet.priority]}</p>
                  </div>
                  {worksheet.costLimit && (
                    <div>
                      <p className="text-sm text-gray-500">Költséghatár</p>
                      <p className="font-medium">{formatCurrency(worksheet.costLimit)}</p>
                    </div>
                  )}
                  {worksheet.assignedTo && (
                    <div>
                      <p className="text-sm text-gray-500">Felelős</p>
                      <p className="font-medium">{worksheet.assignedTo}</p>
                    </div>
                  )}
                  {worksheet.estimatedCompletionDate && (
                    <div>
                      <p className="text-sm text-gray-500">Várható elkészülés</p>
                      <p className="font-medium">{formatDate(worksheet.estimatedCompletionDate)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pénzügyi összesítő */}
              <Card>
                <CardHeader>
                  <CardTitle>Pénzügyi összesítő</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nettó összeg</span>
                    <span className="font-medium">{formatCurrency(worksheet.netTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">ÁFA (27%)</span>
                    <span className="font-medium">{formatCurrency(worksheet.vatTotal)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Bruttó összeg</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(worksheet.grossTotal)}
                    </span>
                  </div>
                  {worksheet.depositPaid > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Előleg fizetve</span>
                        <span>-{formatCurrency(worksheet.depositPaid)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Fizetendő</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(worksheet.grossTotal - worksheet.depositPaid)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Dátumok */}
              <Card>
                <CardHeader>
                  <CardTitle>Időpontok</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Létrehozva</span>
                    <span>{formatDateTime(worksheet.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Módosítva</span>
                    <span>{formatDateTime(worksheet.updatedAt)}</span>
                  </div>
                  {worksheet.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Befejezve</span>
                      <span className="text-green-600">
                        {formatDateTime(worksheet.completedAt)}
                      </span>
                    </div>
                  )}
                  {worksheet.invoicedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Számlázva</span>
                      <span className="text-blue-600">{formatDateTime(worksheet.invoicedAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-500">Felvette</span>
                    <span>{worksheet.createdBy}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div className="space-y-6">
            {/* Alkatrészek */}
            <Card>
              <CardHeader>
                <CardTitle>Alkatrészek ({partsItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {partsItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nincs alkatrész tétel</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                          <th className="pb-2">Megnevezés</th>
                          <th className="pb-2 text-right">Mennyiség</th>
                          <th className="pb-2 text-right">Egységár</th>
                          <th className="pb-2 text-right">Nettó</th>
                          <th className="pb-2 text-right">Bruttó</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partsItems.map(item => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-3">{item.description}</td>
                            <td className="py-3 text-right">{item.quantity} db</td>
                            <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 text-right">{formatCurrency(item.netAmount)}</td>
                            <td className="py-3 text-right font-medium">
                              {formatCurrency(item.grossAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium">
                          <td colSpan={3} className="pt-3 text-right">
                            Alkatrészek összesen:
                          </td>
                          <td className="pt-3 text-right">
                            {formatCurrency(partsItems.reduce((sum, i) => sum + i.netAmount, 0))}
                          </td>
                          <td className="pt-3 text-right">
                            {formatCurrency(partsItems.reduce((sum, i) => sum + i.grossAmount, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Munkadíjak */}
            <Card>
              <CardHeader>
                <CardTitle>Munkadíjak ({laborItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {laborItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nincs munkadíj tétel</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                          <th className="pb-2">Munka</th>
                          <th className="pb-2 text-right">Mennyiség</th>
                          <th className="pb-2 text-right">Egységár</th>
                          <th className="pb-2 text-right">Nettó</th>
                          <th className="pb-2 text-right">Bruttó</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laborItems.map(item => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-3">{item.description}</td>
                            <td className="py-3 text-right">{item.quantity} db</td>
                            <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 text-right">{formatCurrency(item.netAmount)}</td>
                            <td className="py-3 text-right font-medium">
                              {formatCurrency(item.grossAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium">
                          <td colSpan={3} className="pt-3 text-right">
                            Munkadíjak összesen:
                          </td>
                          <td className="pt-3 text-right">
                            {formatCurrency(laborItems.reduce((sum, i) => sum + i.netAmount, 0))}
                          </td>
                          <td className="pt-3 text-right">
                            {formatCurrency(laborItems.reduce((sum, i) => sum + i.grossAmount, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Egyéb tételek */}
            {otherItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Egyéb tételek ({otherItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                          <th className="pb-2">Megnevezés</th>
                          <th className="pb-2 text-right">Mennyiség</th>
                          <th className="pb-2 text-right">Egységár</th>
                          <th className="pb-2 text-right">Nettó</th>
                          <th className="pb-2 text-right">Bruttó</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherItems.map(item => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-3">{item.description}</td>
                            <td className="py-3 text-right">{item.quantity} db</td>
                            <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 text-right">{formatCurrency(item.netAmount)}</td>
                            <td className="py-3 text-right font-medium">
                              {formatCurrency(item.grossAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Összesítő */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nettó összesen</span>
                      <span className="font-medium">{formatCurrency(worksheet.netTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ÁFA (27%)</span>
                      <span className="font-medium">{formatCurrency(worksheet.vatTotal)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">Bruttó összesen</span>
                      <span className="font-bold text-xl">
                        {formatCurrency(worksheet.grossTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Munkalap történet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {worksheet.history.map((entry, index) => (
                    <div key={entry.id} className="relative pl-10">
                      <div
                        className={`absolute left-2 w-5 h-5 rounded-full border-2 bg-white ${
                          index === 0 ? 'border-blue-500' : 'border-gray-300'
                        }`}
                      />
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                              {HISTORY_ACTION_LABELS[entry.action]}
                            </span>
                            <p className="mt-1 font-medium">{entry.description}</p>
                            {entry.oldValue && entry.newValue && (
                              <p className="text-sm text-gray-500 mt-1">
                                <span className="line-through">{entry.oldValue}</span>
                                {' → '}
                                <span className="text-green-600">{entry.newValue}</span>
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{formatDateTime(entry.timestamp)}</p>
                            <p>{entry.userName}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
