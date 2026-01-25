/**
 * Prisma Rental Vehicle Repository
 * Epic 34: Járműnyilvántartás (ADR-027)
 * Bérgép járművek: utánfutók, aggregátorok
 */

import {
  CreateRentalVehicleInput,
  IRentalVehicle,
  IRentalVehicleRepository,
  RentalVehicleFilter,
  RentalVehicleType,
  UpdateRentalVehicleInput,
  VehicleStatus,
} from '@kgc/vehicles';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient, RentalVehicle as PrismaRentalVehicle } from '@prisma/client';

/**
 * Helper: Filter out undefined values from an object
 */
function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

@Injectable()
export class PrismaRentalVehicleRepository implements IRentalVehicleRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Prisma model → Domain interface mapping
   */
  private toDomain(vehicle: PrismaRentalVehicle): IRentalVehicle {
    return {
      id: vehicle.id,
      tenantId: vehicle.tenantId,
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType as RentalVehicleType,
      brand: vehicle.brand ?? undefined,
      model: vehicle.model ?? undefined,
      description: vehicle.description ?? undefined,
      rentalEquipmentId: vehicle.rentalEquipmentId ?? undefined,
      registrationDocNumber: vehicle.registrationDocNumber ?? undefined,
      registrationValidUntil: vehicle.registrationValidUntil ?? undefined,
      technicalInspectionUntil: vehicle.technicalInspectionUntil ?? undefined,
      status: vehicle.status as VehicleStatus,
      notes: vehicle.notes ?? undefined,
      createdBy: vehicle.createdBy,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  async findAll(tenantId: string, filter?: RentalVehicleFilter): Promise<IRentalVehicle[]> {
    const where: Record<string, unknown> = { tenantId };

    if (filter?.vehicleType) {
      where['vehicleType'] = filter.vehicleType;
    }
    if (filter?.status) {
      where['status'] = filter.status;
    }
    if (filter?.expiringWithinDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + filter.expiringWithinDays);
      where['OR'] = [
        { registrationValidUntil: { lte: expiryDate } },
        { technicalInspectionUntil: { lte: expiryDate } },
      ];
    }

    const vehicles = await this.prisma.rentalVehicle.findMany({
      where,
      orderBy: { licensePlate: 'asc' },
    });

    return vehicles.map(v => this.toDomain(v));
  }

  async findById(id: string, tenantId: string): Promise<IRentalVehicle | null> {
    const vehicle = await this.prisma.rentalVehicle.findFirst({
      where: { id, tenantId },
    });

    return vehicle ? this.toDomain(vehicle) : null;
  }

  async findByLicensePlate(licensePlate: string, tenantId: string): Promise<IRentalVehicle | null> {
    const vehicle = await this.prisma.rentalVehicle.findFirst({
      where: { licensePlate, tenantId },
    });

    return vehicle ? this.toDomain(vehicle) : null;
  }

  async create(
    tenantId: string,
    data: CreateRentalVehicleInput,
    createdBy: string
  ): Promise<IRentalVehicle> {
    const createData = omitUndefined({
      tenantId,
      licensePlate: data.licensePlate,
      vehicleType: data.vehicleType,
      brand: data.brand,
      model: data.model,
      description: data.description,
      rentalEquipmentId: data.rentalEquipmentId,
      registrationDocNumber: data.registrationDocNumber,
      registrationValidUntil: data.registrationValidUntil,
      technicalInspectionUntil: data.technicalInspectionUntil,
      notes: data.notes,
      createdBy,
    });

    const vehicle = await this.prisma.rentalVehicle.create({
      data: createData as Parameters<typeof this.prisma.rentalVehicle.create>[0]['data'],
    });

    return this.toDomain(vehicle);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRentalVehicleInput
  ): Promise<IRentalVehicle> {
    // H2 FIX: updateMany for tenant safety
    const updateData = omitUndefined({
      licensePlate: data.licensePlate,
      vehicleType: data.vehicleType,
      brand: data.brand,
      model: data.model,
      description: data.description,
      rentalEquipmentId: data.rentalEquipmentId,
      registrationDocNumber: data.registrationDocNumber,
      registrationValidUntil: data.registrationValidUntil,
      technicalInspectionUntil: data.technicalInspectionUntil,
      status: data.status,
      notes: data.notes,
    });

    await this.prisma.rentalVehicle.updateMany({
      where: { id, tenantId },
      data: updateData as Parameters<typeof this.prisma.rentalVehicle.updateMany>[0]['data'],
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Bérgép jármű nem található');
    }
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    // H2 FIX: deleteMany for tenant safety
    await this.prisma.rentalVehicle.deleteMany({
      where: { id, tenantId },
    });
  }

  async linkToRentalEquipment(
    id: string,
    tenantId: string,
    rentalEquipmentId: string
  ): Promise<IRentalVehicle> {
    await this.prisma.rentalVehicle.updateMany({
      where: { id, tenantId },
      data: { rentalEquipmentId },
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Bérgép jármű nem található');
    }
    return updated;
  }

  async findExpiringDocuments(tenantId: string, withinDays: number): Promise<IRentalVehicle[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + withinDays);

    const vehicles = await this.prisma.rentalVehicle.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { registrationValidUntil: { lte: expiryDate, gte: new Date() } },
          { technicalInspectionUntil: { lte: expiryDate, gte: new Date() } },
        ],
      },
      orderBy: { technicalInspectionUntil: 'asc' },
    });

    return vehicles.map(v => this.toDomain(v));
  }
}
