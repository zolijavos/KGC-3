import { z } from 'zod';

/**
 * Send message DTO schema
 */
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Érvénytelen beszélgetés azonosító'),
  content: z
    .string()
    .min(1, 'Az üzenet nem lehet üres')
    .max(4000, 'Az üzenet maximum 4000 karakter lehet'),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;

/**
 * Send message response
 */
export interface SendMessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  status: 'sent';
  createdAt: Date;
}
