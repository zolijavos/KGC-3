import type { User } from '@/stores/auth-store';
import { api } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

// Backend response format (wrapped in data)
interface LoginApiResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

// Frontend-facing response format
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LogoutResponse {
  message: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginApiResponse>('/auth/login', data, { auth: false });
    // Unwrap the data property from backend response
    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: {
        id: response.data.user.id,
        email: response.data.user.email,
        name: response.data.user.name,
        role: response.data.user.role,
      },
    };
  },
  logout: () => api.post<LogoutResponse>('/auth/logout'),
};
