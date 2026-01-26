/**
 * @kgc/sales-pos - POS Controller
 * Epic 22: Story 22-1 - Értékesítés kasszából
 *
 * Endpoints:
 *   - Session: Kassza nyitás/zárás
 *   - Transaction: Értékesítési tranzakció kezelés
 *   - Cart Items: Tétel hozzáadás/módosítás/törlés
 */

import { JwtAuthGuard, type JwtUser } from '@kgc/common';
import {
  AddItemDto,
  AddPartialPaymentDto,
  CloseSessionDto,
  CreateTransactionDto,
  OpenSessionDto,
  PaymentService,
  ProcessCashPaymentDto,
  SessionService,
  SetCustomerDto,
  SuspendSessionDto,
  TransactionService,
  UpdateItemDto,
  VoidTransactionDto,
} from '@kgc/sales-pos';
import {
  Body,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// CurrentUser decorator - extracts user from JWT
const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  }
);

// CurrentTenant decorator - extracts tenantId from authenticated user
const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
  return request.user?.tenantId ?? '';
});

// ============================================
// SESSION CONTROLLER (Kassza kezelés)
// ============================================

@ApiTags('pos-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pos/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: 'Open cash register session (kassza nyitás)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['locationId', 'openingBalance'],
      properties: {
        locationId: { type: 'string', format: 'uuid', description: 'Location/Store ID' },
        openingBalance: { type: 'number', description: 'Opening balance in HUF' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Session opened successfully' })
  @ApiResponse({ status: 400, description: 'Location already has open session' })
  async openSession(
    @Body() dto: OpenSessionDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser
  ) {
    return this.sessionService.openSession(dto, tenantId, user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current open session for location' })
  @ApiResponse({ status: 200, description: 'Current session or null' })
  async getCurrentSession(
    @Query('locationId') locationId: string,
    @CurrentTenant() tenantId: string
  ) {
    if (!locationId) {
      return { error: 'locationId query parameter is required' };
    }
    return this.sessionService.getCurrentSession(locationId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Session details' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.sessionService.getSessionById(id, tenantId);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend session (temporary pause)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for suspension' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Session suspended' })
  async suspendSession(
    @Param('id') id: string,
    @Body() dto: SuspendSessionDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser
  ) {
    return this.sessionService.suspendSession(id, dto.reason, tenantId, user.id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume suspended session' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Session resumed' })
  async resumeSession(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser
  ) {
    return this.sessionService.resumeSession(id, tenantId, user.id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close session (kassza zárás)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['closingBalance'],
      properties: {
        closingBalance: { type: 'number', description: 'Counted closing balance in HUF' },
        varianceNote: { type: 'string', description: 'Note if variance exists' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Session closed with variance calculated' })
  async closeSession(
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser
  ) {
    return this.sessionService.closeSession(id, dto, tenantId, user.id);
  }
}

// ============================================
// TRANSACTION CONTROLLER (Tranzakció kezelés)
// ============================================

@ApiTags('pos-transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pos/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create new sale transaction' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string', format: 'uuid', description: 'Cash register session ID' },
        customerId: { type: 'string', format: 'uuid', description: 'Optional customer ID' },
        customerName: { type: 'string', description: 'Optional customer name' },
        customerTaxNumber: { type: 'string', description: 'Optional tax number for invoice' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Transaction created with number ELADAS-YYYY-NNNN' })
  async createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser
  ) {
    return this.transactionService.createTransaction(dto, tenantId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transactionService.getTransactionById(id, tenantId);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get transaction items' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of sale items' })
  async getTransactionItems(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.transactionService.getTransactionItems(id, tenantId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to transaction' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['productId', 'productCode', 'productName', 'quantity', 'unitPrice', 'taxRate'],
      properties: {
        productId: { type: 'string', format: 'uuid' },
        productCode: { type: 'string', description: 'Product SKU' },
        productName: { type: 'string' },
        quantity: { type: 'number', minimum: 0.001 },
        unitPrice: { type: 'number', minimum: 0, description: 'Net unit price in HUF' },
        taxRate: { type: 'number', enum: [0, 5, 18, 27], description: 'Hungarian VAT rate' },
        discountPercent: { type: 'number', minimum: 0, maximum: 100, default: 0 },
        warehouseId: { type: 'string', format: 'uuid', description: 'Source warehouse' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Item added with line totals calculated' })
  async addItem(
    @Param('id') transactionId: string,
    @Body() dto: AddItemDto,
    @CurrentTenant() tenantId: string
  ) {
    return this.transactionService.addItem(transactionId, dto, tenantId);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update item quantity or discount' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', minimum: 0.001 },
        discountPercent: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Item updated with recalculated totals' })
  async updateItem(
    @Param('id') transactionId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
    @CurrentTenant() tenantId: string
  ) {
    return this.transactionService.updateItem(transactionId, itemId, dto, tenantId);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from transaction' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Item removed' })
  async removeItem(
    @Param('id') transactionId: string,
    @Param('itemId') itemId: string,
    @CurrentTenant() tenantId: string
  ) {
    return this.transactionService.removeItem(transactionId, itemId, tenantId);
  }

  @Patch(':id/customer')
  @ApiOperation({ summary: 'Set or update customer on transaction' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        customerId: { type: 'string', format: 'uuid' },
        customerName: { type: 'string' },
        customerTaxNumber: { type: 'string', description: 'Tax number for invoice' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Customer updated on transaction' })
  async setCustomer(
    @Param('id') transactionId: string,
    @Body() dto: SetCustomerDto,
    @CurrentTenant() tenantId: string
  ) {
    return this.transactionService.setCustomer(transactionId, dto, tenantId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete transaction (move to payment)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transaction ready for payment' })
  @ApiResponse({ status: 400, description: 'Transaction has no items' })
  async completeTransaction(@Param('id') transactionId: string, @CurrentTenant() tenantId: string) {
    return this.transactionService.completeTransaction(transactionId, tenantId);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void transaction (sztornó)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', description: 'Reason for voiding' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Transaction voided' })
  @ApiResponse({ status: 400, description: 'Cannot void completed transaction' })
  async voidTransaction(
    @Param('id') transactionId: string,
    @Body() dto: VoidTransactionDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser
  ) {
    return this.transactionService.voidTransaction(transactionId, dto, tenantId, user.id);
  }
}

// ============================================
// PAYMENT CONTROLLER (Fizetés kezelés)
// Epic 22: Story 22-2
// ============================================

@ApiTags('pos-payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pos/transactions')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get payments for transaction' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async getPayments(@Param('id') transactionId: string, @CurrentTenant() tenantId: string) {
    return this.paymentService.getPayments(transactionId, tenantId);
  }

  @Post(':id/payments/cash')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process cash payment' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['receivedAmount'],
      properties: {
        receivedAmount: { type: 'number', description: 'Cash received from customer in HUF' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cash payment processed with change calculated' })
  @ApiResponse({ status: 400, description: 'Insufficient payment or invalid transaction status' })
  async processCashPayment(
    @Param('id') transactionId: string,
    @Body() dto: ProcessCashPaymentDto,
    @CurrentTenant() tenantId: string
  ) {
    return this.paymentService.processCashPayment(transactionId, dto, tenantId);
  }

  @Post(':id/payments/card')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process card payment via MyPos' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Card payment processed' })
  @ApiResponse({ status: 400, description: 'Card declined or invalid transaction status' })
  async processCardPayment(@Param('id') transactionId: string, @CurrentTenant() tenantId: string) {
    return this.paymentService.processCardPayment(transactionId, tenantId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Add partial payment (for mixed payments)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['method', 'amount'],
      properties: {
        method: {
          type: 'string',
          enum: ['CASH', 'CARD', 'TRANSFER', 'VOUCHER', 'CREDIT'],
          description: 'Payment method',
        },
        amount: { type: 'number', description: 'Payment amount in HUF' },
        cardTransactionId: { type: 'string', description: 'Card transaction ID (for CARD)' },
        cardLastFour: { type: 'string', description: 'Last 4 digits of card' },
        cardBrand: { type: 'string', description: 'Card brand (VISA, MC, etc.)' },
        transferReference: { type: 'string', description: 'Bank transfer reference' },
        voucherCode: { type: 'string', description: 'Voucher/coupon code' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Partial payment added' })
  @ApiResponse({ status: 400, description: 'Amount exceeds remaining balance' })
  async addPartialPayment(
    @Param('id') transactionId: string,
    @Body() dto: AddPartialPaymentDto,
    @CurrentTenant() tenantId: string
  ) {
    return this.paymentService.addPartialPayment(transactionId, dto, tenantId);
  }

  @Post(':id/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize payment and deduct inventory' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Transaction finalized, inventory deducted' })
  @ApiResponse({ status: 400, description: 'Transaction not fully paid' })
  async finalizePayment(@Param('id') transactionId: string, @CurrentTenant() tenantId: string) {
    return this.paymentService.completePayment(transactionId, tenantId);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund all payments (for voided transactions)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'All payments refunded' })
  @ApiResponse({ status: 400, description: 'Transaction is not voided' })
  async refundPayments(@Param('id') transactionId: string, @CurrentTenant() tenantId: string) {
    return this.paymentService.refundPayments(transactionId, tenantId);
  }
}
