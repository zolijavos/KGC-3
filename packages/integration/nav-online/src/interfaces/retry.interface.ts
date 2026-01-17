/**
 * Retry Configuration Interfaces
 * ADR-030: Exponential backoff and retry logic
 * @package @kgc/nav-online
 */

/**
 * Retry konfiguráció
 */
export interface RetryConfig {
  /** Maximum újrapróbálkozások száma */
  maxRetries: number;

  /** Alapértelmezett késleltetés (ms) */
  baseDelayMs: number;

  /** Maximum késleltetés (ms) */
  maxDelayMs: number;

  /** Backoff szorzó */
  backoffMultiplier: number;

  /** Újrapróbálható hibakódok */
  retryableCodes: string[];

  /** Nem újrapróbálható hibakódok */
  permanentCodes: string[];
}

/**
 * Alapértelmezett retry konfiguráció (ADR-030)
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,

  retryableCodes: [
    'TIMEOUT',
    'CONNECTION_ERROR',
    'RATE_LIMIT',
    'SERVICE_UNAVAILABLE',
    'NAV_TEMPORARY_ERROR',
  ],

  permanentCodes: [
    'INVALID_TAX_NUMBER',
    'INVALID_INVOICE_DATA',
    'DUPLICATE_INVOICE',
    'AUTH_ERROR',
    'INVALID_API_KEY',
  ],
};

/**
 * Retry állapot
 */
export interface RetryState {
  /** Jelenlegi próbálkozás */
  attempt: number;
  /** Következő próbálkozás időpontja */
  nextRetryAt: Date | null;
  /** Utolsó hiba */
  lastError: string | null;
  /** Utolsó hibakód */
  lastErrorCode: string | null;
}

/**
 * Queue elem a retry-hoz
 */
export interface RetryQueueItem {
  /** Queue elem ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Számla ID */
  invoiceId: string;
  /** Prioritás (magasabb = fontosabb) */
  priority: number;
  /** Ütemezett időpont */
  scheduledAt: Date;
  /** Próbálkozások száma */
  attempts: number;
  /** Max próbálkozások */
  maxAttempts: number;
  /** Feldolgozás alatt */
  isProcessing: boolean;
  /** Utolsó hiba */
  lastError: string | null;
  /** Létrehozva */
  createdAt: Date;
}

/**
 * Retry művelet eredmény
 */
export interface RetryResult {
  /** Sikeres-e */
  success: boolean;
  /** Folytatható-e a retry */
  shouldRetry: boolean;
  /** Következő retry időpont */
  nextRetryAt?: Date;
  /** Hiba (ha van) */
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Queue statisztika
 */
export interface QueueStats {
  /** Összes elem */
  total: number;
  /** Várakozó elemek */
  pending: number;
  /** Feldolgozás alatt */
  processing: number;
  /** Sikeres */
  succeeded: number;
  /** Sikertelen */
  failed: number;
  /** Következő feldolgozás */
  nextScheduledAt: Date | null;
}
