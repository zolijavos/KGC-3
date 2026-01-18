/**
 * @kgc/arres - Pricing & Margin Module
 *
 * Epic 23: Pricing & Margin
 * - Story 23.1: Beszerzési Ár Tracking
 * - Story 23.2: Árrés Kalkuláció és Riport
 */

// Interfaces
export type {
  IPurchasePriceRecord,
  IProductPurchasePrice,
  IPurchasePriceHistory,
  IPurchasePriceService,
  IRecordPurchasePriceInput,
  ISupplierPriceComparison,
  IPriceChangeAlert,
} from './interfaces/purchase-price.interface';

export { PriceAveragingMethod } from './interfaces/purchase-price.interface';

export type {
  IMarginCalculation,
  IProductMarginSummary,
  ICategoryMarginSummary,
  IMarginReport,
  IMarginService,
  IMarginReportInput,
  IMarginTrendPoint,
} from './interfaces/margin.interface';

export { MarginType } from './interfaces/margin.interface';

// DTOs
export {
  RecordPurchasePriceSchema,
  GetPurchasePriceSchema,
  GetPriceHistorySchema,
  CompareSupplierPricesSchema,
  GetPriceChangeAlertsSchema,
  GetBatchPurchasePricesSchema,
} from './dto/purchase-price.dto';

export type {
  RecordPurchasePriceInput,
  GetPurchasePriceInput,
  GetPriceHistoryInput,
  CompareSupplierPricesInput,
  GetPriceChangeAlertsInput,
  GetBatchPurchasePricesInput,
} from './dto/purchase-price.dto';

export {
  CalculateMarginSchema,
  CalculateMarginsSchema,
  GetProductMarginSummarySchema,
  GetCategoryMarginSummarySchema,
  GenerateMarginReportSchema,
  ExportMarginReportSchema,
  GetTopProfitableProductsSchema,
  GetLowMarginProductsSchema,
  GetMarginTrendSchema,
} from './dto/margin.dto';

export type {
  CalculateMarginInput,
  CalculateMarginsInput,
  GetProductMarginSummaryInput,
  GetCategoryMarginSummaryInput,
  GenerateMarginReportInput,
  ExportMarginReportInput,
  GetTopProfitableProductsInput,
  GetLowMarginProductsInput,
  GetMarginTrendInput,
} from './dto/margin.dto';

// Services
export { PurchasePriceService } from './services/purchase-price.service';
export type {
  IPurchasePriceRepository,
  IProductPurchasePriceSummaryRepository,
  ISupplierRepository,
} from './services/purchase-price.service';

export { MarginService } from './services/margin.service';
export type {
  IProductRepository,
  ICategoryRepository,
  ISalesRepository,
  IPurchasePriceSummaryRepository,
  IMarginReportRepository,
  IProductInfo,
} from './services/margin.service';
