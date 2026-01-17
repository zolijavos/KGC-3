import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HistoryService } from '../src/services/history.service';
import type { ChatMessage } from '../src/interfaces/chat.interface';

describe('HistoryService', () => {
  let service: HistoryService;

  const createMessage = (
    id: string,
    conversationId: string,
    content: string,
    createdAt: Date,
  ): ChatMessage => ({
    id,
    conversationId,
    senderId: 'user-1',
    content,
    status: 'sent',
    tenantId: 'tenant-1',
    createdAt,
    updatedAt: createdAt,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-16T10:00:00'));
    service = new HistoryService();
  });

  afterEach(() => {
    service.clearAll();
    vi.useRealTimers();
  });

  describe('addMessage', () => {
    it('should add message to history', () => {
      const message = createMessage('msg-1', 'conv-1', 'Hello', new Date());
      service.addMessage(message);

      expect(service.messageExists('msg-1')).toBe(true);
    });

    it('should sort messages by createdAt', () => {
      const older = createMessage(
        'msg-1',
        'conv-1',
        'Older',
        new Date('2026-01-16T09:00:00'),
      );
      const newer = createMessage(
        'msg-2',
        'conv-1',
        'Newer',
        new Date('2026-01-16T10:00:00'),
      );

      service.addMessage(newer);
      service.addMessage(older);

      const result = service.getHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
      });

      expect(result.messages[0]?.id).toBe('msg-1');
      expect(result.messages[1]?.id).toBe('msg-2');
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      // Add 10 messages
      for (let i = 0; i < 10; i++) {
        const date = new Date('2026-01-16T10:00:00');
        date.setMinutes(date.getMinutes() + i);
        service.addMessage(createMessage(`msg-${i}`, 'conv-1', `Message ${i}`, date));
      }
    });

    it('should return messages for conversation', () => {
      const result = service.getHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
      });

      expect(result.messages).toHaveLength(10);
      expect(result.total).toBe(10);
    });

    it('should limit results', () => {
      const result = service.getHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        limit: 5,
      });

      expect(result.messages).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it('should paginate with cursor (before)', () => {
      const result = service.getHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        cursor: {
          messageId: 'msg-5',
          timestamp: new Date('2026-01-16T10:05:00'),
        },
        direction: 'before',
        limit: 3,
      });

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0]?.id).toBe('msg-2');
      expect(result.messages[2]?.id).toBe('msg-4');
    });

    it('should paginate with cursor (after)', () => {
      const result = service.getHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        cursor: {
          messageId: 'msg-5',
          timestamp: new Date('2026-01-16T10:05:00'),
        },
        direction: 'after',
        limit: 3,
      });

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0]?.id).toBe('msg-6');
    });

    it('should return empty for non-existent conversation', () => {
      const result = service.getHistory({
        conversationId: 'non-existent',
        tenantId: 'tenant-1',
      });

      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('should include pagination cursors', () => {
      const result = service.getHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        cursor: {
          messageId: 'msg-5',
          timestamp: new Date('2026-01-16T10:05:00'),
        },
        direction: 'before',
        limit: 3,
      });

      expect(result.prevCursor).toBeDefined();
      expect(result.prevCursor?.messageId).toBe('msg-2');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      service.addMessage(
        createMessage('msg-1', 'conv-1', 'Hello World', new Date('2026-01-16T10:00:00')),
      );
      service.addMessage(
        createMessage('msg-2', 'conv-1', 'Hi there', new Date('2026-01-16T10:01:00')),
      );
      service.addMessage(
        createMessage('msg-3', 'conv-1', 'Hello again', new Date('2026-01-16T10:02:00')),
      );
      service.addMessage(
        createMessage('msg-4', 'conv-2', 'Different conversation', new Date('2026-01-16T10:03:00')),
      );
    });

    it('should find messages matching query', () => {
      const result = service.search({
        query: 'Hello',
        tenantId: 'tenant-1',
      });

      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should be case insensitive', () => {
      const result = service.search({
        query: 'hello',
        tenantId: 'tenant-1',
      });

      expect(result.results).toHaveLength(2);
    });

    it('should filter by conversation', () => {
      const result = service.search({
        query: 'Hello',
        tenantId: 'tenant-1',
        conversationId: 'conv-1',
      });

      expect(result.results).toHaveLength(2);
    });

    it('should include highlighted content', () => {
      const result = service.search({
        query: 'Hello',
        tenantId: 'tenant-1',
      });

      expect(result.results[0]?.highlightedContent).toContain('<mark>Hello</mark>');
    });

    it('should include context messages', () => {
      const result = service.search({
        query: 'Hi there',
        tenantId: 'tenant-1',
      });

      expect(result.results[0]?.contextBefore).toBeDefined();
      expect(result.results[0]?.contextAfter).toBeDefined();
    });

    it('should filter by date range', () => {
      const result = service.search({
        query: 'Hello',
        tenantId: 'tenant-1',
        fromDate: new Date('2026-01-16T10:01:00'),
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.message.id).toBe('msg-3');
    });

    it('should return empty for empty query', () => {
      const result = service.search({
        query: '',
        tenantId: 'tenant-1',
      });

      expect(result.results).toHaveLength(0);
    });

    it('should track search time', () => {
      const result = service.search({
        query: 'Hello',
        tenantId: 'tenant-1',
      });

      expect(result.took).toBeGreaterThanOrEqual(0);
    });

    it('should sort by relevance score', () => {
      service.addMessage(
        createMessage('msg-5', 'conv-1', 'Hello', new Date('2026-01-16T10:04:00')),
      );

      const result = service.search({
        query: 'Hello',
        tenantId: 'tenant-1',
      });

      // Exact match should have higher score
      expect(result.results[0]?.message.content).toBe('Hello');
    });

    it('should paginate results', () => {
      const result = service.search({
        query: 'Hello',
        tenantId: 'tenant-1',
        limit: 1,
        offset: 1,
      });

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(2);
    });
  });

  describe('getContext', () => {
    beforeEach(() => {
      for (let i = 0; i < 10; i++) {
        const date = new Date('2026-01-16T10:00:00');
        date.setMinutes(date.getMinutes() + i);
        service.addMessage(createMessage(`msg-${i}`, 'conv-1', `Message ${i}`, date));
      }
    });

    it('should return context around message', () => {
      const context = service.getContext('msg-5', 2);

      expect(context).toHaveLength(5); // 2 before + target + 2 after
      expect(context[2]?.id).toBe('msg-5');
    });

    it('should handle edge cases (start of conversation)', () => {
      const context = service.getContext('msg-1', 3);

      expect(context.length).toBeLessThanOrEqual(5);
      expect(context[0]?.id).toBe('msg-0');
    });

    it('should return empty for non-existent message', () => {
      const context = service.getContext('non-existent', 2);

      expect(context).toHaveLength(0);
    });
  });

  describe('applyRetention', () => {
    it('should delete old messages', () => {
      // Add message from 400 days ago
      const oldDate = new Date('2025-01-01T10:00:00');
      service.addMessage(createMessage('old-msg', 'conv-1', 'Old message', oldDate));

      // Add recent message
      service.addMessage(createMessage('new-msg', 'conv-1', 'New message', new Date()));

      const result = service.applyRetention({ retentionDays: 365, enabled: true, archiveBeforeDelete: false });

      expect(result.deletedCount).toBe(1);
      expect(service.messageExists('old-msg')).toBe(false);
      expect(service.messageExists('new-msg')).toBe(true);
    });

    it('should track affected conversations', () => {
      const oldDate = new Date('2025-01-01T10:00:00');
      service.addMessage(createMessage('old-msg', 'conv-1', 'Old', oldDate));

      const result = service.applyRetention({ retentionDays: 365, enabled: true, archiveBeforeDelete: false });

      expect(result.conversationsAffected).toContain('conv-1');
    });

    it('should not delete when disabled', () => {
      const oldDate = new Date('2025-01-01T10:00:00');
      service.addMessage(createMessage('old-msg', 'conv-1', 'Old', oldDate));

      const result = service.applyRetention({ retentionDays: 365, enabled: false, archiveBeforeDelete: false });

      expect(result.deletedCount).toBe(0);
      expect(service.messageExists('old-msg')).toBe(true);
    });

    it('should count archived messages', () => {
      const oldDate = new Date('2025-01-01T10:00:00');
      service.addMessage(createMessage('old-msg', 'conv-1', 'Old', oldDate));

      const result = service.applyRetention({
        retentionDays: 365,
        enabled: true,
        archiveBeforeDelete: true,
      });

      expect(result.archivedCount).toBe(1);
    });
  });

  describe('exportHistory', () => {
    beforeEach(() => {
      service.addMessage(
        createMessage('msg-1', 'conv-1', 'Hello', new Date('2026-01-16T10:00:00')),
      );
      service.addMessage(
        createMessage('msg-2', 'conv-1', 'World', new Date('2026-01-16T10:01:00')),
      );
    });

    it('should export as JSON', () => {
      const result = service.exportHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        format: 'json',
      });

      expect(result.format).toBe('json');
      expect(result.messageCount).toBe(2);

      const data = JSON.parse(result.data);
      expect(data).toHaveLength(2);
    });

    it('should export as CSV', () => {
      const result = service.exportHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        format: 'csv',
      });

      expect(result.format).toBe('csv');
      expect(result.data).toContain('id,senderId,content,status,createdAt');
      expect(result.data).toContain('msg-1');
    });

    it('should export as HTML', () => {
      const result = service.exportHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        format: 'html',
      });

      expect(result.format).toBe('html');
      expect(result.data).toContain('<!DOCTYPE html>');
      expect(result.data).toContain('Chat előzmények');
      expect(result.data).toContain('Hello');
    });

    it('should filter by date range', () => {
      const result = service.exportHistory({
        conversationId: 'conv-1',
        tenantId: 'tenant-1',
        format: 'json',
        fromDate: new Date('2026-01-16T10:00:30'),
      });

      expect(result.messageCount).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return conversation statistics', () => {
      service.addMessage(
        createMessage('msg-1', 'conv-1', 'First', new Date('2026-01-16T10:00:00')),
      );
      service.addMessage(
        createMessage('msg-2', 'conv-1', 'Second', new Date('2026-01-16T10:01:00')),
      );

      const stats = service.getStats('conv-1');

      expect(stats.messageCount).toBe(2);
      expect(stats.firstMessage).toEqual(new Date('2026-01-16T10:00:00'));
      expect(stats.lastMessage).toEqual(new Date('2026-01-16T10:01:00'));
    });

    it('should return empty stats for non-existent conversation', () => {
      const stats = service.getStats('non-existent');

      expect(stats.messageCount).toBe(0);
      expect(stats.firstMessage).toBeNull();
      expect(stats.lastMessage).toBeNull();
    });
  });

  describe('highlightText', () => {
    it('should wrap search term with mark tags', () => {
      const result = service.highlightText('Hello World', 'World');

      expect(result).toBe('Hello <mark>World</mark>');
    });

    it('should handle multiple occurrences', () => {
      const result = service.highlightText('Hello Hello', 'Hello');

      expect(result).toBe('<mark>Hello</mark> <mark>Hello</mark>');
    });

    it('should be case insensitive', () => {
      const result = service.highlightText('Hello World', 'world');

      expect(result).toBe('Hello <mark>World</mark>');
    });

    it('should escape regex special characters', () => {
      const result = service.highlightText('Price is $100', '$100');

      expect(result).toBe('Price is <mark>$100</mark>');
    });

    it('should handle empty query', () => {
      const result = service.highlightText('Hello World', '');

      expect(result).toBe('Hello World');
    });
  });

  describe('retention policy', () => {
    it('should get default retention policy', () => {
      const policy = service.getRetentionPolicy();

      expect(policy.retentionDays).toBe(365);
      expect(policy.enabled).toBe(true);
    });

    it('should update retention policy', () => {
      service.setRetentionPolicy({ retentionDays: 180 });

      const policy = service.getRetentionPolicy();
      expect(policy.retentionDays).toBe(180);
    });
  });
});
