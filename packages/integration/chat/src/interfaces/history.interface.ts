/**
 * Chat History Interfaces
 * @package @kgc/chat
 * Story 32-4: Chat Előzmények
 */

import type { ChatMessage } from './chat.interface';

/**
 * Cursor-based pagination cursor
 */
export interface PaginationCursor {
  /** Message ID for cursor-based pagination */
  messageId: string;
  /** Timestamp for consistent ordering */
  timestamp: Date;
}

/**
 * Pagination direction
 */
export type PaginationDirection = 'before' | 'after';

/**
 * Request parameters for fetching message history
 */
export interface HistoryRequest {
  conversationId: string;
  tenantId: string;
  /** Number of messages to fetch */
  limit?: number;
  /** Cursor for pagination */
  cursor?: PaginationCursor;
  /** Direction: 'before' (older) or 'after' (newer) */
  direction?: PaginationDirection;
}

/**
 * Response for message history
 */
export interface HistoryResponse {
  messages: ChatMessage[];
  /** Cursor for next page */
  nextCursor?: PaginationCursor;
  /** Cursor for previous page */
  prevCursor?: PaginationCursor;
  /** Whether there are more messages */
  hasMore: boolean;
  /** Total messages in conversation (if available) */
  total?: number;
}

/**
 * Search request parameters
 */
export interface SearchRequest {
  query: string;
  tenantId: string;
  /** Optional: limit search to specific conversation */
  conversationId?: string;
  /** Optional: limit search to specific user's messages */
  userId?: string;
  /** Search from date */
  fromDate?: Date;
  /** Search to date */
  toDate?: Date;
  /** Number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Search result with context
 */
export interface SearchResult {
  message: ChatMessage;
  /** Highlighted content with search term wrapped */
  highlightedContent: string;
  /** Messages before for context */
  contextBefore?: ChatMessage[];
  /** Messages after for context */
  contextAfter?: ChatMessage[];
  /** Relevance score (0-1) */
  score: number;
}

/**
 * Search response
 */
export interface SearchResponse {
  results: SearchResult[];
  /** Total matching results */
  total: number;
  /** Search query */
  query: string;
  /** Time taken in ms */
  took: number;
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  /** Retention period in days (default: 365) */
  retentionDays: number;
  /** Whether to archive instead of delete */
  archiveBeforeDelete: boolean;
  /** Archive location if archiving enabled */
  archiveLocation?: string;
  /** Whether retention is enabled */
  enabled: boolean;
}

/**
 * Default retention policy
 */
export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  retentionDays: 365,
  archiveBeforeDelete: false,
  enabled: true,
};

/**
 * Retention enforcement result
 */
export interface RetentionResult {
  /** Number of messages deleted */
  deletedCount: number;
  /** Number of messages archived */
  archivedCount: number;
  /** Conversations affected */
  conversationsAffected: string[];
  /** Execution timestamp */
  executedAt: Date;
}

/**
 * History export format
 */
export type ExportFormat = 'json' | 'csv' | 'html';

/**
 * Export request
 */
export interface ExportRequest {
  conversationId: string;
  tenantId: string;
  format: ExportFormat;
  fromDate?: Date;
  toDate?: Date;
  includeAttachments?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  data: string;
  format: ExportFormat;
  messageCount: number;
  exportedAt: Date;
  conversationId: string;
}

/**
 * History service interface
 */
export interface IHistoryService {
  /**
   * Get message history with cursor-based pagination
   */
  getHistory(request: HistoryRequest): HistoryResponse;

  /**
   * Search messages
   */
  search(request: SearchRequest): SearchResponse;

  /**
   * Get messages around a specific message (context)
   */
  getContext(messageId: string, count: number): ChatMessage[];

  /**
   * Apply retention policy
   */
  applyRetention(policy?: RetentionPolicy): RetentionResult;

  /**
   * Export conversation history
   */
  exportHistory(request: ExportRequest): ExportResult;

  /**
   * Get conversation statistics
   */
  getStats(
    conversationId: string,
  ): { messageCount: number; firstMessage: Date | null; lastMessage: Date | null };

  /**
   * Check if message exists
   */
  messageExists(messageId: string): boolean;

  /**
   * Highlight search terms in text
   */
  highlightText(text: string, query: string): string;
}
