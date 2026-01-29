import { useAuthStore } from '@/stores/auth-store';

const API_BASE = '/api/v1';

interface RequestOptions extends RequestInit {
  auth?: boolean;
  tenantId?: string;
  _isRetry?: boolean; // Internal flag for token refresh retry
}

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getHeaders(options: RequestOptions = {}): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.auth !== false) {
      const { accessToken, user } = useAuthStore.getState();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      // Add tenant ID from explicit option or user context
      const tenantId = options.tenantId ?? (user as { tenantId?: string } | null)?.tenantId;
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      }
    }

    return headers;
  }

  /**
   * Attempt to refresh the access token using the refresh token
   * Returns true if refresh succeeded, false otherwise
   */
  private async refreshToken(): Promise<boolean> {
    // Prevent multiple concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefreshToken();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<boolean> {
    const { refreshToken, setTokens, logout } = useAuthStore.getState();

    if (!refreshToken) {
      logout();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh token invalid/expired - logout user
        logout();
        window.location.href = '/login';
        return false;
      }

      const data = await response.json();
      // Backend wraps response in { data: { accessToken, refreshToken } }
      setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      logout();
      window.location.href = '/login';
      return false;
    }
  }

  /**
   * Handle 401 Unauthorized response
   * Attempts token refresh, or logs out if refresh fails
   */
  private async handle401(endpoint: string, options: RequestOptions): Promise<Response | null> {
    // Don't retry if this was already a retry or if auth is disabled
    if (options._isRetry || options.auth === false) {
      return null;
    }

    // Try to refresh the token
    const refreshed = await this.refreshToken();

    if (refreshed) {
      // Retry the original request with new token
      const retryOptions: RequestInit = {
        ...options,
        headers: this.getHeaders({ ...options, _isRetry: true }),
      };
      return fetch(`${API_BASE}${endpoint}`, retryOptions);
    }

    return null;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    let response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: this.getHeaders(options),
    });

    // Handle 401 - attempt token refresh
    if (response.status === 401 && options.auth !== false && !options._isRetry) {
      const retryResponse = await this.handle401(endpoint, options);
      if (retryResponse) {
        response = retryResponse;
      } else {
        // Refresh failed - user will be logged out and redirected
        throw new Error('A munkamenet lejárt. Kérjük, jelentkezzen be újra.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
