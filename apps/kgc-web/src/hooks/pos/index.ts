/**
 * POS Hooks - Central Export
 */

// Session hooks
export {
  posSessionKeys,
  useApproveVariance,
  useCloseSession,
  useCurrentSession,
  useOpenSession,
  useResumeSession,
  useSessionSummary,
  useSuspendSession,
} from './use-pos-session';

// Transaction hooks
export {
  posTransactionKeys,
  useAddTransactionItem,
  useCreateTransaction,
  useCustomerSearch,
  useFindProductByBarcode,
  useProductSearch,
  useRemoveTransactionItem,
  useTransaction,
  useUpdateTransactionItem,
  useVoidTransaction,
} from './use-pos-transaction';

// Payment hooks
export {
  calculatePaymentState,
  posPaymentKeys,
  useAddPartialPayment,
  useCompleteTransaction,
  useProcessCardPayment,
  useProcessCashPayment,
  useTransactionPayments,
  type PaymentFlowState,
} from './use-pos-payment';

// Barcode scanner hook
export {
  simulateBarcodeScan,
  useBarcodeScanner,
  type BarcodeScannerOptions,
} from './use-barcode-scanner';
