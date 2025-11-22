import { apiClient } from './client';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface User {
  userId: string;
  username: string;
  email: string;
  createdAt?: string;
}

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  updateUsername: async (username: string): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/username', { username });
    return response.data;
  },
};
