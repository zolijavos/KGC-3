/**
 * @kgc/sales-pos - Point of Sale Module
 * Epic 22: Point of Sale - Story 22-1, 22-2, 22-3
 */

// Module
export { SalesPosModule } from './sales-pos.module.js';

// Services
export { CartService } from './services/cart.service.js';
export { PaymentService } from './services/payment.service.js';
export { SessionService } from './services/session.service.js';
export { TransactionService } from './services/transaction.service.js';
export { ZReportService } from './services/z-report.service.js';

// Audit Service Interface (shared between SessionService and TransactionService)
export type { IAuditService } from './services/session.service.js';

// Interfaces - Session
export { CashRegisterStatus } from './interfaces/session.interface.js';
export type {
  ICashRegisterSession,
  ISessionCreateResult,
  ISessionRepository,
} from './interfaces/session.interface.js';

// Interfaces - Transaction
export { PaymentStatus, SaleStatus } from './interfaces/transaction.interface.js';
export type {
  ISaleItem,
  ISaleItemRepository,
  ISaleTransaction,
  ITransactionCreateResult,
  ITransactionRepository,
} from './interfaces/transaction.interface.js';

// Interfaces - Payment (Story 22-2)
export { PaymentMethod } from './interfaces/payment.interface.js';
export type {
  ICardPaymentResult,
  ICashPaymentResult,
  IInventoryDeductionResult,
  IInventoryService,
  IMyPosService,
  IPaymentCreateResult,
  IPaymentRepository,
  ISalePayment,
} from './interfaces/payment.interface.js';

// Interfaces - Z-Report (Story 22-3)
export type {
  ICompanyInfo,
  IPaymentMethodBreakdown,
  IPdfGeneratorService,
  IZReport,
  IZReportGenerateResult,
  IZReportSummary,
} from './interfaces/z-report.interface.js';

// DTOs - Session
export { CloseSessionSchema, OpenSessionSchema, SuspendSessionSchema } from './dto/session.dto.js';
export type { CloseSessionDto, OpenSessionDto, SuspendSessionDto } from './dto/session.dto.js';

// DTOs - Transaction
export {
  AddItemSchema,
  CreateTransactionSchema,
  SetCustomerSchema,
  UpdateItemSchema,
  VoidTransactionSchema,
} from './dto/transaction.dto.js';
export type {
  AddItemDto,
  CreateTransactionDto,
  SetCustomerDto,
  UpdateItemDto,
  VoidTransactionDto,
} from './dto/transaction.dto.js';

// DTOs - Cart
export { CartItemSchema, UpdateCartItemSchema, VALID_TAX_RATES } from './dto/cart.dto.js';
export type {
  CartItemDto,
  ICartItem,
  ICartTotals,
  TaxRate,
  UpdateCartItemDto,
} from './dto/cart.dto.js';

// DTOs - Payment (Story 22-2)
export {
  AddPartialPaymentSchema,
  FinalizePaymentSchema,
  PAYMENT_CONSTANTS,
  ProcessCardPaymentSchema,
  ProcessCashPaymentSchema,
  RefundPaymentSchema,
} from './dto/payment.dto.js';
export type {
  AddPartialPaymentDto,
  FinalizePaymentDto,
  ProcessCardPaymentDto,
  ProcessCashPaymentDto,
  RefundPaymentDto,
} from './dto/payment.dto.js';

// DTOs - Z-Report (Story 22-3)
export {
  ApproveVarianceSchema,
  ExportZReportJsonSchema,
  ExportZReportPdfSchema,
  RejectVarianceSchema,
} from './dto/z-report.dto.js';
export type {
  ApproveVarianceDto,
  ExportZReportJsonDto,
  ExportZReportPdfDto,
  RejectVarianceDto,
} from './dto/z-report.dto.js';

// Note: Prisma repositories should be implemented in apps/kgc-api/src/modules/pos/
// where PrismaClient is available. Use the repository interfaces from interfaces/.
