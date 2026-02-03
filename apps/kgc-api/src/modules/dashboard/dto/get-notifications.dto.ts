import { z } from 'zod';

/**
 * Get Notifications Query DTO (Epic 35: Story 35-4)
 *
 * Query parameters for GET /api/v1/dashboard/notifications
 */
export const GetNotificationsQuerySchema = z.object({
  unread: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => val > 0 && val <= 100, {
      message: 'Limit must be between 1 and 100',
    }),
});

export type GetNotificationsQueryDto = z.infer<typeof GetNotificationsQuerySchema>;
