/**
 * Direct Rental Controller - Directly queries Prisma for rental data
 * Temporary solution until RentalService is refactored to use repository
 */

import { Controller, Get, Headers, Inject, NotFoundException, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaClient, Rental as PrismaRental, RentalStatus } from '@prisma/client';

interface RentalDTO {
  id: string;
  rentalCode: string;
  status: string;
  customerId: string;
  customerName: string;
  equipmentId: string;
  equipmentName: string;
  startDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  dailyRate: number;
  totalAmount: number;
  depositAmount: number;
  depositPaid: number;
  depositReturned: number;
  lateFeeAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

@ApiTags('rentals')
@ApiBearerAuth()
@Controller('rentals-direct')
export class RentalDirectController {
  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {}

  @Get()
  @ApiOperation({ summary: 'List rentals directly from database' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiQuery({ name: 'status', required: false, enum: RentalStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Rental list with pagination' })
  async list(
    @Headers('X-Tenant-ID') tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<{
    data: RentalDTO[];
    meta: { total: number; page: number; pageSize: number; hasMore: boolean };
  }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: Record<string, unknown> = { tenantId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { rentalCode: { contains: search, mode: 'insensitive' } },
        { partner: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [rentals, total] = await Promise.all([
      this.prisma.rental.findMany({
        where,
        include: {
          partner: { select: { id: true, name: true } },
          items: {
            include: {
              equipment: {
                select: {
                  id: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSizeNum,
      }),
      this.prisma.rental.count({ where }),
    ]);

    const data: RentalDTO[] = rentals.map(rental => this.toDTO(rental));

    return {
      data,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: skip + rentals.length < total,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental by ID directly from database' })
  @ApiHeader({ name: 'X-Tenant-ID', required: true })
  @ApiParam({ name: 'id', description: 'Rental ID' })
  @ApiResponse({ status: 200, description: 'Rental details' })
  @ApiResponse({ status: 404, description: 'Rental not found' })
  async getById(
    @Headers('X-Tenant-ID') tenantId: string,
    @Param('id') id: string
  ): Promise<{ data: RentalDTO }> {
    const rental = await this.prisma.rental.findFirst({
      where: { id, tenantId },
      include: {
        partner: { select: { id: true, name: true } },
        items: {
          include: {
            equipment: {
              select: {
                id: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!rental) {
      throw new NotFoundException(`Rental not found: ${id}`);
    }

    return { data: this.toDTO(rental) };
  }

  private toDTO(
    rental: PrismaRental & {
      partner?: { id: string; name: string };
      items?: Array<{ equipment: { id: string; product: { name: string } } }>;
    }
  ): RentalDTO {
    const firstItem = rental.items?.[0];
    const equipmentName = firstItem?.equipment?.product?.name ?? 'Ismeretlen gép';
    const equipmentId = firstItem?.equipment?.id ?? '';

    const result: RentalDTO = {
      id: rental.id,
      rentalCode: rental.rentalCode,
      status: rental.status,
      customerId: rental.partnerId,
      customerName: rental.partner?.name ?? 'Ismeretlen partner',
      equipmentId,
      equipmentName,
      startDate: rental.startDate.toISOString(),
      expectedReturnDate: rental.expectedEnd.toISOString(),
      dailyRate:
        Number(rental.subtotal) /
        Math.max(1, this.getDaysBetween(rental.startDate, rental.expectedEnd)),
      totalAmount: Number(rental.grandTotal),
      depositAmount: Number(rental.depositRequired),
      depositPaid: Number(rental.depositPaid),
      depositReturned: Number(rental.depositReturned),
      lateFeeAmount: Number(rental.lateFeeAmount),
      createdAt: rental.createdAt.toISOString(),
      updatedAt: rental.updatedAt.toISOString(),
    };

    if (rental.actualEnd) {
      result.actualReturnDate = rental.actualEnd.toISOString();
    }
    if (rental.notes) {
      result.notes = rental.notes;
    }

    return result;
  }

  private getDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
