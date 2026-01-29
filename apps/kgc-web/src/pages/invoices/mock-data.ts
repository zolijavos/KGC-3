import type { Invoice, InvoiceStatus, InvoiceType, PaymentMethod } from './types';

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; color: string }[] = [
  {
    value: 'DRAFT',
    label: 'Piszkozat',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  {
    value: 'PENDING',
    label: 'Jóváhagyásra vár',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  {
    value: 'APPROVED',
    label: 'Jóváhagyva',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'SENT',
    label: 'Kiállítva',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'PAID',
    label: 'Kifizetve',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  {
    value: 'PARTIALLY_PAID',
    label: 'Részben fizetve',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    value: 'OVERDUE',
    label: 'Lejárt',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  {
    value: 'CANCELLED',
    label: 'Törölve',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  {
    value: 'VOIDED',
    label: 'Sztornózva',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
];

export const INVOICE_TYPES: { value: InvoiceType; label: string; color: string }[] = [
  {
    value: 'STANDARD',
    label: 'Számla',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'ADVANCE',
    label: 'Előlegszámla',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  },
  {
    value: 'FINAL',
    label: 'Végszámla',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  {
    value: 'PROFORMA',
    label: 'Díjbekérő',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  {
    value: 'CREDIT_NOTE',
    label: 'Sztornó',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Készpénz' },
  { value: 'CARD', label: 'Bankkártya' },
  { value: 'TRANSFER', label: 'Átutalás' },
  { value: 'COD', label: 'Utánvét' },
];

export const NAV_STATUSES: { value: string; label: string; color: string }[] = [
  {
    value: 'PENDING',
    label: 'Függőben',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  {
    value: 'SUBMITTED',
    label: 'Elküldve',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'ACCEPTED',
    label: 'Elfogadva',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  {
    value: 'REJECTED',
    label: 'Elutasítva',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  {
    value: 'ERROR',
    label: 'Hiba',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
];

// Empty mock data - real data comes from API
export const MOCK_INVOICES: Invoice[] = [];
