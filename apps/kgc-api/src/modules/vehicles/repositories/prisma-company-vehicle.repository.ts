/**
 * Prisma Company Vehicle Repository
 * Epic 34: Járműnyilvántartás (ADR-027)
 * Céges gépkocsik: személyautók, furgonok (központi kezelés)
 */

import {
  AssignCompanyVehicleInput,
  CompanyVehicleFilter,
  CompanyVehicleType,
  CreateCompanyVehicleInput,
  ICompanyVehicle,
  ICompanyVehicleRepository,
  UpdateCompanyVehicleInput,
  VehicleStatus,
} from '@kgc/vehicles';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient, CompanyVehicle as PrismaCompanyVehicle } from '@prisma/client';

/**
 * Helper: Filter out undefined values from an object
 */
function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

@Injectable()
export class PrismaCompanyVehicleRepository implements ICompanyVehicleRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Prisma model → Domain interface mapping
   */
  private toDomain(vehicle: PrismaCompanyVehicle): ICompanyVehicle {
    return {
      id: vehicle.id,
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType as CompanyVehicleType,
      brand: vehicle.brand ?? undefined,
      model: vehicle.model ?? undefined,
      yearOfManufacture: vehicle.yearOfManufacture ?? undefined,
      vin: vehicle.vin ?? undefined,
      assignedTenantId: vehicle.assignedTenantId ?? undefined,
      assignedUserId: vehicle.assignedUserId ?? undefined,
      registrationDocNumber: vehicle.registrationDocNumber ?? undefined,
      registrationValidUntil: vehicle.registrationValidUntil ?? undefined,
      technicalInspectionUntil: vehicle.technicalInspectionUntil ?? undefined,
      kgfbPolicyNumber: vehicle.kgfbPolicyNumber ?? undefined,
      kgfbInsurer: vehicle.kgfbInsurer ?? undefined,
      kgfbValidUntil: vehicle.kgfbValidUntil ?? undefined,
      cascoPolicyNumber: vehicle.cascoPolicyNumber ?? undefined,
      cascoInsurer: vehicle.cascoInsurer ?? undefined,
      cascoValidUntil: vehicle.cascoValidUntil ?? undefined,
      highwayStickerCategory: vehicle.highwayStickerCategory ?? undefined,
      highwayStickerUntil: vehicle.highwayStickerUntil ?? undefined,
      status: vehicle.status as VehicleStatus,
      notes: vehicle.notes ?? undefined,
      createdBy: vehicle.createdBy,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  async findAll(filter?: CompanyVehicleFilter): Promise<ICompanyVehicle[]> {
    const where: Record<string, unknown> = {};

    if (filter?.vehicleType) {
      where['vehicleType'] = filter.vehicleType;
    }
    if (filter?.status) {
      where['status'] = filter.status;
    }
    if (filter?.assignedTenantId) {
      where['assignedTenantId'] = filter.assignedTenantId;
    }
    if (filter?.assignedUserId) {
      where['assignedUserId'] = filter.assignedUserId;
    }
    if (filter?.expiringWithinDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + filter.expiringWithinDays);
      where['OR'] = [
        { technicalInspectionUntil: { lte: expiryDate } },
        { kgfbValidUntil: { lte: expiryDate } },
        { cascoValidUntil: { lte: expiryDate } },
        { highwayStickerUntil: { lte: expiryDate } },
      ];
    }

    const vehicles = await this.prisma.companyVehicle.findMany({
      where,
      orderBy: { licensePlate: 'asc' },
    });

    return vehicles.map(v => this.toDomain(v));
  }

  async findById(id: string): Promise<ICompanyVehicle | null> {
    const vehicle = await this.prisma.companyVehicle.findUnique({
      where: { id },
    });

    return vehicle ? this.toDomain(vehicle) : null;
  }

  async findByLicensePlate(licensePlate: string): Promise<ICompanyVehicle | null> {
    const vehicle = await this.prisma.companyVehicle.findUnique({
      where: { licensePlate },
    });

    return vehicle ? this.toDomain(vehicle) : null;
  }

  async create(data: CreateCompanyVehicleInput, createdBy: string): Promise<ICompanyVehicle> {
    const createData = omitUndefined({
      licensePlate: data.licensePlate,
      vehicleType: data.vehicleType,
      brand: data.brand,
      model: data.model,
      yearOfManufacture: data.yearOfManufacture,
      vin: data.vin,
      assignedTenantId: data.assignedTenantId,
      assignedUserId: data.assignedUserId,
      registrationDocNumber: data.registrationDocNumber,
      registrationValidUntil: data.registrationValidUntil,
      technicalInspectionUntil: data.technicalInspectionUntil,
      kgfbPolicyNumber: data.kgfbPolicyNumber,
      kgfbInsurer: data.kgfbInsurer,
      kgfbValidUntil: data.kgfbValidUntil,
      cascoPolicyNumber: data.cascoPolicyNumber,
      cascoInsurer: data.cascoInsurer,
      cascoValidUntil: data.cascoValidUntil,
      highwayStickerCategory: data.highwayStickerCategory,
      highwayStickerUntil: data.highwayStickerUntil,
      notes: data.notes,
      createdBy,
    });

    const vehicle = await this.prisma.companyVehicle.create({
      data: createData as Parameters<typeof this.prisma.companyVehicle.create>[0]['data'],
    });

    return this.toDomain(vehicle);
  }

  async update(id: string, data: UpdateCompanyVehicleInput): Promise<ICompanyVehicle> {
    const updateData = omitUndefined({
      licensePlate: data.licensePlate,
      vehicleType: data.vehicleType,
      brand: data.brand,
      model: data.model,
      yearOfManufacture: data.yearOfManufacture,
      vin: data.vin,
      assignedTenantId: data.assignedTenantId,
      assignedUserId: data.assignedUserId,
      registrationDocNumber: data.registrationDocNumber,
      registrationValidUntil: data.registrationValidUntil,
      technicalInspectionUntil: data.technicalInspectionUntil,
      kgfbPolicyNumber: data.kgfbPolicyNumber,
      kgfbInsurer: data.kgfbInsurer,
      kgfbValidUntil: data.kgfbValidUntil,
      cascoPolicyNumber: data.cascoPolicyNumber,
      cascoInsurer: data.cascoInsurer,
      cascoValidUntil: data.cascoValidUntil,
      highwayStickerCategory: data.highwayStickerCategory,
      highwayStickerUntil: data.highwayStickerUntil,
      status: data.status,
      notes: data.notes,
    });

    const vehicle = await this.prisma.companyVehicle.update({
      where: { id },
      data: updateData as Parameters<typeof this.prisma.companyVehicle.update>[0]['data'],
    });

    return this.toDomain(vehicle);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.companyVehicle.delete({
      where: { id },
    });
  }

  async assign(id: string, data: AssignCompanyVehicleInput): Promise<ICompanyVehicle> {
    const assignData = omitUndefined({
      assignedTenantId: data.assignedTenantId,
      assignedUserId: data.assignedUserId,
    });

    const vehicle = await this.prisma.companyVehicle.update({
      where: { id },
      data: assignData as Parameters<typeof this.prisma.companyVehicle.update>[0]['data'],
    });

    return this.toDomain(vehicle);
  }

  async findExpiringDocuments(withinDays: number): Promise<ICompanyVehicle[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + withinDays);
    const today = new Date();

    const vehicles = await this.prisma.companyVehicle.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { technicalInspectionUntil: { lte: expiryDate, gte: today } },
          { kgfbValidUntil: { lte: expiryDate, gte: today } },
          { cascoValidUntil: { lte: expiryDate, gte: today } },
          { highwayStickerUntil: { lte: expiryDate, gte: today } },
        ],
      },
      orderBy: { technicalInspectionUntil: 'asc' },
    });

    return vehicles.map(v => this.toDomain(v));
  }
}
