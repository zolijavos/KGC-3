/**
 * @kgc/sales-pos - Point of Sale Module
 *
 * Epic 22: Point of Sale
 * - Story 22.1: Értékesítés Kasszából
 * - Story 22.2: Fizetési Módok
 * - Story 22.3: Napi Pénztárzárás
 */

// Interfaces
export type {
  IPosTransaction,
  IPosTransactionService,
  ICartItem,
  IPaymentItem,
  IStockReservation,
  ICreateTransactionInput,
  IAddItemInput,
  IAddPaymentInput,
} from './interfaces/pos-transaction.interface';

export {
  TransactionStatus,
  PaymentMethod,
} from './interfaces/pos-transaction.interface';

export type {
  IPaymentTransaction,
  IPaymentService,
  ICashPaymentDetails,
  ICardPaymentDetails,
  ITransferPaymentDetails,
  IVoucherPaymentDetails,
  IMixedPaymentSummary,
  IMyPosIntegration,
} from './interfaces/payment.interface';

export {
  CardType,
  PaymentStatus,
} from './interfaces/payment.interface';

export type {
  ICashRegisterSession,
  IDailyCashReport,
  IDailyPaymentSummary,
  IDenominationCount,
  ICashCountInput,
  ICashReconciliationService,
  IOpenRegisterInput,
} from './interfaces/cash-reconciliation.interface';

export {
  RegisterStatus,
  VarianceType,
} from './interfaces/cash-reconciliation.interface';

// DTOs
export {
  CreateTransactionSchema,
  AddItemSchema,
  UpdateQuantitySchema,
  ApplyDiscountSchema,
  AddPaymentSchema,
  TransactionFilterSchema,
  CancelTransactionSchema,
} from './dto/pos-transaction.dto';

export type {
  CreateTransactionInput,
  AddItemInput,
  UpdateQuantityInput,
  ApplyDiscountInput,
  AddPaymentInput,
  TransactionFilterInput,
  CancelTransactionInput,
} from './dto/pos-transaction.dto';

export {
  CashPaymentSchema,
  CardPaymentInitSchema,
  CardPaymentCallbackSchema,
  TransferPaymentSchema,
  VoucherRedeemSchema,
  MixedPaymentSchema,
  RefundPaymentSchema,
} from './dto/payment.dto';

export type {
  CashPaymentInput,
  CardPaymentInitInput,
  CardPaymentCallbackInput,
  TransferPaymentInput,
  VoucherRedeemInput,
  MixedPaymentInput,
  RefundPaymentInput,
} from './dto/payment.dto';

export {
  OpenRegisterSchema,
  DenominationCountSchema,
  CashCountSchema,
  DocumentVarianceSchema,
  InitiateClosingSchema,
  ApproveReportSchema,
  MonthlySummaryFilterSchema,
  DailyReportFilterSchema,
} from './dto/cash-reconciliation.dto';

export type {
  OpenRegisterInput,
  DenominationCountInput,
  CashCountInput as CashCountDtoInput,
  DocumentVarianceInput,
  InitiateClosingInput,
  ApproveReportInput,
  MonthlySummaryFilterInput,
  DailyReportFilterInput,
} from './dto/cash-reconciliation.dto';

// Services
export { PosTransactionService } from './services/pos-transaction.service';
export type {
  IPosTransactionRepository,
  IProductService,
  IInventoryService,
  IProductInfo,
} from './services/pos-transaction.service';

export { CashReconciliationService } from './services/cash-reconciliation.service';
export type {
  ICashRegisterSessionRepository,
  IDailyReportRepository,
  IPosTransactionQueryRepository,
} from './services/cash-reconciliation.service';
