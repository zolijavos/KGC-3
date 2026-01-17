import { describe, it, expect } from 'vitest';
import { sendMessageSchema } from '../src/dto/send-message.dto';
import { startConversationSchema } from '../src/dto/start-conversation.dto';

describe('Chat DTOs', () => {
  describe('sendMessageSchema', () => {
    it('should validate valid message', () => {
      const result = sendMessageSchema.safeParse({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Hello, world!',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = sendMessageSchema.safeParse({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('üres');
      }
    });

    it('should reject too long content', () => {
      const result = sendMessageSchema.safeParse({
        conversationId: '123e4567-e89b-12d3-a456-426614174000',
        content: 'a'.repeat(4001),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('4000');
      }
    });

    it('should reject invalid UUID', () => {
      const result = sendMessageSchema.safeParse({
        conversationId: 'not-a-uuid',
        content: 'Hello',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('startConversationSchema', () => {
    it('should validate valid conversation start', () => {
      const result = startConversationSchema.safeParse({
        participantIds: ['123e4567-e89b-12d3-a456-426614174000'],
      });

      expect(result.success).toBe(true);
    });

    it('should validate with initial message', () => {
      const result = startConversationSchema.safeParse({
        participantIds: ['123e4567-e89b-12d3-a456-426614174000'],
        initialMessage: 'Hi there!',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty participants', () => {
      const result = startConversationSchema.safeParse({
        participantIds: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('résztvevő');
      }
    });

    it('should reject too many participants', () => {
      const participants = Array.from({ length: 51 }, (_, i) =>
        `123e4567-e89b-12d3-a456-42661417${String(i).padStart(4, '0')}`
      );

      const result = startConversationSchema.safeParse({
        participantIds: participants,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('50');
      }
    });

    it('should reject invalid participant UUIDs', () => {
      const result = startConversationSchema.safeParse({
        participantIds: ['not-a-uuid'],
      });

      expect(result.success).toBe(false);
    });
  });
});
