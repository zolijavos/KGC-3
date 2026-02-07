/**
 * Equipment Profit Response DTO
 * Epic 40: Story 40-2 - Bérgép megtérülés kalkuláció
 *
 * Response DTO for GET /bergep/:id/profit endpoint.
 * ADR-051: Bérgép Megtérülés Kalkuláció
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Profit status enum for API response
 */
export enum EquipmentProfitStatusDto {
  PROFITABLE = 'PROFITABLE',
  LOSING = 'LOSING',
  BREAK_EVEN = 'BREAK_EVEN',
  INCOMPLETE = 'INCOMPLETE',
}

/**
 * Equipment Profit Response DTO
 *
 * Contains full profitability calculation for a rental equipment.
 *
 * KÉPLET:
 * PROFIT = totalRentalRevenue - purchasePrice - totalServiceCost
 * ROI = (PROFIT / purchasePrice) × 100
 */
export class EquipmentProfitResponseDto {
  @ApiProperty({
    description: 'Equipment unique ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  equipmentId!: string;

  @ApiPropertyOptional({
    description: 'Equipment purchase price (vételár) - null if not set',
    example: 500000,
    nullable: true,
  })
  purchasePrice!: number | null;

  @ApiProperty({
    description: 'Total rental revenue from all completed rentals',
    example: 800000,
  })
  totalRentalRevenue!: number;

  @ApiProperty({
    description: 'Total service costs (non-warranty worksheets only)',
    example: 150000,
  })
  totalServiceCost!: number;

  @ApiPropertyOptional({
    description: 'Calculated profit (null if INCOMPLETE)',
    example: 150000,
    nullable: true,
  })
  profit!: number | null;

  @ApiPropertyOptional({
    description: 'Return on Investment percentage (null if INCOMPLETE)',
    example: 30.0,
    nullable: true,
  })
  roi!: number | null;

  @ApiProperty({
    description: 'Profit status',
    enum: EquipmentProfitStatusDto,
    example: 'PROFITABLE',
  })
  status!: EquipmentProfitStatusDto;

  @ApiPropertyOptional({
    description: 'Error message if status is INCOMPLETE',
    example: 'Vételár szükséges a megtérülés számításhoz',
    nullable: true,
  })
  error?: string;
}
