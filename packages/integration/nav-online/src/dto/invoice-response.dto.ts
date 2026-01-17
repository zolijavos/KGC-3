/**
 * Invoice Response DTOs
 * @package @kgc/nav-online
 */

import { z } from 'zod';

/**
 * Számla státusz schema
 */
export const invoiceStatusSchema = z.enum([
  'PENDING',
  'SENT',
  'SUCCESS',
  'FAILED_RETRYABLE',
  'FAILED_PERMANENT',
  'MANUAL_REQUIRED',
  'CANCELLED',
]);

/**
 * Számla válasz schema
 */
export const invoiceResponseSchema = z.object({
  id: z.string().uuid(),
  internalNumber: z.string(),
  externalNumber: z.string().nullable(),
  navReference: z.string().nullable(),
  status: invoiceStatusSchema,
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  grossAmount: z.number(),
  currency: z.string(),
  pdfUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
});

/**
 * Számla válasz típus
 */
export type InvoiceResponseDto = z.infer<typeof invoiceResponseSchema>;

/**
 * Számla lista válasz
 */
export const invoiceListResponseSchema = z.object({
  items: z.array(invoiceResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type InvoiceListResponseDto = z.infer<typeof invoiceListResponseSchema>;

/**
 * NAV beküldés válasz
 */
export const navSubmissionResponseSchema = z.object({
  success: z.boolean(),
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string(),
  navTransactionId: z.string().nullable(),
  navStatus: z.enum(['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED']).nullable(),
  pdfUrl: z.string().nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }).nullable(),
});

export type NavSubmissionResponseDto = z.infer<typeof navSubmissionResponseSchema>;

/**
 * Hiba válasz
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ErrorResponseDto = z.infer<typeof errorResponseSchema>;
