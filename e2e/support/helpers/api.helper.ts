import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * KGC ERP - API Helper
 *
 * API hívások egyszerűsítése tesztekhez.
 * Támogatja a multi-tenant kontextust és YOLO módot.
 */

export interface ApiOptions {
  tenantId?: string;
  token?: string;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Record<string, string>;
}

/**
 * API Helper class for simplified API calls
 */
export class ApiHelper {
  private request: APIRequestContext;
  private baseOptions: ApiOptions;

  constructor(request: APIRequestContext, options: ApiOptions = {}) {
    this.request = request;
    this.baseOptions = options;
  }

  /**
   * Build headers with tenant and auth context
   */
  private buildHeaders(options: ApiOptions = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const tenantId = options.tenantId ?? this.baseOptions.tenantId;
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    const token = options.token ?? this.baseOptions.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Parse response to typed format
   */
  private async parseResponse<T>(response: APIResponse): Promise<ApiResponse<T>> {
    let data: T;
    try {
      data = await response.json();
    } catch {
      data = (await response.text()) as unknown as T;
    }

    const headers: Record<string, string> = {};
    for (const [key, value] of response.headersArray()) {
      headers[key] = value;
    }

    return {
      status: response.status(),
      ok: response.ok(),
      data,
      headers,
    };
  }

  /**
   * GET request
   */
  async get<T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const response = await this.request.get(path, {
      headers: this.buildHeaders(options),
      timeout: options.timeout ?? this.baseOptions.timeout,
    });
    return this.parseResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    path: string,
    body: unknown,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const response = await this.request.post(path, {
      data: body,
      headers: this.buildHeaders(options),
      timeout: options.timeout ?? this.baseOptions.timeout,
    });
    return this.parseResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    path: string,
    body: unknown,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const response = await this.request.put(path, {
      data: body,
      headers: this.buildHeaders(options),
      timeout: options.timeout ?? this.baseOptions.timeout,
    });
    return this.parseResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    path: string,
    body: unknown,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const response = await this.request.patch(path, {
      data: body,
      headers: this.buildHeaders(options),
      timeout: options.timeout ?? this.baseOptions.timeout,
    });
    return this.parseResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const response = await this.request.delete(path, {
      headers: this.buildHeaders(options),
      timeout: options.timeout ?? this.baseOptions.timeout,
    });
    return this.parseResponse<T>(response);
  }

  /**
   * Login and get auth token
   */
  async login(email: string, password: string): Promise<string> {
    const response = await this.post<{ token: string }>('/api/auth/login', {
      email,
      password,
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    return response.data.token;
  }

  /**
   * Set default tenant for all requests
   */
  setTenant(tenantId: string): void {
    this.baseOptions.tenantId = tenantId;
  }

  /**
   * Set auth token for all requests
   */
  setToken(token: string): void {
    this.baseOptions.token = token;
  }
}

/**
 * Create API helper from request context
 */
export function createApiHelper(request: APIRequestContext, options?: ApiOptions): ApiHelper {
  return new ApiHelper(request, options);
}
