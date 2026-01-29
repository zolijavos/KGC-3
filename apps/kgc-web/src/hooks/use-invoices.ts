/**
 * Invoice Hooks - React hooks for invoice data management
 */

import {
  createInvoice,
  createStornoInvoice,
  deleteInvoice,
  getInvoiceById,
  getInvoices,
  getInvoiceStats,
  issueInvoice,
  markInvoiceAsSent,
  recordPayment,
  updateInvoice,
  type Invoice,
  type InvoiceFilters,
  type InvoiceStats,
  type InvoiceType,
  type PaymentMethod,
} from '@/api/invoices';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

interface UseInvoicesResult {
  invoices: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseInvoiceResult {
  invoice: Invoice | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseInvoiceStatsResult {
  stats: InvoiceStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseInvoiceMutationsResult {
  createInvoice: (data: CreateInvoiceInput) => Promise<Invoice>;
  updateInvoice: (id: string, data: UpdateInvoiceInput) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  issueInvoice: (id: string) => Promise<Invoice>;
  sendInvoice: (id: string) => Promise<Invoice>;
  recordPayment: (id: string, data: RecordPaymentInput) => Promise<Invoice>;
  createStorno: (id: string, data: StornoInput) => Promise<Invoice>;
  isLoading: boolean;
  error: string | null;
}

interface CreateInvoiceInput {
  partnerId: string;
  partnerName: string;
  partnerAddress: string;
  partnerTaxNumber?: string;
  type?: InvoiceType;
  invoiceDate?: string;
  fulfillmentDate?: string;
  dueDate?: string;
  paymentMethod: PaymentMethod;
  currency?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPriceNet: number;
    vatRate: string;
    productId?: string;
    discountPercent?: number;
  }>;
}

interface UpdateInvoiceInput {
  dueDate?: string;
  notes?: string;
  internalNotes?: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
}

interface RecordPaymentInput {
  amount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
}

interface StornoInput {
  reason: string;
  partialItems?: Array<{ lineNumber: number; quantity: number }>;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch and manage invoice list
 */
export function useInvoices(filters: InvoiceFilters = {}): UseInvoicesResult {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getInvoices(filters);
      setInvoices(response.data);
      setMeta(response.meta);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invoices';
      setError(message);
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.type,
    filters.status,
    filters.partnerId,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
    filters.page,
    filters.pageSize,
  ]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    total: meta.total,
    page: meta.page,
    pageSize: meta.pageSize,
    hasMore: meta.hasMore,
    isLoading,
    error,
    refetch: fetchInvoices,
  };
}

/**
 * Hook to fetch single invoice
 */
export function useInvoice(id: string | undefined): UseInvoiceResult {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) {
      setInvoice(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getInvoiceById(id);
      setInvoice(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invoice';
      setError(message);
      console.error('Error fetching invoice:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  return {
    invoice,
    isLoading,
    error,
    refetch: fetchInvoice,
  };
}

/**
 * Hook to fetch invoice statistics
 */
export function useInvoiceStats(): UseInvoiceStatsResult {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getInvoiceStats();
      setStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invoice stats';
      setError(message);
      console.error('Error fetching invoice stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook for invoice mutations (create, update, delete, etc.)
 */
export function useInvoiceMutations(): UseInvoiceMutationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async (data: CreateInvoiceInput): Promise<Invoice> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createInvoice(data);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create invoice';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdate = useCallback(
    async (id: string, data: UpdateInvoiceInput): Promise<Invoice> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await updateInvoice(id, data);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update invoice';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteInvoice(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete invoice';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleIssue = useCallback(async (id: string): Promise<Invoice> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await issueInvoice(id);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to issue invoice';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(async (id: string): Promise<Invoice> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await markInvoiceAsSent(id);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invoice';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRecordPayment = useCallback(
    async (id: string, data: RecordPaymentInput): Promise<Invoice> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await recordPayment(id, data);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to record payment';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleCreateStorno = useCallback(
    async (id: string, data: StornoInput): Promise<Invoice> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await createStornoInvoice(id, data);
        return response.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create storno invoice';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    createInvoice: handleCreate,
    updateInvoice: handleUpdate,
    deleteInvoice: handleDelete,
    issueInvoice: handleIssue,
    sendInvoice: handleSend,
    recordPayment: handleRecordPayment,
    createStorno: handleCreateStorno,
    isLoading,
    error,
  };
}
