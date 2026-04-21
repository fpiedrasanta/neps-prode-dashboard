/**
 * Configuración centralizada de la API
 * Modificar este archivo para cambiar el endpoint base
 */

export const API_CONFIG = {
  BASE_URL: 'https://prode-api.neps.com.ar/api',
  CDN_URL: 'https://prode-api.neps.com.ar',
  TIMEOUT: 15000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/Auth/login'
    }
  }
} as const;
