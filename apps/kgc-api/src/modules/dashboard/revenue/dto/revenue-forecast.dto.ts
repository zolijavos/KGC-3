/**
 * Revenue Forecast DTOs
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 *
 * DTOs for revenue forecast API responses.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Revenue source type */
export type RevenueSourceType = 'rental' | 'contract' | 'service';

/** Source breakdown DTO */
export class RevenueSourceBreakdownDto {
  @ApiProperty({ description: 'Source type', enum: ['rental', 'contract', 'service'] })
  type!: RevenueSourceType;

  @ApiProperty({ description: 'Display label' })
  label!: string;

  @ApiProperty({ description: 'Amount in HUF' })
  amount!: number;

  @ApiProperty({ description: 'Percentage of total (0-100)' })
  percentage!: number;

  @ApiProperty({ description: 'Number of items in source' })
  count!: number;
}

/** Month-over-month comparison DTO */
export class RevenueComparisonDto {
  @ApiProperty({ description: 'Previous month actual revenue' })
  previousMonth!: number;

  @ApiProperty({ description: 'Change amount' })
  changeAmount!: number;

  @ApiProperty({ description: 'Change percentage' })
  changePercent!: number;

  @ApiProperty({ description: 'Trend direction', enum: ['up', 'down', 'stable'] })
  trend!: 'up' | 'down' | 'stable';
}

/** Revenue forecast data */
export class RevenueForecastData {
  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt!: string;

  @ApiProperty({ description: 'Forecast month (YYYY-MM)' })
  forecastMonth!: string;

  @ApiProperty({ description: 'Total forecasted revenue in HUF' })
  totalForecast!: number;

  @ApiProperty({
    description: 'Revenue breakdown by source',
    type: [RevenueSourceBreakdownDto],
  })
  sources!: RevenueSourceBreakdownDto[];

  @ApiProperty({
    description: 'Month-over-month comparison',
    type: RevenueComparisonDto,
  })
  comparison!: RevenueComparisonDto;
}

/** Query params for forecast */
export class RevenueForecastQueryDto {
  @ApiPropertyOptional({ description: 'Forecast month (YYYY-MM format)' })
  @IsOptional()
  @IsString()
  month?: string;
}

/** API response wrapper */
export class RevenueForecastResponseDto {
  @ApiProperty({ type: RevenueForecastData })
  data!: RevenueForecastData;
}
