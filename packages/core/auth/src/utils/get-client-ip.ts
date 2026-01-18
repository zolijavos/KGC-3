/**
 * Client IP Address Utility
 * G-L1 FIX: Unified IP extraction logic across auth module
 *
 * SECURITY: Uses req.ip as the primary source because:
 * 1. req.ip is set by Express based on 'trust proxy' configuration
 * 2. x-forwarded-for header can be spoofed by malicious clients
 * 3. When behind a trusted reverse proxy (nginx/k8s), Express handles
 *    x-forwarded-for parsing securely via trust proxy settings
 *
 * Configuration:
 * - In production with reverse proxy: Set app.set('trust proxy', 1)
 * - This makes req.ip extract the correct client IP from x-forwarded-for
 * - Without trust proxy, req.ip is the direct connection IP
 */

import type { Request } from 'express';

/**
 * Extract client IP address from request
 *
 * IMPORTANT: Relies on Express 'trust proxy' configuration for proxy environments.
 * Do NOT manually parse x-forwarded-for as it can be spoofed.
 *
 * @param request - Express Request object
 * @returns Client IP address or 'unknown' if unavailable
 */
export function getClientIp(request: Request): string {
  // SECURITY: Use req.ip which respects Express trust proxy configuration
  // This is the correct way to get client IP in both direct and proxied scenarios
  return request.ip ?? 'unknown';
}

/**
 * Extract client IP address from request-like object
 * Used by guards that receive a generic Record<string, unknown>
 *
 * @param req - Request-like object with ip property
 * @returns Client IP address or 'unknown' if unavailable
 */
export function getClientIpFromRecord(req: Record<string, unknown>): string {
  const ip = req['ip'];
  if (typeof ip === 'string' && ip.length > 0) {
    return ip;
  }
  return 'unknown';
}
