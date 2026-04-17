import axios from 'axios';
import { API_CONFIG } from './api';

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para agregar token en cada solicitud
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores globales
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // REDIRIGIR AL LOGIN PARA CUALQUIER ERROR 401 Unauthorized
    // Funciona para TODOS los endpoints
    if (error.response?.status === 401) {
      // Limpiar todo lo guardado
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Redirigir forzosamente al login
      window.location.replace('/login');
    }
    
    return Promise.reject(error);
  }
);
