import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Equipment item with recurring issues
 */
export interface RecurringEquipmentItem {
  id: string;
  name: string;
  serialNumber: string;
  serviceCount: number;
  lastServiceDate: string;
  issues: string[];
  isCritical: boolean; // 5+ services
}

/**
 * Recurring Issues Response DTO
 * GET /dashboard/service/recurring-issues
 */
export interface RecurringIssuesResponseDto {
  equipment: RecurringEquipmentItem[];
  totalCount: number;
  criticalCount: number;
}

/**
 * Service History Worksheet Item
 */
export interface ServiceHistoryWorksheetItem {
  id: string;
  createdAt: string;
  completedAt: string | null;
  status: string;
  issue: string;
  resolution: string;
  isWarranty: boolean;
  laborCost: number;
  partsCost: number;
}

/**
 * Service History Response DTO
 * GET /equipment/:id/service-history
 */
export interface ServiceHistoryResponseDto {
  equipment: {
    id: string;
    name: string;
    serialNumber: string;
  };
  worksheets: ServiceHistoryWorksheetItem[];
}

/**
 * Query DTO for recurring issues endpoint
 */
export class RecurringIssuesQueryDto {
  @ApiProperty({
    description: 'Minimum number of services to be considered recurring',
    example: 3,
    required: false,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  threshold?: number;

  @ApiProperty({
    description: 'Number of days to look back for service history',
    example: 90,
    required: false,
    default: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  days?: number;
}

/**
 * Swagger DTO classes for documentation
 */
export class RecurringEquipmentItemSwagger {
  @ApiProperty({ example: 'eq-001' })
  id!: string;

  @ApiProperty({ example: 'Makita HR2470' })
  name!: string;

  @ApiProperty({ example: 'MKT-2024-001234' })
  serialNumber!: string;

  @ApiProperty({ example: 5 })
  serviceCount!: number;

  @ApiProperty({ example: '2026-02-01T10:30:00.000Z' })
  lastServiceDate!: string;

  @ApiProperty({ example: ['Szénkefe kopott', 'Motor túlmelegedés', 'Kapcsoló hiba'] })
  issues!: string[];

  @ApiProperty({ example: true })
  isCritical!: boolean;
}

export class RecurringIssuesResponseSwagger {
  @ApiProperty({ type: [RecurringEquipmentItemSwagger] })
  equipment!: RecurringEquipmentItemSwagger[];

  @ApiProperty({ example: 8 })
  totalCount!: number;

  @ApiProperty({ example: 3 })
  criticalCount!: number;
}

export class ServiceHistoryWorksheetItemSwagger {
  @ApiProperty({ example: 'ws-001' })
  id!: string;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-16T14:30:00.000Z', nullable: true })
  completedAt!: string | null;

  @ApiProperty({ example: 'COMPLETED' })
  status!: string;

  @ApiProperty({ example: 'Szénkefe kopott' })
  issue!: string;

  @ApiProperty({ example: 'Szénkefe csere + tisztítás' })
  resolution!: string;

  @ApiProperty({ example: false })
  isWarranty!: boolean;

  @ApiProperty({ example: 8500 })
  laborCost!: number;

  @ApiProperty({ example: 3200 })
  partsCost!: number;
}

export class ServiceHistoryResponseSwagger {
  @ApiProperty({
    example: { id: 'eq-001', name: 'Makita HR2470', serialNumber: 'MKT-2024-001234' },
  })
  equipment!: { id: string; name: string; serialNumber: string };

  @ApiProperty({ type: [ServiceHistoryWorksheetItemSwagger] })
  worksheets!: ServiceHistoryWorksheetItemSwagger[];
}
