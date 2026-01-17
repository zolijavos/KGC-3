import { z } from 'zod';

/**
 * Start conversation DTO schema
 */
export const startConversationSchema = z.object({
  participantIds: z
    .array(z.string().uuid('Érvénytelen felhasználó azonosító'))
    .min(1, 'Legalább egy résztvevő szükséges')
    .max(50, 'Maximum 50 résztvevő lehet'),
  initialMessage: z
    .string()
    .min(1, 'Az üzenet nem lehet üres')
    .max(4000, 'Az üzenet maximum 4000 karakter lehet')
    .optional(),
});

export type StartConversationDto = z.infer<typeof startConversationSchema>;

/**
 * Start conversation response
 */
export interface StartConversationResponse {
  id: string;
  participantIds: string[];
  createdAt: Date;
  initialMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  };
}
