/**
 * @kgc/common - Query parameter utilities
 * Safe parsing utilities for query parameters
 */

/**
 * Safely parse integer from string query parameter
 * Returns undefined if the value is not a valid integer
 *
 * @param value - String value to parse
 * @param options - Optional constraints
 * @returns Parsed integer or undefined if invalid
 */
export function parseIntParam(
  value: string | undefined,
  options?: { min?: number; max?: number }
): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return undefined;
  }

  if (options?.min !== undefined && parsed < options.min) {
    return options.min;
  }

  if (options?.max !== undefined && parsed > options.max) {
    return options.max;
  }

  return parsed;
}

/**
 * Safely parse date from string query parameter
 * Returns undefined if the value is not a valid date
 *
 * @param value - String value to parse (ISO 8601 format)
 * @returns Parsed Date or undefined if invalid
 */
export function parseDateParam(value: string | undefined): Date | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = new Date(value);

  if (isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

/**
 * Parse boolean from string query parameter
 * Returns undefined if not 'true' or 'false'
 *
 * @param value - String value to parse
 * @returns Boolean or undefined if invalid
 */
export function parseBooleanParam(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}
