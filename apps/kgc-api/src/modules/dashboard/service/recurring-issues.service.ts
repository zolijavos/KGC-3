import { Injectable } from '@nestjs/common';
import type {
  RecurringIssuesResponseDto,
  ServiceHistoryResponseDto,
} from './dto/recurring-issues.dto';

/**
 * Recurring Issues Service (Story 49-2)
 *
 * Tracks equipment with recurring service issues
 *
 * TODO Phase 2:
 * - Replace mock data with Prisma aggregations
 * - Add tenant-aware queries (RLS automatic)
 */
@Injectable()
export class RecurringIssuesService {
  /**
   * Critical threshold - 5+ services marks equipment as critical
   */
  private readonly CRITICAL_THRESHOLD = 5;

  /**
   * Mock equipment data for MVP
   */
  private readonly mockEquipmentData = [
    {
      id: 'eq-001',
      name: 'Makita HR2470',
      serialNumber: 'MKT-2024-001234',
      serviceCount: 7,
      lastServiceDate: '2026-02-08T10:30:00.000Z',
      issues: ['Szénkefe kopott', 'Motor túlmelegedés', 'Kapcsoló hiba', 'Tokmány elakad'],
    },
    {
      id: 'eq-002',
      name: 'Bosch GBH 2-26',
      serialNumber: 'BSH-2023-005678',
      serviceCount: 5,
      lastServiceDate: '2026-02-05T14:15:00.000Z',
      issues: ['Olajszivárgás', 'Ütvemechanizmus kopás', 'Túlmelegedés'],
    },
    {
      id: 'eq-003',
      name: 'DeWalt DCD791',
      serialNumber: 'DWT-2024-002345',
      serviceCount: 4,
      lastServiceDate: '2026-02-01T09:00:00.000Z',
      issues: ['Akkumulátor probléma', 'Tokmány laza', 'LED nem világít'],
    },
    {
      id: 'eq-004',
      name: 'Hilti TE 30-A36',
      serialNumber: 'HLT-2023-007890',
      serviceCount: 6,
      lastServiceDate: '2026-02-07T16:45:00.000Z',
      issues: ['Porelszívó dugulás', 'Motor zaj', 'Akkumulátor', 'Kapcsoló'],
    },
    {
      id: 'eq-005',
      name: 'Milwaukee M18 FUEL',
      serialNumber: 'MIL-2024-003456',
      serviceCount: 3,
      lastServiceDate: '2026-01-28T11:20:00.000Z',
      issues: ['Szénkefe csere', 'Rezgés', 'Hűtés probléma'],
    },
    {
      id: 'eq-006',
      name: 'Metabo WEV 15-125',
      serialNumber: 'MTB-2023-004567',
      serviceCount: 8,
      lastServiceDate: '2026-02-10T08:00:00.000Z',
      issues: ['Védőburkolat', 'Szénkefe', 'Motor', 'Kapcsoló', 'Tengelycsapágy'],
    },
    {
      id: 'eq-007',
      name: 'Festool TS 55',
      serialNumber: 'FST-2024-001122',
      serviceCount: 3,
      lastServiceDate: '2026-01-25T13:30:00.000Z',
      issues: ['Vezetősín probléma', 'Porelszívó'],
    },
    {
      id: 'eq-008',
      name: 'Stihl MS 261',
      serialNumber: 'STL-2023-006789',
      serviceCount: 5,
      lastServiceDate: '2026-02-03T15:00:00.000Z',
      issues: ['Karburátor', 'Gyújtás', 'Lánc feszítő', 'Olajpumpa'],
    },
  ];

