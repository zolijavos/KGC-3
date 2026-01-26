/**
 * Unit tests for use-pos-transaction hooks
 */

import { posHandlers, resetMockState } from '@/mocks/pos-handlers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  useAddTransactionItem,
  useCreateTransaction,
  useFindProductByBarcode,
  useProductSearch,
  useTransaction,
  useVoidTransaction,
} from '../use-pos-transaction';

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

describe('use-pos-transaction hooks', () => {
  describe('useCreateTransaction', () => {
    it('should create a new transaction', async () => {
      const { result } = renderHook(() => useCreateTransaction(), { wrapper: createWrapper() });

      const transaction = await result.current.mutateAsync({
        sessionId: 'session-1',
      });

      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.sessionId).toBe('session-1');
      expect(transaction.status).toBe('IN_PROGRESS');
      expect(transaction.items).toHaveLength(0);
      expect(transaction.transactionNumber).toMatch(/ELADAS-\d{4}-\d{4}/);
    });

    it('should create transaction with customer', async () => {
      const { result } = renderHook(() => useCreateTransaction(), { wrapper: createWrapper() });

      const transaction = await result.current.mutateAsync({
        sessionId: 'session-1',
        customerId: 'customer-1',
        customerName: 'Test Customer',
      });

      expect(transaction.customerId).toBe('customer-1');
    });
  });

  describe('useTransaction', () => {
    it('should fetch existing transaction', async () => {
      const wrapper = createWrapper();

      // Create transaction first
      const { result: createResult } = renderHook(() => useCreateTransaction(), { wrapper });

      const created = await createResult.current.mutateAsync({
        sessionId: 'session-1',
      });

      // Fetch it
      const { result } = renderHook(() => useTransaction(created.id), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe(created.id);
    });

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(() => useTransaction('', { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useAddTransactionItem', () => {
    it('should add item to transaction', async () => {
      const wrapper = createWrapper();

      // Create transaction first
      const { result: createResult } = renderHook(() => useCreateTransaction(), { wrapper });

      const transaction = await createResult.current.mutateAsync({
        sessionId: 'session-1',
      });

      // Add item
      const { result: addResult } = renderHook(() => useAddTransactionItem(), { wrapper });

      const updatedTransaction = await addResult.current.mutateAsync({
        transactionId: transaction.id,
        dto: {
          productId: 'product-1',
          productCode: 'SKU-001',
          productName: 'Test Product',
          quantity: 2,
          unitPrice: 1000,
          taxRate: 27,
        },
      });

      expect(updatedTransaction.items).toHaveLength(1);
      expect(updatedTransaction.items[0]?.quantity).toBe(2);
      expect(updatedTransaction.items[0]?.unitPrice).toBe(1000);
      expect(updatedTransaction.subtotal).toBe(2000);
      expect(updatedTransaction.total).toBeGreaterThan(0);
    });

    it('should calculate line totals correctly', async () => {
      const wrapper = createWrapper();

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
          quantity: 1,
          unitPrice: 10000,
          taxRate: 27,
        },
      });

      const item = updated.items[0];
      expect(item?.lineSubtotal).toBe(10000);
      expect(item?.lineTax).toBe(2700); // 27% of 10000
      expect(item?.lineTotal).toBe(12700);
    });
  });

  describe('useVoidTransaction', () => {
    it('should void a transaction', async () => {
      const wrapper = createWrapper();

      // Create transaction
      const { result: createResult } = renderHook(() => useCreateTransaction(), { wrapper });

      const transaction = await createResult.current.mutateAsync({
        sessionId: 'session-1',
      });

      // Void it
      const { result: voidResult } = renderHook(() => useVoidTransaction(), { wrapper });

      const voidedTransaction = await voidResult.current.mutateAsync({
        transactionId: transaction.id,
        dto: { reason: 'Customer cancelled' },
      });

      expect(voidedTransaction.status).toBe('VOIDED');
      expect(voidedTransaction.voidReason).toBe('Customer cancelled');
      expect(voidedTransaction.voidedAt).toBeDefined();
    });
  });

  describe('useProductSearch', () => {
    it('should search products by name', async () => {
      const { result } = renderHook(() => useProductSearch({ search: 'makita' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.length).toBeGreaterThan(0);
      expect(result.current.data?.[0]?.name.toLowerCase()).toContain('makita');
    });

    it('should not search when empty', async () => {
      const { result } = renderHook(() => useProductSearch({}), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useFindProductByBarcode', () => {
    it('should find product by barcode', async () => {
      const { result } = renderHook(() => useFindProductByBarcode(), { wrapper: createWrapper() });

      const product = await result.current.mutateAsync('5901234123457');

      expect(product).toBeDefined();
      expect(product?.barcode).toBe('5901234123457');
      expect(product?.name).toBe('Makita fúró');
    });

    it('should return null for unknown barcode', async () => {
      const { result } = renderHook(() => useFindProductByBarcode(), { wrapper: createWrapper() });

      const product = await result.current.mutateAsync('0000000000000');
      expect(product).toBeNull();
    });
  });
});
