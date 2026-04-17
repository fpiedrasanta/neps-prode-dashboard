/**
 * Servicio de Autenticación
 * Capa de negocio separada - toda la lógica de login y sesión reside aquí
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { API_CONFIG } from '../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  email: string;
  fullName: string;
  avatarUrl: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  countryId: string;
  countryDescription: string;
  roles: string[];
  requiresEmailVerification: boolean;
}

class AuthService {
  private apiClient: AxiosInstance;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      const authData = response.data;
      
      // Verificar que sea usuario ADMIN
      const isAdmin = authData.roles?.some(r => r.toLowerCase() === 'admin');
      if (!isAdmin) {
        throw new Error('Acceso denegado. Solo administradores pueden ingresar.');
      }

      this.saveSession(authData);
      return authData;
  } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message);
      }
      throw new Error('Error al iniciar sesión. Verifique sus credenciales.');
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  private saveSession(authData: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authData.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify({
      email: authData.email,
      fullName: authData.fullName,
      avatarUrl: authData.avatarUrl,
      roles: authData.roles
    }));
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const user = localStorage.getItem(this.USER_KEY);
    
    if (!token || !user) return false;
    
    try {
      const userData = JSON.parse(user);
      return userData.roles?.some((r: string) => r.toLowerCase() === 'admin') ?? false;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) as User : null;
  }
}

// Singleton instance
export const authService = new AuthService();