/**
 * Equipment Cost Response DTO
 * Epic 40: Story 40-1 - Bérgép vételár és ráfordítás nyilvántartás
 *
 * Response format for GET /bergep/:id/costs endpoint
 * ADR-051: Bérgép Megtérülés Kalkuláció
 */

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Per-worksheet cost breakdown item
 */
export class WorksheetCostBreakdownDto {
  @ApiProperty({ description: 'Worksheet unique ID' })
  @IsString()
  worksheetId!: string;

  @ApiProperty({ description: 'Worksheet number (ML-YYYY-NNNN)' })
  @IsString()
  worksheetNumber!: string;

  @ApiProperty({ description: 'Total cost in HUF (nettó összeg)' })
  @IsNumber()
  @Min(0)
  totalCost!: number;

  @ApiProperty({ description: 'Completion date (ISO 8601)' })
  @IsDateString()
  completedAt!: string;
}

/**
 * Equipment cost response DTO
 *
 * ÜZLETI SZABÁLY (Meeting 02-04):
 * - Garanciális munkalapok NEM számítanak ráfordításnak
 * - Csak a NEM garanciális munkalapok költségei összegződnek
 */
export class EquipmentCostResponseDto {
  @ApiProperty({ description: 'Equipment unique ID' })
  @IsString()
  equipmentId!: string;

  @ApiProperty({ description: 'Total service cost in HUF (non-warranty only)' })
  @IsNumber()
  @Min(0)
  totalServiceCost!: number;

  @ApiProperty({ description: 'Number of non-warranty worksheets' })
  @IsInt()
  @Min(0)
  worksheetCount!: number;

  @ApiProperty({ description: 'Number of warranty worksheets (excluded from cost)' })
  @IsInt()
  @Min(0)
  warrantyWorksheetCount!: number;

  @ApiProperty({
    description: 'Cost breakdown per worksheet',
    type: [WorksheetCostBreakdownDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorksheetCostBreakdownDto)
  breakdown!: WorksheetCostBreakdownDto[];

  @ApiProperty({
    description: 'Last service date (most recent non-warranty worksheet)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  lastServiceDate!: string | null;
}