  /**
   * Mock service history data
   */
  private readonly mockServiceHistory: Record<
    string,
    {
      id: string;
      createdAt: string;
      completedAt: string | null;
      status: string;
      issue: string;
      resolution: string;
      isWarranty: boolean;
      laborCost: number;
      partsCost: number;
    }[]
  > = {
    'eq-001': [
      {
        id: 'ws-001',
        createdAt: '2026-02-08T08:00:00.000Z',
        completedAt: '2026-02-08T10:30:00.000Z',
        status: 'COMPLETED',
        issue: 'Szénkefe kopott',
        resolution: 'Szénkefe csere + tisztítás',
        isWarranty: false,
        laborCost: 8500,
        partsCost: 3200,
      },
      {
        id: 'ws-002',
        createdAt: '2026-01-25T09:00:00.000Z',
        completedAt: '2026-01-26T14:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Motor túlmelegedés',
        resolution: 'Hűtőborda tisztítás, termopaszta csere',
        isWarranty: false,
        laborCost: 12000,
        partsCost: 1500,
      },
      {
        id: 'ws-003',
        createdAt: '2026-01-10T10:00:00.000Z',
        completedAt: '2026-01-11T11:30:00.000Z',
        status: 'COMPLETED',
        issue: 'Kapcsoló hiba',
        resolution: 'Kapcsoló egység csere',
        isWarranty: true,
        laborCost: 0,
        partsCost: 0,
      },
      {
        id: 'ws-004',
        createdAt: '2025-12-15T08:30:00.000Z',
        completedAt: '2025-12-16T16:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Tokmány elakad',
        resolution: 'Tokmány mechanizmus javítás',
        isWarranty: false,
        laborCost: 9500,
        partsCost: 4800,
      },
      {
        id: 'ws-005',
        createdAt: '2025-11-28T09:00:00.000Z',
        completedAt: '2025-11-28T12:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Szénkefe kopott',
        resolution: 'Szénkefe csere',
        isWarranty: false,
        laborCost: 6000,
        partsCost: 3200,
      },
      {
        id: 'ws-006',
        createdAt: '2025-11-05T10:30:00.000Z',
        completedAt: '2025-11-06T09:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Motor zaj',
        resolution: 'Csapágy csere',
        isWarranty: false,
        laborCost: 15000,
        partsCost: 6500,
      },
      {
        id: 'ws-007',
        createdAt: '2025-10-12T08:00:00.000Z',
        completedAt: '2025-10-12T11:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Általános karbantartás',
        resolution: 'Tisztítás, kenés, ellenőrzés',
        isWarranty: false,
        laborCost: 5000,
        partsCost: 0,
      },
    ],
    'eq-002': [
      {
        id: 'ws-010',
        createdAt: '2026-02-05T12:00:00.000Z',
        completedAt: '2026-02-05T14:15:00.000Z',
        status: 'COMPLETED',
        issue: 'Olajszivárgás',
        resolution: 'Tömítés csere',
        isWarranty: false,
        laborCost: 7500,
        partsCost: 2100,
      },
      {
        id: 'ws-011',
        createdAt: '2026-01-18T08:00:00.000Z',
        completedAt: '2026-01-19T10:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Ütvemechanizmus kopás',
        resolution: 'Ütvemechanizmus felújítás',
        isWarranty: false,
        laborCost: 18000,
        partsCost: 12500,
      },
      {
        id: 'ws-012',
        createdAt: '2025-12-28T09:30:00.000Z',
        completedAt: '2025-12-29T11:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Túlmelegedés',
        resolution: 'Ventilátor tisztítás',
        isWarranty: false,
        laborCost: 6000,
        partsCost: 0,
      },
      {
        id: 'ws-013',
        createdAt: '2025-12-05T10:00:00.000Z',
        completedAt: '2025-12-05T13:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Olajszivárgás',
        resolution: 'O-gyűrű csere',
        isWarranty: false,
        laborCost: 5500,
        partsCost: 800,
      },
      {
        id: 'ws-014',
        createdAt: '2025-11-15T08:00:00.000Z',
        completedAt: '2025-11-15T10:30:00.000Z',
        status: 'COMPLETED',
        issue: 'Általános karbantartás',
        resolution: 'Teljes karbantartás',
        isWarranty: false,
        laborCost: 8000,
        partsCost: 1500,
      },
    ],
    'eq-006': [
      {
        id: 'ws-020',
        createdAt: '2026-02-10T07:00:00.000Z',
        completedAt: '2026-02-10T08:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Védőburkolat',
        resolution: 'Védőburkolat csere',
        isWarranty: false,
        laborCost: 4000,
        partsCost: 5600,
      },
      {
        id: 'ws-021',
        createdAt: '2026-01-28T09:00:00.000Z',
        completedAt: '2026-01-28T11:30:00.000Z',
        status: 'COMPLETED',
        issue: 'Szénkefe',
        resolution: 'Szénkefe csere',
        isWarranty: false,
        laborCost: 6000,
        partsCost: 2800,
      },
      {
        id: 'ws-022',
        createdAt: '2026-01-15T08:30:00.000Z',
        completedAt: '2026-01-16T15:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Motor',
        resolution: 'Rotor tekercselés',
        isWarranty: false,
        laborCost: 22000,
        partsCost: 8500,
      },
      {
        id: 'ws-023',
        createdAt: '2025-12-20T10:00:00.000Z',
        completedAt: '2025-12-20T12:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Kapcsoló',
        resolution: 'Kapcsoló csere',
        isWarranty: false,
        laborCost: 5500,
        partsCost: 4200,
      },
      {
        id: 'ws-024',
        createdAt: '2025-12-01T09:00:00.000Z',
        completedAt: '2025-12-02T10:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Tengelycsapágy',
        resolution: 'Csapágy csere mindkét oldalon',
        isWarranty: false,
        laborCost: 14000,
        partsCost: 7200,
      },
      {
        id: 'ws-025',
        createdAt: '2025-11-10T08:00:00.000Z',
        completedAt: '2025-11-10T09:30:00.000Z',
        status: 'COMPLETED',
        issue: 'Védőburkolat',
        resolution: 'Védőburkolat javítás',
        isWarranty: false,
        laborCost: 3500,
        partsCost: 0,
      },
      {
        id: 'ws-026',
        createdAt: '2025-10-25T10:00:00.000Z',
        completedAt: '2025-10-25T11:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Szénkefe',
        resolution: 'Szénkefe csere',
        isWarranty: false,
        laborCost: 5000,
        partsCost: 2800,
      },
      {
        id: 'ws-027',
        createdAt: '2025-10-05T08:30:00.000Z',
        completedAt: '2025-10-05T10:00:00.000Z',
        status: 'COMPLETED',
        issue: 'Általános karbantartás',
        resolution: 'Tisztítás, ellenőrzés',
        isWarranty: false,
        laborCost: 4000,
        partsCost: 0,
      },
    ],
  };

