/**
 * POS Payment React Query Hooks
 * Handles payment operations (cash, card, partial, complete)
 */

import type {
  AddPartialPaymentDto,
  ApiResponse,
  CardPaymentResult,
  CashPaymentResult,
  ProcessCardPaymentDto,
  ProcessCashPaymentDto,
  SalePayment,
  SaleTransaction,
} from '@/types/pos.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { posTransactionKeys } from './use-pos-transaction';

const API_BASE = '/api/v1/pos';

// ============================================
// API Functions
// ============================================

async function processCashPayment(
  transactionId: string,
  dto: ProcessCashPaymentDto
): Promise<CashPaymentResult> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/payments/cash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to process cash payment');
  }

  const result: ApiResponse<CashPaymentResult> = await response.json();
  return result.data;
}

async function processCardPayment(
  transactionId: string,
  dto: ProcessCardPaymentDto
): Promise<CardPaymentResult> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/payments/card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to process card payment');
  }

  const result: ApiResponse<CardPaymentResult> = await response.json();
  return result.data;
}

async function addPartialPayment(
  transactionId: string,
  dto: AddPartialPaymentDto
): Promise<{ payment: SalePayment; transaction: SaleTransaction }> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/payments/partial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add partial payment');
  }

  const result: ApiResponse<{ payment: SalePayment; transaction: SaleTransaction }> =
    await response.json();
  return result.data;
}

async function completeTransaction(transactionId: string): Promise<SaleTransaction> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to complete transaction');
  }

  const result: ApiResponse<SaleTransaction> = await response.json();
  return result.data;
}

async function fetchTransactionPayments(transactionId: string): Promise<SalePayment[]> {
  const response = await fetch(`${API_BASE}/transactions/${transactionId}/payments`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch payments');
  }

  const result: ApiResponse<SalePayment[]> = await response.json();
  return result.data;
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to process cash payment
 */
export function useProcessCashPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, dto }: { transactionId: string; dto: ProcessCashPaymentDto }) =>
      processCashPayment(transactionId, dto),
    onSuccess: result => {
      // Update transaction in cache
      queryClient.setQueryData(
        posTransactionKeys.detail(result.transaction.id),
        result.transaction
      );
    },
  });
}

/**
 * Hook to process card payment
 */
export function useProcessCardPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, dto }: { transactionId: string; dto: ProcessCardPaymentDto }) =>
      processCardPayment(transactionId, dto),
    onSuccess: result => {
      // Update transaction in cache
      queryClient.setQueryData(
        posTransactionKeys.detail(result.transaction.id),
        result.transaction
      );
    },
  });
}

/**
 * Hook to add partial payment (for mixed payments)
 */
export function useAddPartialPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, dto }: { transactionId: string; dto: AddPartialPaymentDto }) =>
      addPartialPayment(transactionId, dto),
    onSuccess: result => {
      // Update transaction in cache
      queryClient.setQueryData(
        posTransactionKeys.detail(result.transaction.id),
        result.transaction
      );
    },
  });
}

/**
 * Hook to complete a transaction (finalize sale)
 */
export function useCompleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeTransaction,
    onSuccess: transaction => {
      queryClient.setQueryData(posTransactionKeys.detail(transaction.id), transaction);
      queryClient.invalidateQueries({ queryKey: posTransactionKeys.all });
    },
  });
}

/**
 * Query key for transaction payments
 */
export const posPaymentKeys = {
  all: ['pos-payments'] as const,
  byTransaction: (transactionId: string) => [...posPaymentKeys.all, transactionId] as const,
};

/**
 * Hook to fetch payments for a transaction
 */
export function useTransactionPayments(transactionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posPaymentKeys.byTransaction(transactionId),
    queryFn: () => fetchTransactionPayments(transactionId),
    enabled: options?.enabled ?? !!transactionId,
  });
}

// ============================================
// Helper Types for Payment Flow
// ============================================

export interface PaymentFlowState {
  transactionId: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  payments: SalePayment[];
  isComplete: boolean;
}

/**
 * Calculate remaining amount from transaction
 */
export function calculatePaymentState(transaction: SaleTransaction): PaymentFlowState {
  const paidAmount = transaction.paidAmount;
  const remainingAmount = Math.max(0, transaction.total - paidAmount);

  return {
    transactionId: transaction.id,
    total: transaction.total,
    paidAmount,
    remainingAmount,
    payments: transaction.payments,
    isComplete: transaction.paymentStatus === 'PAID',
  };
}
