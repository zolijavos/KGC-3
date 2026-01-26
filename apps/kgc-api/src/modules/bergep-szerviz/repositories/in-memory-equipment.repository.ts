/**
 * In-Memory Equipment Repository
 * Epic 25: Equipment-Service Integration
 *
 * Development implementation - replace with Prisma for production
 */

import { EquipmentStatus, IEquipment, IEquipmentRepository } from '@kgc/bergep-szerviz';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryEquipmentRepository implements IEquipmentRepository {
  private equipment: Map<string, IEquipment> = new Map();

  constructor() {
    // Seed some test data
    this.seedTestData();
  }

  private seedTestData(): void {
    const now = new Date();
    const testEquipment: IEquipment[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: 'tenant-001',
        equipmentCode: 'BG-001',
        name: 'Makita Fúrógép HR2470',
        serialNumber: 'MAK123456',
        status: EquipmentStatus.AVAILABLE,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        tenantId: 'tenant-001',
        equipmentCode: 'BG-002',
        name: 'Bosch Sarokcsiszoló GWS 22-230',
        serialNumber: 'BSH789012',
        status: EquipmentStatus.RENTED,
        currentRentalId: 'rental-001',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        tenantId: 'tenant-001',
        equipmentCode: 'BG-003',
        name: 'DeWalt Ütvefúró DCD996',
        serialNumber: 'DW345678',
        status: EquipmentStatus.IN_SERVICE,
        lastServiceDate: now,
        createdAt: now,
        updatedAt: now,
      },
    ];

    testEquipment.forEach(eq => this.equipment.set(eq.id, eq));
  }

  async findById(id: string): Promise<IEquipment | null> {
    return this.equipment.get(id) ?? null;
  }

  async update(id: string, data: Partial<IEquipment>): Promise<IEquipment> {
    const existing = this.equipment.get(id);
    if (!existing) {
      throw new Error('Equipment not found');
    }

    const updated: IEquipment = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.equipment.set(id, updated);
    return updated;
  }

  // Helper for tests
  async create(data: Omit<IEquipment, 'createdAt' | 'updatedAt'>): Promise<IEquipment> {
    const now = new Date();
    const equipment: IEquipment = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.equipment.set(equipment.id, equipment);
    return equipment;
  }
}