  /**
   * Get equipment with recurring service issues
   *
   * @param threshold Minimum number of services to be considered recurring (default: 3)
   * @param days Number of days to look back (default: 90)
   */
  async getRecurringIssues(threshold = 3, days = 90): Promise<RecurringIssuesResponseDto> {
    // TODO: Use 'days' parameter when implementing real database query
    void days; // Suppress unused variable warning until real implementation
    // TODO: Replace with Prisma aggregation
    // const cutoffDate = new Date();
    // cutoffDate.setDate(cutoffDate.getDate() - _days);
    //
    // const equipment = await prisma.$queryRaw`
    //   SELECT e.id, e.name, e.serial_number,
    //          COUNT(w.id) as service_count,
    //          MAX(w.created_at) as last_service_date,
    //          ARRAY_AGG(DISTINCT w.issue_description) as issues
    //   FROM equipment e
    //   JOIN worksheets w ON w.equipment_id = e.id
    //   WHERE w.created_at >= ${cutoffDate}
    //   GROUP BY e.id
    //   HAVING COUNT(w.id) >= ${threshold}
    //   ORDER BY service_count DESC
    // `;

    // Filter by threshold and add critical flag
    const filteredEquipment = this.mockEquipmentData
      .filter(eq => eq.serviceCount >= threshold)
      .map(eq => ({
        ...eq,
        isCritical: eq.serviceCount >= this.CRITICAL_THRESHOLD,
      }))
      .sort((a, b) => b.serviceCount - a.serviceCount);

    const criticalCount = filteredEquipment.filter(eq => eq.isCritical).length;

    return {
      equipment: filteredEquipment,
      totalCount: filteredEquipment.length,
      criticalCount,
    };
  }

  /**
   * Get service history for a specific equipment
   *
   * @param equipmentId The equipment ID to get history for
   */
  async getServiceHistory(equipmentId: string): Promise<ServiceHistoryResponseDto | null> {
    // TODO: Replace with Prisma query
    // const equipment = await prisma.equipment.findUnique({
    //   where: { id: equipmentId },
    //   include: {
    //     worksheets: {
    //       orderBy: { createdAt: 'desc' },
    //     },
    //   },
    // });

    // Find equipment in mock data
    const equipment = this.mockEquipmentData.find(eq => eq.id === equipmentId);
    if (!equipment) {
      return null;
    }

    // Get worksheets for this equipment (or empty array)
    const worksheets = this.mockServiceHistory[equipmentId] ?? [];

    return {
      equipment: {
        id: equipment.id,
        name: equipment.name,
        serialNumber: equipment.serialNumber,
      },
      worksheets,
    };
  }
}
