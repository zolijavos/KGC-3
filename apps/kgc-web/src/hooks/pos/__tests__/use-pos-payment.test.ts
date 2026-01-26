/**
 * Unit tests for use-pos-payment hooks
 */

import { posHandlers, resetMockState } from '@/mocks/pos-handlers';
import type { PaymentStatus, SaleStatus, SaleTransaction } from '@/types/pos.types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { setupServer } from 'msw/node';
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  calculatePaymentState,
  useCompleteTransaction,
  useProcessCardPayment,
  useProcessCashPayment,
} from '../use-pos-payment';
import { useAddTransactionItem, useCreateTransaction } from '../use-pos-transaction';

// Setup MSW
const server = setupServer(...posHandlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetMockState();
});
afterAll(() => server.close());

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// Helper to create transaction with items
async function createTransactionWithItems(wrapper: ReturnType<typeof createWrapper>) {
  const { result: createResult } = renderHook(() => useCreateTransaction(), { wrapper });

  const transaction = await createResult.current.mutateAsync({
    sessionId: 'session-1',
  });

  const { result: addResult } = renderHook(() => useAddTransactionItem(), { wrapper });

  const updated = await addResult.current.mutateAsync({
    transactionId: transaction.id,
    dto: {
      productId: 'product-1',
      productCode: 'SKU-001',
      productName: 'Test Product',
      quantity: 2,
      unitPrice: 5000,
      taxRate: 27,
    },
  });

  return updated;
}

describe('use-pos-payment hooks', () => {
  describe('useProcessCashPayment', () => {
    it('should process cash payment with exact amount', async () => {
      const wrapper = createWrapper();
      const transaction = await createTransactionWithItems(wrapper);

      const { result } = renderHook(() => useProcessCashPayment(), { wrapper });

      const paymentResult = await result.current.mutateAsync({
        transactionId: transaction.id,
        dto: { receivedAmount: transaction.total },
      });

      expect(paymentResult.payment).toBeDefined();
      expect(paymentResult.payment.method).toBe('CASH');
      expect(paymentResult.changeAmount).toBe(0);
      expect(paymentResult.transaction.paymentStatus).toBe('PAID');
      expect(paymentResult.transaction.status).toBe('COMPLETED');
    });

    it('should calculate change correctly', async () => {
      const wrapper = createWrapper();
      const transaction = await createTransactionWithItems(wrapper);

      const { result } = renderHook(() => useProcessCashPayment(), { wrapper });

      // Pay with more than total
      const receivedAmount = transaction.total + 5000;
      const paymentResult = await result.current.mutateAsync({
        transactionId: transaction.id,
        dto: { receivedAmount },
      });

      expect(paymentResult.changeAmount).toBe(5000);
      expect(paymentResult.transaction.changeAmount).toBe(5000);
    });

    it('should update transaction to COMPLETED after full payment', async () => {
      const wrapper = createWrapper();
      const transaction = await createTransactionWithItems(wrapper);

      const { result } = renderHook(() => useProcessCashPayment(), { wrapper });

      const paymentResult = await result.current.mutateAsync({
        transactionId: transaction.id,
        dto: { receivedAmount: 20000 },
      });

      expect(paymentResult.transaction.status).toBe('COMPLETED');
      expect(paymentResult.transaction.completedAt).toBeDefined();
    });
  });

  describe('useProcessCardPayment', () => {
    it('should process card payment', async () => {
      const wrapper = createWrapper();
      const transaction = await createTransactionWithItems(wrapper);

      const { result } = renderHook(() => useProcessCardPayment(), { wrapper });

      const paymentResult = await result.current.mutateAsync({
        transactionId: transaction.id,
        dto: { amount: transaction.total },
      });

      expect(paymentResult.payment).toBeDefined();
      expect(paymentResult.payment.method).toBe('CARD');
      expect(paymentResult.cardTransactionId).toBeDefined();
      expect(paymentResult.cardLastFour).toBe('4242');
      expect(paymentResult.cardBrand).toBe('VISA');
    });

    it('should store card details in payment', async () => {
      const wrapper = createWrapper();
      const transaction = await createTransactionWithItems(wrapper);

      const { result } = renderHook(() => useProcessCardPayment(), { wrapper });

      const paymentResult = await result.current.mutateAsync({
        transactionId: transaction.id,
        dto: { amount: transaction.total },
      });

      expect(paymentResult.payment.cardTransactionId).toBeDefined();
      expect(paymentResult.payment.cardLastFour).toBe('4242');
      expect(paymentResult.payment.cardBrand).toBe('VISA');
    });
  });

  describe('useCompleteTransaction', () => {
    it('should complete a transaction', async () => {
      const wrapper = createWrapper();
      const transaction = await createTransactionWithItems(wrapper);

      // Pay first
      const { result: payResult } = renderHook(() => useProcessCashPayment(), { wrapper });

      await payResult.current.mutateAsync({
        transactionId: transaction.id,
        dto: { receivedAmount: transaction.total },
      });

      // Complete
      const { result } = renderHook(() => useCompleteTransaction(), { wrapper });

      const completed = await result.current.mutateAsync(transaction.id);

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('calculatePaymentState', () => {
    it('should calculate correct payment state for unpaid transaction', () => {
      const transaction: SaleTransaction = {
        id: 'test-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        transactionNumber: 'ELADAS-2026-0001',
        customerId: null,
        customerName: null,
        customerTaxNumber: null,
        subtotal: 10000,
        taxAmount: 2700,
        discountAmount: 0,
        total: 12700,
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
      };

      const state = calculatePaymentState(transaction);

      expect(state.total).toBe(12700);
      expect(state.paidAmount).toBe(0);
      expect(state.remainingAmount).toBe(12700);
      expect(state.isComplete).toBe(false);
    });

    it('should calculate correct payment state for paid transaction', () => {
      const transaction: SaleTransaction = {
        id: 'test-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        transactionNumber: 'ELADAS-2026-0001',
        customerId: null,
        customerName: null,
        customerTaxNumber: null,
        subtotal: 10000,
        taxAmount: 2700,
        discountAmount: 0,
        total: 12700,
        paymentStatus: 'PAID' as PaymentStatus,
        paidAmount: 12700,
        changeAmount: 300,
        invoiceId: null,
        receiptNumber: null,
        status: 'COMPLETED' as SaleStatus,
        voidedAt: null,
        voidedBy: null,
        voidReason: null,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        items: [],
        payments: [],
      };

      const state = calculatePaymentState(transaction);

      expect(state.total).toBe(12700);
      expect(state.paidAmount).toBe(12700);
      expect(state.remainingAmount).toBe(0);
      expect(state.isComplete).toBe(true);
    });

    it('should calculate correct payment state for partial payment', () => {
      const transaction: SaleTransaction = {
        id: 'test-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        transactionNumber: 'ELADAS-2026-0001',
        customerId: null,
        customerName: null,
        customerTaxNumber: null,
        subtotal: 10000,
        taxAmount: 2700,
        discountAmount: 0,
        total: 12700,
        paymentStatus: 'PARTIAL' as PaymentStatus,
        paidAmount: 5000,
        changeAmount: 0,
        invoiceId: null,
        receiptNumber: null,
        status: 'PENDING_PAYMENT' as SaleStatus,
        voidedAt: null,
        voidedBy: null,
        voidReason: null,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        completedAt: null,
        items: [],
        payments: [],
      };

      const state = calculatePaymentState(transaction);

      expect(state.total).toBe(12700);
      expect(state.paidAmount).toBe(5000);
      expect(state.remainingAmount).toBe(7700);
      expect(state.isComplete).toBe(false);
    });
  });
});
