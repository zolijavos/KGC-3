/**
 * @kgc/online-booking - Online Booking DTOs
 * Epic 26: Online Booking
 */

import { z } from 'zod';

export const BookingItemSchema = z.object({
  equipmentId: z.string().uuid().optional(),
  equipmentCode: z.string().max(50).optional(),
  equipmentName: z.string().min(1).max(200),
  quantity: z.number().int().min(1).default(1),
  dailyRate: z.number().min(0),
});

export const CreateBookingSchema = z.object({
  type: z.enum(['RENTAL', 'SERVICE']).default('RENTAL'),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(6).max(20),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  items: z.array(BookingItemSchema).min(1),
  notes: z.string().max(1000).optional(),
  depositAmount: z.number().min(0).optional(),
});

export const ConfirmBookingSchema = z.object({
  confirmationToken: z.string().min(1),
  paymentReference: z.string().optional(),
});

export const CancelBookingSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const CheckAvailabilitySchema = z.object({
  equipmentIds: z.array(z.string().uuid()).min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const GetTimeSlotsSchema = z.object({
  date: z.coerce.date(),
  type: z.enum(['RENTAL', 'SERVICE']).default('RENTAL'),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
export type BookingItemDto = z.infer<typeof BookingItemSchema>;
export type ConfirmBookingDto = z.infer<typeof ConfirmBookingSchema>;
export type CancelBookingDto = z.infer<typeof CancelBookingSchema>;
export type CheckAvailabilityDto = z.infer<typeof CheckAvailabilitySchema>;
export type GetTimeSlotsDto = z.infer<typeof GetTimeSlotsSchema>;
