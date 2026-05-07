/**
 * Configuración centralizada de la API
 * Modificar este archivo para cambiar el endpoint base
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://prode-api.neps.com.ar/api',
  CDN_URL: import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://prode-api.neps.com.ar',
  TIMEOUT: import.meta.env.VITE_API_TIMEOUT ? parseInt(import.meta.env.VITE_API_TIMEOUT) : 15000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/Auth/login'
    }
  }
} as const;
