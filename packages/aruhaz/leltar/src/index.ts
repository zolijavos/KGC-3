/**
 * @kgc/leltar - Stock Count Module
 *
 * Epic 24: Stock Count (Leltár)
 * - Story 24.1: Leltár Indítás
 * - Story 24.2: Leltár Rögzítés
 * - Story 24.3: Leltár Eltérés és Korrekció
 */

// Interfaces - Stock Count
export type {
  IStockCount,
  IStockCountItem,
  IStockCountService,
  ICreateStockCountInput,
  IStockCountFilter,
} from './interfaces/stock-count.interface';

export {
  StockCountStatus,
  StockCountType,
} from './interfaces/stock-count.interface';

// Interfaces - Count Recording
export type {
  ICounterSession,
  IRecordCountInput,
  IBatchCountInput,
  ICountingProgress,
  ICountRecordingService,
  ICountItemFilter,
} from './interfaces/count-recording.interface';

export { CountingMode } from './interfaces/count-recording.interface';

// Interfaces - Variance
export type {
  IVarianceDetail,
  IVarianceSummary,
  IStockAdjustment,
  IVarianceService,
} from './interfaces/variance.interface';

export {
  VarianceType,
  AdjustmentStatus,
  VarianceReasonCategory,
} from './interfaces/variance.interface';

// DTOs - Stock Count
export {
  CreateStockCountSchema,
  StockCountFilterSchema,
  SuspendStockCountSchema,
  CancelStockCountSchema,
  ToggleStockFreezeSchema,
} from './dto/stock-count.dto';

export type {
  CreateStockCountInput,
  StockCountFilterInput,
  SuspendStockCountInput,
  CancelStockCountInput,
  ToggleStockFreezeInput,
} from './dto/stock-count.dto';

// DTOs - Count Recording
export {
  StartCounterSessionSchema,
  RecordCountSchema,
  BatchCountSchema,
  CountItemFilterSchema,
  FindByBarcodeSchema,
  MarkForRecountSchema,
  UndoCountSchema,
} from './dto/count-recording.dto';

export type {
  StartCounterSessionInput,
  RecordCountInput,
  BatchCountInput,
  CountItemFilterInput,
  FindByBarcodeInput,
  MarkForRecountInput,
  UndoCountInput,
} from './dto/count-recording.dto';

// DTOs - Variance
export {
  DocumentVarianceReasonSchema,
  CreateAdjustmentSchema,
  ApproveAdjustmentSchema,
  RejectAdjustmentSchema,
  ApplyAdjustmentSchema,
  CompleteStockCountSchema,
  ExportVariancesSchema,
} from './dto/variance.dto';

export type {
  DocumentVarianceReasonInput,
  CreateAdjustmentInput,
  ApproveAdjustmentInput,
  RejectAdjustmentInput,
  ApplyAdjustmentInput,
  CompleteStockCountInput,
  ExportVariancesInput,
} from './dto/variance.dto';

// Services
export { StockCountService } from './services/stock-count.service';
export type {
  IStockCountRepository,
  IStockCountItemRepository as IStockCountItemRepoFromService,
  IInventoryQueryRepository,
  IInventoryProduct,
} from './services/stock-count.service';

export { CountRecordingService } from './services/count-recording.service';
export type {
  ICounterSessionRepository,
  IStockCountItemRepository,
  IUserRepository,
} from './services/count-recording.service';

export { VarianceService } from './services/variance.service';
export type {
  IStockAdjustmentRepository,
  IInventoryService,
  IProductRepository,
} from './services/variance.service';
