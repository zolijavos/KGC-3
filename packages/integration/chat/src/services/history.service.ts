/**
 * Chat History Service
 * @package @kgc/chat
 * Story 32-4: Chat Előzmények
 *
 * Handles message search, pagination, and retention policy.
 */

import { Injectable } from '@nestjs/common';
import type { ChatMessage } from '../interfaces/chat.interface';
import {
  DEFAULT_RETENTION_POLICY,
  type ExportRequest,
  type ExportResult,
  type HistoryRequest,
  type HistoryResponse,
  type IHistoryService,
  type PaginationCursor,
  type RetentionPolicy,
  type RetentionResult,
  type SearchRequest,
  type SearchResponse,
  type SearchResult,
} from '../interfaces/history.interface';

/**
 * History service configuration
 */
export interface HistoryServiceConfig {
  /** Default page size */
  defaultPageSize: number;
  /** Maximum page size */
  maxPageSize: number;
  /** Context messages count (before/after) */
  contextSize: number;
  /** Search results limit */
  maxSearchResults: number;
}

const DEFAULT_CONFIG: HistoryServiceConfig = {
  defaultPageSize: 50,
  maxPageSize: 100,
  contextSize: 3,
  maxSearchResults: 100,
};

@Injectable()
export class HistoryService implements IHistoryService {
  private messages = new Map<string, ChatMessage[]>(); // conversationId -> messages
  private allMessages = new Map<string, ChatMessage>(); // messageId -> message
  private config: HistoryServiceConfig;
  private retentionPolicy: RetentionPolicy;

  constructor(
    config: Partial<HistoryServiceConfig> = {},
    retentionPolicy: Partial<RetentionPolicy> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.retentionPolicy = { ...DEFAULT_RETENTION_POLICY, ...retentionPolicy };
  }

  /**
   * Add message to history (for testing/internal use)
   */
  addMessage(message: ChatMessage): void {
    const conversationMessages = this.messages.get(message.conversationId) ?? [];
    conversationMessages.push(message);
    // Sort by createdAt ascending
    conversationMessages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    this.messages.set(message.conversationId, conversationMessages);
    this.allMessages.set(message.id, message);
  }

  /**
   * Get message history with cursor-based pagination
   */
  getHistory(request: HistoryRequest): HistoryResponse {
    const {
      conversationId,
      limit = this.config.defaultPageSize,
      cursor,
      direction = 'before',
    } = request;

    const effectiveLimit = Math.min(limit, this.config.maxPageSize);
    const conversationMessages = this.messages.get(conversationId) ?? [];

    if (conversationMessages.length === 0) {
      return {
        messages: [],
        hasMore: false,
        total: 0,
      };
    }

    let startIndex = 0;
    let endIndex = conversationMessages.length;

    if (cursor) {
      const cursorIndex = conversationMessages.findIndex(
        (m) => m.id === cursor.messageId,
      );

      if (cursorIndex !== -1) {
        if (direction === 'before') {
          // Get messages before cursor (older)
          endIndex = cursorIndex;
          startIndex = Math.max(0, cursorIndex - effectiveLimit);
        } else {
          // Get messages after cursor (newer)
          startIndex = cursorIndex + 1;
          endIndex = Math.min(conversationMessages.length, startIndex + effectiveLimit);
        }
      }
    } else {
      // No cursor - get latest messages
      startIndex = Math.max(0, conversationMessages.length - effectiveLimit);
    }

    const messages = conversationMessages.slice(startIndex, endIndex);

    // Build cursors
    let nextCursor: PaginationCursor | undefined;
    let prevCursor: PaginationCursor | undefined;

    if (startIndex > 0 && messages.length > 0) {
      const firstMessage = messages[0];
      if (firstMessage) {
        prevCursor = {
          messageId: firstMessage.id,
          timestamp: firstMessage.createdAt,
        };
      }
    }

    if (endIndex < conversationMessages.length && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        nextCursor = {
          messageId: lastMessage.id,
          timestamp: lastMessage.createdAt,
        };
      }
    }

