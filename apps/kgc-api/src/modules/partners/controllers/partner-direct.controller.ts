/**
 * Direct Partner Controller - Directly queries Prisma for partner data
 * Provides REST API endpoints for Partner management
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerType, PrismaClient, Partner as PrismaPartner } from '@prisma/client';

interface PartnerDTO {
  id: string;
  code: string;
  type: 'individual' | 'company';
  status: 'active' | 'inactive' | 'blocked';
  name: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  phoneAlt?: string;
  taxNumber?: string;
  euVatNumber?: string;
  country?: string;
  postalCode?: string;
  city?: string;
  address?: string;
  addressAlt?: string;
  creditLimit?: number;
  currentBalance: number;
  paymentTermDays: number;
  defaultDiscountPc: number;
  loyaltyPoints: number;
  warningNote?: string;
  notes?: string;
  categories: string[];
  addresses: Array<{
    id: string;
    type: 'billing';
    isDefault: boolean;
    country: string;
    postalCode: string;
    city: string;
    street: string;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    position?: string;
    email?: string;
    phone?: string;
    isPrimary: boolean;
  }>;
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalRentals: number;
    totalServiceOrders: number;
    outstandingBalance: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PartnerListMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

@ApiTags('partners')
@ApiBearerAuth()
@Controller('partners-direct')
export class PartnerDirectController {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {}

  @Get()
  @ApiOperation({ summary: 'List partners directly from database' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['INDIVIDUAL', 'COMPANY'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Partner list with pagination' })
  async list(
    @Headers('X-Tenant-ID') tenantId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<{
    data: PartnerDTO[];
    meta: PartnerListMeta;
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: Record<string, unknown> = { tenantId, isDeleted: false };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partnerCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { taxNumber: { contains: search } },
      ];
    }

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: pageSizeNum,
      }),
      this.prisma.partner.count({ where }),
    ]);

    const data: PartnerDTO[] = partners.map(partner => this.toDTO(partner));

    return {
      data,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: skip + partners.length < total,
      },
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get partner statistics' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiResponse({ status: 200, description: 'Partner statistics' })
  async getStats(@Headers('X-Tenant-ID') tenantId: string): Promise<{
    data: {
      total: number;
      active: number;
      companies: number;
      withBalance: number;
      totalBalance: number;
    };
  }> {
    const [total, active, companies, withBalanceResult, totalBalanceResult] = await Promise.all([
      this.prisma.partner.count({ where: { tenantId, isDeleted: false } }),
      this.prisma.partner.count({ where: { tenantId, isDeleted: false, status: 'ACTIVE' } }),
      this.prisma.partner.count({ where: { tenantId, isDeleted: false, type: 'COMPANY' } }),
      this.prisma.partner.count({
        where: { tenantId, isDeleted: false, currentBalance: { gt: 0 } },
      }),
      this.prisma.partner.aggregate({
        where: { tenantId, isDeleted: false },
        _sum: { currentBalance: true },
      }),
    ]);

    return {
      data: {
        total,
        active,
        companies,
        withBalance: withBalanceResult,
        totalBalance: Number(totalBalanceResult._sum.currentBalance ?? 0),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get partner by ID directly from database' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner details' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getById(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string
  ): Promise<{ data: PartnerDTO }> {
    const partner = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!partner) {
      throw new NotFoundException(`Partner not found: ${id}`);
    }

    return { data: this.toDTO(partner) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new partner' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiResponse({ status: 201, description: 'Partner created' })
  async create(
    @Headers('X-Tenant-ID') tenantId: string,
    @Body()
    body: {
      type: 'INDIVIDUAL' | 'COMPANY';
      name: string;
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      taxNumber?: string;
      country?: string;
      postalCode?: string;
      city?: string;
      address?: string;
      paymentTermDays?: number;
      creditLimit?: number;
      notes?: string;
    }
  ): Promise<{ data: PartnerDTO }> {
    // Generate next partner code
    const latestPartner = await this.prisma.partner.findFirst({
      where: { tenantId, partnerCode: { startsWith: 'P-' } },
      orderBy: { partnerCode: 'desc' },
      select: { partnerCode: true },
    });

    let partnerCode = 'P-0001';
    if (latestPartner?.partnerCode) {
      const numericPart = latestPartner.partnerCode.slice(2);
      const nextNum = parseInt(numericPart, 10) + 1;
      partnerCode = `P-${String(nextNum).padStart(4, '0')}`;
    }

    const partner = await this.prisma.partner.create({
      data: {
        tenantId,
        partnerCode,
        type: body.type as PartnerType,
        status: 'ACTIVE',
        name: body.name,
        companyName: body.companyName ?? null,
        contactName: body.contactName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        taxNumber: body.taxNumber ?? null,
        country: body.country ?? 'HU',
        postalCode: body.postalCode ?? null,
        city: body.city ?? null,
        address: body.address ?? null,
        paymentTermDays: body.paymentTermDays ?? 0,
        creditLimit: body.creditLimit ?? null,
        notes: body.notes ?? null,
        currentBalance: 0,
        defaultDiscountPc: 0,
        loyaltyPoints: 0,
        createdBy: 'system',
        updatedBy: 'system',
      },
    });

    return { data: this.toDTO(partner) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update partner' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner updated' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async update(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string,
    @Body()
    body: {
      type?: 'INDIVIDUAL' | 'COMPANY';
      status?: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
      name?: string;
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      taxNumber?: string;
      country?: string;
      postalCode?: string;
      city?: string;
      address?: string;
      paymentTermDays?: number;
      creditLimit?: number;
      notes?: string;
    }
  ): Promise<{ data: PartnerDTO }> {
    const existing = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Partner not found: ${id}`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.contactName !== undefined) updateData.contactName = body.contactName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.taxNumber !== undefined) updateData.taxNumber = body.taxNumber;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.paymentTermDays !== undefined) updateData.paymentTermDays = body.paymentTermDays;
    if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit;
    if (body.notes !== undefined) updateData.notes = body.notes;

    await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    const updated = await this.prisma.partner.findFirst({
      where: { id, tenantId },
    });

    return { data: this.toDTO(updated!) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete partner' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner deleted' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async delete(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.partner.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Partner not found: ${id}`);
    }

    await this.prisma.partner.updateMany({
      where: { id, tenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: 'system',
      },
    });

    return { success: true };
  }

  private toDTO(partner: PrismaPartner): PartnerDTO {
    // Map Prisma status to frontend status
    const statusMap: Record<string, 'active' | 'inactive' | 'blocked'> = {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      BLACKLISTED: 'blocked',
    };

    // Map Prisma type to frontend type
    const typeMap: Record<string, 'individual' | 'company'> = {
      INDIVIDUAL: 'individual',
      COMPANY: 'company',
    };

    // Build single address from partner fields
    const addresses: PartnerDTO['addresses'] = [];
    if (partner.city || partner.address) {
      addresses.push({
        id: `addr-${partner.id}`,
        type: 'billing',
        isDefault: true,
        country: partner.country ?? 'HU',
        postalCode: partner.postalCode ?? '',
        city: partner.city ?? '',
        street: partner.address ?? '',
      });
    }

    // Build contact from partner fields
    const contacts: PartnerDTO['contacts'] = [];
    if (partner.contactName) {
      const contact: PartnerDTO['contacts'][0] = {
        id: `contact-${partner.id}`,
        name: partner.contactName,
        isPrimary: true,
      };
      if (partner.email) contact.email = partner.email;
      if (partner.phone) contact.phone = partner.phone;
      contacts.push(contact);
    }

    // Infer categories based on type (simplified)
    const categories: string[] = [];
    if (partner.type === 'COMPANY') {
      categories.push('wholesale');
    } else {
      categories.push('retail');
    }

    const result: PartnerDTO = {
      id: partner.id,
      code: partner.partnerCode,
      type: typeMap[partner.type] ?? 'individual',
      status: statusMap[partner.status] ?? 'active',
      name: partner.name,
      currentBalance: Number(partner.currentBalance),
      paymentTermDays: partner.paymentTermDays,
      defaultDiscountPc: Number(partner.defaultDiscountPc),
      loyaltyPoints: partner.loyaltyPoints,
      categories,
      addresses,
      contacts,
      stats: {
        totalOrders: 0, // Would need to join with orders
        totalRevenue: 0, // Would need to aggregate
        totalRentals: 0, // Would need to join with rentals
        totalServiceOrders: 0, // Would need to join with worksheets
        outstandingBalance: Number(partner.currentBalance),
      },
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
    };

    // Set optional properties only if they exist
    if (partner.companyName) result.companyName = partner.companyName;
    if (partner.contactName) result.contactName = partner.contactName;
    if (partner.email) result.email = partner.email;
    if (partner.phone) result.phone = partner.phone;
    if (partner.phoneAlt) result.phoneAlt = partner.phoneAlt;
    if (partner.taxNumber) result.taxNumber = partner.taxNumber;
    if (partner.euVatNumber) result.euVatNumber = partner.euVatNumber;
    if (partner.country) result.country = partner.country;
    if (partner.postalCode) result.postalCode = partner.postalCode;
    if (partner.city) result.city = partner.city;
    if (partner.address) result.address = partner.address;
    if (partner.addressAlt) result.addressAlt = partner.addressAlt;
    if (partner.creditLimit) result.creditLimit = Number(partner.creditLimit);
    if (partner.warningNote) result.warningNote = partner.warningNote;
    if (partner.notes) result.notes = partner.notes;

    return result;
  }
}
