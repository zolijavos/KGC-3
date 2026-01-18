import type { User } from '@/stores/auth-store';
import { api } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LogoutResponse {
  message: string;
}

export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data, { auth: false }),
  logout: () => api.post<LogoutResponse>('/auth/logout'),
};