    const result: HistoryResponse = {
      messages,
      hasMore: direction === 'before' ? startIndex > 0 : endIndex < conversationMessages.length,
      total: conversationMessages.length,
    };
    if (nextCursor !== undefined) {
      result.nextCursor = nextCursor;
    }
    if (prevCursor !== undefined) {
      result.prevCursor = prevCursor;
    }
    return result;
  }

  /**
   * Search messages
   */
  search(request: SearchRequest): SearchResponse {
    const startTime = Date.now();
    const {
      query,
      tenantId,
      conversationId,
      userId,
      fromDate,
      toDate,
      limit = this.config.maxSearchResults,
      offset = 0,
    } = request;

    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return { results: [], total: 0, query, took: 0 };
    }

    const results: SearchResult[] = [];

    // Search through all messages
    for (const [convId, messages] of this.messages) {
      // Filter by conversation if specified
      if (conversationId && convId !== conversationId) {
        continue;
      }

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (!message) continue;

        // Filter by tenant
        if (message.tenantId !== tenantId) {
          continue;
        }

        // Filter by user if specified
        if (userId && message.senderId !== userId) {
          continue;
        }

        // Filter by date range
        if (fromDate && message.createdAt < fromDate) {
          continue;
        }
        if (toDate && message.createdAt > toDate) {
          continue;
        }

        // Search in content
        const content = message.content.toLowerCase();
        if (!content.includes(normalizedQuery)) {
          continue;
        }

        // Calculate relevance score
        const score = this.calculateScore(content, normalizedQuery);

        // Get context messages
        const contextBefore = messages.slice(
          Math.max(0, i - this.config.contextSize),
          i,
        );
        const contextAfter = messages.slice(
          i + 1,
          Math.min(messages.length, i + 1 + this.config.contextSize),
        );

        results.push({
          message,
          highlightedContent: this.highlightText(message.content, query),
          contextBefore,
          contextAfter,
          score,
        });
      }
    }

    // Sort by score (descending) then by date (descending)
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.message.createdAt.getTime() - a.message.createdAt.getTime();
    });

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total,
      query,
      took: Date.now() - startTime,
    };
  }

  /**
   * Calculate relevance score for search
   */
  private calculateScore(content: string, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    // Base score: query appears in content
    let score = 0.5;

    // Boost for exact match
    if (contentLower === queryLower) {
      score = 1.0;
    }
    // Boost for starts with
    else if (contentLower.startsWith(queryLower)) {
      score = 0.9;
    }
    // Boost for word boundary match
    else if (
      contentLower.includes(` ${queryLower}`) ||
      contentLower.includes(`${queryLower} `)
    ) {
      score = 0.8;
    }

    // Boost for multiple occurrences
    const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) ?? []).length;
    if (occurrences > 1) {
      score += Math.min(0.1 * occurrences, 0.2);
    }

    // Penalize very long content
    if (content.length > 500) {
      score *= 0.9;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get messages around a specific message (context)
   */
  getContext(messageId: string, count: number): ChatMessage[] {
    const message = this.allMessages.get(messageId);
    if (!message) {
      return [];
    }

    const conversationMessages = this.messages.get(message.conversationId) ?? [];
    const index = conversationMessages.findIndex((m) => m.id === messageId);

    if (index === -1) {
      return [];
    }

    const start = Math.max(0, index - count);
    const end = Math.min(conversationMessages.length, index + count + 1);

    return conversationMessages.slice(start, end);
  }

  /**
   * Apply retention policy
   */
  applyRetention(policy: RetentionPolicy = this.retentionPolicy): RetentionResult {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    let deletedCount = 0;
    let archivedCount = 0;
    const conversationsAffected: string[] = [];

    if (!policy.enabled) {
      return {
        deletedCount: 0,
        archivedCount: 0,
        conversationsAffected: [],
        executedAt: new Date(),
      };
    }

    for (const [conversationId, messages] of this.messages) {
      const oldMessages = messages.filter((m) => m.createdAt < cutoffDate);
      const newMessages = messages.filter((m) => m.createdAt >= cutoffDate);

      if (oldMessages.length > 0) {
        conversationsAffected.push(conversationId);

        if (policy.archiveBeforeDelete) {
          archivedCount += oldMessages.length;
        }
        deletedCount += oldMessages.length;

        // Remove from allMessages map
        for (const msg of oldMessages) {
          this.allMessages.delete(msg.id);
        }

        // Update conversation messages
        if (newMessages.length === 0) {
          this.messages.delete(conversationId);
        } else {
          this.messages.set(conversationId, newMessages);
        }
      }
    }

    return {
      deletedCount,
      archivedCount,
      conversationsAffected,
      executedAt: new Date(),
    };
  }

  /**
   * Export conversation history
   */
  exportHistory(request: ExportRequest): ExportResult {
    const { conversationId, format, fromDate, toDate } = request;

    let messages = this.messages.get(conversationId) ?? [];

    // Filter by date range if specified
    if (fromDate) {
      messages = messages.filter((m) => m.createdAt >= fromDate);
    }
    if (toDate) {
      messages = messages.filter((m) => m.createdAt <= toDate);
    }

    let data: string;

    switch (format) {
      case 'json':
        data = this.exportAsJson(messages);
        break;
      case 'csv':
        data = this.exportAsCsv(messages);
        break;
      case 'html':
        data = this.exportAsHtml(messages, conversationId);
        break;
      default:
        data = this.exportAsJson(messages);
    }

    return {
      data,
      format,
      messageCount: messages.length,
      exportedAt: new Date(),
      conversationId,
    };
  }

  private exportAsJson(messages: ChatMessage[]): string {
    return JSON.stringify(messages, null, 2);
  }

  private exportAsCsv(messages: ChatMessage[]): string {
    const headers = ['id', 'senderId', 'content', 'status', 'createdAt'];
    const rows = messages.map((m) =>
      [
        m.id,
        m.senderId,
        `"${m.content.replace(/"/g, '""')}"`,
        m.status,
        m.createdAt.toISOString(),
      ].join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }

  private exportAsHtml(messages: ChatMessage[], conversationId: string): string {
    const messageRows = messages
      .map(
        (m) => `
      <div class="message">
        <div class="meta">
          <span class="sender">${this.escapeHtml(m.senderId)}</span>
          <span class="time">${this.escapeHtml(m.createdAt.toISOString())}</span>
        </div>
        <div class="content">${this.escapeHtml(m.content)}</div>
      </div>`,
      )
      .join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <title>Chat előzmények - ${conversationId}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .message { border-bottom: 1px solid #eee; padding: 10px 0; }
    .meta { font-size: 12px; color: #666; }
    .sender { font-weight: bold; margin-right: 10px; }
    .content { margin-top: 5px; }
  </style>
</head>
<body>
  <h1>Chat előzmények</h1>
  <p>Beszélgetés: ${conversationId}</p>
  <p>Exportálva: ${new Date().toISOString()}</p>
  <hr>
  ${messageRows}
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const htmlEntities = new Map<string, string>([
      ['&', '&amp;'],
      ['<', '&lt;'],
      ['>', '&gt;'],
      ['"', '&quot;'],
      ["'", '&#39;'],
    ]);
    return text.replace(/[&<>"']/g, (char) => htmlEntities.get(char) ?? char);
  }

  /**
   * Get conversation statistics
   */
  getStats(
    conversationId: string,
  ): { messageCount: number; firstMessage: Date | null; lastMessage: Date | null } {
    const messages = this.messages.get(conversationId);

    if (!messages || messages.length === 0) {
      return { messageCount: 0, firstMessage: null, lastMessage: null };
    }

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    return {
      messageCount: messages.length,
      firstMessage: firstMessage?.createdAt ?? null,
      lastMessage: lastMessage?.createdAt ?? null,
    };
  }

  /**
   * Check if message exists
   */
  messageExists(messageId: string): boolean {
    return this.allMessages.has(messageId);
  }

  /**
   * Highlight search terms in text
   */
  highlightText(text: string, query: string): string {
    if (!query.trim()) {
      return text;
    }

    // Escape special regex characters in query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.messages.clear();
    this.allMessages.clear();
  }

  /**
   * Get current retention policy
   */
  getRetentionPolicy(): RetentionPolicy {
    return { ...this.retentionPolicy };
  }

  /**
   * Update retention policy
   */
  setRetentionPolicy(policy: Partial<RetentionPolicy>): void {
    this.retentionPolicy = { ...this.retentionPolicy, ...policy };
  }
}
