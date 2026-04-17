/**
 * Configuración centralizada de la API
 * Modificar este archivo para cambiar el endpoint base
 */

export const API_CONFIG = {
  BASE_URL: 'https://localhost:7163/api',
  CDN_URL: 'https://localhost:7163',
  TIMEOUT: 15000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/Auth/login'
    }
  }
} as const;
