/**
 * MSW Handlers for POS API
 * Mock handlers for testing POS functionality
 */

import type {
  CashRegisterSession,
  CashRegisterStatus,
  PaymentMethod,
  PaymentStatus,
  POSProduct,
  SalePayment,
  SaleStatus,
  SaleTransaction,
  ZReport,
} from '@/types/pos.types';
import { http, HttpResponse } from 'msw';

const API_BASE = '/api/v1/pos';

// ============================================
// Mock Data Factories
// ============================================

let sessionIdCounter = 1;
let transactionIdCounter = 1;

export function createMockSession(overrides?: Partial<CashRegisterSession>): CashRegisterSession {
  const id = `session-${sessionIdCounter++}`;
  return {
    id,
    tenantId: 'tenant-1',
    locationId: 'location-1',
    sessionNumber: `KASSZA-2026-${String(sessionIdCounter).padStart(4, '0')}`,
    openedAt: new Date().toISOString(),
    closedAt: null,
    openingBalance: 50000,
    closingBalance: null,
    expectedBalance: null,
    variance: null,
    varianceNote: null,
    openedBy: 'user-1',
    closedBy: null,
    status: 'OPEN' as CashRegisterStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockTransaction(overrides?: Partial<SaleTransaction>): SaleTransaction {
  const id = `transaction-${transactionIdCounter++}`;
  return {
    id,
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    transactionNumber: `ELADAS-2026-${String(transactionIdCounter).padStart(4, '0')}`,
    customerId: null,
    customerName: null,
    customerTaxNumber: null,
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    total: 0,
    paymentStatus: 'PENDING' as PaymentStatus,
    paidAmount: 0,
    changeAmount: 0,
    invoiceId: null,
    receiptNumber: null,
    status: 'IN_PROGRESS' as SaleStatus,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    completedAt: null,
    items: [],
    payments: [],
    ...overrides,
  };
}

export function createMockProduct(overrides?: Partial<POSProduct>): POSProduct {
  return {
    id: 'product-1',
    sku: 'SKU-001',
    name: 'Test Product',
    barcode: '5901234123457',
    category: 'Test Category',
    price: 1000,
    vatRate: 27,
    stock: 100,
    unit: 'db',
    ...overrides,
  };
}

export function createMockZReport(overrides?: Partial<ZReport>): ZReport {
  return {
    sessionId: 'session-1',
    sessionNumber: 'KASSZA-2026-0001',
    openedAt: new Date().toISOString(),
    closedAt: new Date().toISOString(),
    openingBalance: 50000,
    closingBalance: 75000,
    expectedBalance: 75000,
    variance: 0,
    varianceApproved: false,
    varianceNote: null,
    totalTransactions: 10,
    completedTransactions: 9,
    voidedTransactions: 1,
    cashTotal: 15000,
    cardTotal: 8000,
    transferTotal: 2000,
    voucherTotal: 0,
    creditTotal: 0,
    grossSales: 27000,
    discounts: 2000,
    netSales: 25000,
    taxCollected: 5400,
    changeGiven: 500,
    ...overrides,
  };
}

// ============================================
// In-Memory Store for Mock State
// ============================================

let mockCurrentSession: CashRegisterSession | null = null;
let mockTransactions: Map<string, SaleTransaction> = new Map();

export function resetMockState() {
  mockCurrentSession = null;
  mockTransactions.clear();
  sessionIdCounter = 1;
  transactionIdCounter = 1;
}

// ============================================
// MSW Handlers
// ============================================

export const posHandlers = [
  // ============================================
  // Session Handlers
  // ============================================

  // GET /api/v1/pos/sessions/current
  http.get(`${API_BASE}/sessions/current`, ({ request }) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get('locationId');

    if (!mockCurrentSession || mockCurrentSession.locationId !== locationId) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No active session' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: mockCurrentSession });
  }),

  // POST /api/v1/pos/sessions
  http.post(`${API_BASE}/sessions`, async ({ request }) => {
    const body = (await request.json()) as { locationId: string; openingBalance: number };

    if (mockCurrentSession && mockCurrentSession.status === 'OPEN') {
      return HttpResponse.json(
        {
          error: {
            code: 'SESSION_ACTIVE',
            message: 'A session is already active for this location',
          },
        },
        { status: 400 }
      );
    }

    mockCurrentSession = createMockSession({
      locationId: body.locationId,
      openingBalance: body.openingBalance,
    });

    return HttpResponse.json({ data: mockCurrentSession });
  }),

  // POST /api/v1/pos/sessions/:id/suspend
  http.post(`${API_BASE}/sessions/:id/suspend`, async ({ params }) => {
    if (!mockCurrentSession || mockCurrentSession.id !== params.id) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    mockCurrentSession = {
      ...mockCurrentSession,
      status: 'SUSPENDED' as CashRegisterStatus,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: mockCurrentSession });
  }),

  // POST /api/v1/pos/sessions/:id/resume
  http.post(`${API_BASE}/sessions/:id/resume`, async ({ params }) => {
    if (!mockCurrentSession || mockCurrentSession.id !== params.id) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    mockCurrentSession = {
      ...mockCurrentSession,
      status: 'OPEN' as CashRegisterStatus,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: mockCurrentSession });
  }),

  // POST /api/v1/pos/sessions/:id/close
  http.post(`${API_BASE}/sessions/:id/close`, async ({ params, request }) => {
    if (!mockCurrentSession || mockCurrentSession.id !== params.id) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { closingBalance: number; varianceNote?: string };

    const zReport = createMockZReport({
      sessionId: mockCurrentSession.id,
      sessionNumber: mockCurrentSession.sessionNumber,
      openedAt: mockCurrentSession.openedAt,
      openingBalance: mockCurrentSession.openingBalance,
      closingBalance: body.closingBalance,
      variance: body.closingBalance - (mockCurrentSession.openingBalance + 25000), // mock expected
      varianceNote: body.varianceNote ?? null,
    });

    mockCurrentSession = {
      ...mockCurrentSession,
      status: 'CLOSED' as CashRegisterStatus,
      closedAt: new Date().toISOString(),
      closingBalance: body.closingBalance,
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: zReport });
  }),

  // GET /api/v1/pos/sessions/:id/summary
  http.get(`${API_BASE}/sessions/:id/summary`, ({ params }) => {
    if (!mockCurrentSession || mockCurrentSession.id !== params.id) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    const zReport = createMockZReport({
      sessionId: mockCurrentSession.id,
      sessionNumber: mockCurrentSession.sessionNumber,
    });

    return HttpResponse.json({ data: zReport });
  }),

  // ============================================
  // Transaction Handlers
  // ============================================

  // POST /api/v1/pos/transactions
  http.post(`${API_BASE}/transactions`, async ({ request }) => {
    const body = (await request.json()) as { sessionId: string; customerId?: string };

    const transaction = createMockTransaction({
      sessionId: body.sessionId,
      customerId: body.customerId ?? null,
    });

    mockTransactions.set(transaction.id, transaction);
    return HttpResponse.json({ data: transaction });
  }),

  // GET /api/v1/pos/transactions/:id
  http.get(`${API_BASE}/transactions/:id`, ({ params }) => {
    const transaction = mockTransactions.get(params.id as string);

    if (!transaction) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: transaction });
  }),

  // POST /api/v1/pos/transactions/:id/items
  http.post(`${API_BASE}/transactions/:id/items`, async ({ params, request }) => {
    const transaction = mockTransactions.get(params.id as string);

    if (!transaction) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    };

    const lineSubtotal = body.quantity * body.unitPrice;
    const lineTax = lineSubtotal * (body.taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    const newItem = {
      id: `item-${Date.now()}`,
      transactionId: transaction.id,
      tenantId: transaction.tenantId,
      productId: body.productId,
      productCode: body.productCode,
      productName: body.productName,
      quantity: body.quantity,
      unitPrice: body.unitPrice,
      taxRate: body.taxRate,
      discountPercent: 0,
      lineSubtotal,
      lineTax,
      lineTotal,
      inventoryDeducted: false,
      warehouseId: null,
    };

    const updatedTransaction = {
      ...transaction,
      items: [...transaction.items, newItem],
      subtotal: transaction.subtotal + lineSubtotal,
      taxAmount: transaction.taxAmount + lineTax,
      total: transaction.total + lineTotal,
    };

    mockTransactions.set(transaction.id, updatedTransaction);
    return HttpResponse.json({ data: updatedTransaction });
  }),

  // POST /api/v1/pos/transactions/:id/void
  http.post(`${API_BASE}/transactions/:id/void`, async ({ params, request }) => {
    const transaction = mockTransactions.get(params.id as string);

    if (!transaction) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { reason: string };

    const updatedTransaction = {
      ...transaction,
      status: 'VOIDED' as SaleStatus,
      voidedAt: new Date().toISOString(),
      voidedBy: 'user-1',
      voidReason: body.reason,
    };

    mockTransactions.set(transaction.id, updatedTransaction);
    return HttpResponse.json({ data: updatedTransaction });
  }),

  // ============================================
  // Payment Handlers
  // ============================================

  // POST /api/v1/pos/transactions/:id/payments/cash
  http.post(`${API_BASE}/transactions/:id/payments/cash`, async ({ params, request }) => {
    const transaction = mockTransactions.get(params.id as string);

    if (!transaction) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { receivedAmount: number };
    const changeAmount = Math.max(0, body.receivedAmount - transaction.total);

    const payment: SalePayment = {
      id: `payment-${Date.now()}`,
      transactionId: transaction.id,
      tenantId: transaction.tenantId,
      method: 'CASH' as PaymentMethod,
      amount: transaction.total,
      cardTransactionId: null,
      cardLastFour: null,
      cardBrand: null,
      transferReference: null,
      voucherCode: null,
      receivedAt: new Date().toISOString(),
    };

    const updatedTransaction = {
      ...transaction,
      payments: [...transaction.payments, payment],
      paidAmount: transaction.total,
      changeAmount,
      paymentStatus: 'PAID' as PaymentStatus,
      status: 'COMPLETED' as SaleStatus,
      completedAt: new Date().toISOString(),
    };

    mockTransactions.set(transaction.id, updatedTransaction);

    return HttpResponse.json({
      data: {
        payment,
        changeAmount,
        transaction: updatedTransaction,
      },
    });
  }),

  // POST /api/v1/pos/transactions/:id/payments/card
  http.post(`${API_BASE}/transactions/:id/payments/card`, async ({ params, request }) => {
    const transaction = mockTransactions.get(params.id as string);

    if (!transaction) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { amount: number };

    const payment: SalePayment = {
      id: `payment-${Date.now()}`,
      transactionId: transaction.id,
      tenantId: transaction.tenantId,
      method: 'CARD' as PaymentMethod,
      amount: body.amount,
      cardTransactionId: `MYPOS-${Date.now()}`,
      cardLastFour: '4242',
      cardBrand: 'VISA',
      transferReference: null,
      voucherCode: null,
      receivedAt: new Date().toISOString(),
    };

    const updatedTransaction = {
      ...transaction,
      payments: [...transaction.payments, payment],
      paidAmount: transaction.paidAmount + body.amount,
      paymentStatus:
        transaction.paidAmount + body.amount >= transaction.total
          ? ('PAID' as PaymentStatus)
          : ('PARTIAL' as PaymentStatus),
      status:
        transaction.paidAmount + body.amount >= transaction.total
          ? ('COMPLETED' as SaleStatus)
          : transaction.status,
      completedAt:
        transaction.paidAmount + body.amount >= transaction.total ? new Date().toISOString() : null,
    };

    mockTransactions.set(transaction.id, updatedTransaction);

    return HttpResponse.json({
      data: {
        payment,
        transaction: updatedTransaction,
        cardTransactionId: payment.cardTransactionId,
        cardLastFour: payment.cardLastFour,
        cardBrand: payment.cardBrand,
      },
    });
  }),

  // POST /api/v1/pos/transactions/:id/complete
  http.post(`${API_BASE}/transactions/:id/complete`, async ({ params }) => {
    const transaction = mockTransactions.get(params.id as string);

    if (!transaction) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    const updatedTransaction = {
      ...transaction,
      status: 'COMPLETED' as SaleStatus,
      completedAt: new Date().toISOString(),
    };

    mockTransactions.set(transaction.id, updatedTransaction);
    return HttpResponse.json({ data: updatedTransaction });
  }),

  // ============================================
  // Product Handlers
  // ============================================

  // GET /api/v1/products
  http.get('/api/v1/products', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const barcode = url.searchParams.get('barcode');

    const products: POSProduct[] = [
      createMockProduct({
        id: 'p1',
        name: 'Makita fúró',
        sku: 'MAK-001',
        barcode: '5901234123457',
        price: 25000,
      }),
      createMockProduct({
        id: 'p2',
        name: 'Bosch csiszológép',
        sku: 'BOS-002',
        barcode: '5901234123458',
        price: 18000,
      }),
      createMockProduct({
        id: 'p3',
        name: 'DeWalt akkumulátor',
        sku: 'DEW-003',
        barcode: '5901234123459',
        price: 15000,
      }),
    ];

    let filtered = products;

    if (barcode) {
      filtered = products.filter(p => p.barcode === barcode);
    } else if (search) {
      filtered = products.filter(
        p => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
      );
    }

    return HttpResponse.json({
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 10,
    });
  }),
];

export default posHandlers;
