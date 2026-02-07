/**
 * Equipment Rental History Response DTO
 * Epic 40: Story 40-3 - Bérgép előzmények fül
 *
 * Response DTO for GET /bergep/:id/rental-history endpoint.
 * ADR-051: Bérgép Megtérülés Kalkuláció
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single rental history item
 */
export class RentalHistoryItemDto {
  @ApiProperty({
    description: 'Rental unique ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  rentalId!: string;

  @ApiProperty({
    description: 'Rental code',
    example: 'B-2026-00123',
  })
  rentalCode!: string;

  @ApiProperty({
    description: 'Partner (customer) name',
    example: 'Kis Péter',
  })
  partnerName!: string;

  @ApiProperty({
    description: 'Partner ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  partnerId!: string;

  @ApiProperty({
    description: 'Rental start date (ISO format)',
    example: '2026-01-10',
  })
  startDate!: string;

  @ApiProperty({
    description: 'Expected end date (ISO format)',
    example: '2026-01-15',
  })
  expectedEnd!: string;

  @ApiPropertyOptional({
    description: 'Actual end date (ISO format) - null if not returned',
    example: '2026-01-14',
    nullable: true,
  })
  actualEnd!: string | null;

  @ApiPropertyOptional({
    description: 'Issued by user name - who gave out the equipment',
    example: 'Zoli',
    nullable: true,
  })
  issuedByName!: string | null;

  @ApiPropertyOptional({
    description: 'Returned by user name - who took back the equipment',
    example: 'Zsuzsi',
    nullable: true,
  })
  returnedByName!: string | null;

  @ApiProperty({
    description: 'Item total amount (for this equipment in this rental)',
    example: 45000,
  })
  itemTotal!: number;

  @ApiProperty({
    description: 'Rental status',
    example: 'COMPLETED',
  })
  status!: string;
}

/**
 * Equipment Rental History Response
 */
export class EquipmentRentalHistoryResponseDto {
  @ApiProperty({
    description: 'Equipment ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  equipmentId!: string;

  @ApiProperty({
    description: 'Total number of rentals for this equipment',
    example: 15,
  })
  totalRentals!: number;

  @ApiPropertyOptional({
    description: 'Last renter name (most recent rental)',
    example: 'Nagy János',
    nullable: true,
  })
  lastRenterName!: string | null;

  @ApiProperty({
    description: 'Number of related worksheets (service records)',
    example: 3,
  })
  worksheetCount!: number;

  @ApiProperty({
    description: 'Rental history items (sorted by date, newest first)',
    type: [RentalHistoryItemDto],
  })
  rentals!: RentalHistoryItemDto[];

  @ApiProperty({
    description: 'Pagination: current page (1-based)',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Pagination: items per page',
    example: 20,
  })
  pageSize!: number;

  @ApiProperty({
    description: 'Pagination: total pages',
    example: 3,
  })
  totalPages!: number;
}
