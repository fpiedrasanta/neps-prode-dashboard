import { api } from '../config/axios';
import { API_CONFIG } from '../config/api';

export interface Country {
  id: string;
  name: string;
  isoCode: string;
  isoCode2?: string | null;
  flagUrl: string;
}

export interface CountriesResponse {
  items: Country[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CountryCreatePayload {
  name: string;
  isoCode: string;
  isoCode2?: string;
  flagImage: File | null;
}

export interface CountryUpdatePayload {
  id: string;
  name: string;
  isoCode: string;
  isoCode2?: string;
  flagImage?: File | null;
}

export const countryService = {
  async getCountries(
    search?: string,
    orderBy: string = 'name',
    orderDescending: boolean = false,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Promise<CountriesResponse> {
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    params.append('orderBy', orderBy);
    params.append('orderDescending', orderDescending.toString());
    params.append('pageNumber', pageNumber.toString());
    params.append('pageSize', pageSize.toString());

    const response = await api.get(`/Countries?${params.toString()}`);
    return response.data;
  },

  async createCountry(payload: CountryCreatePayload): Promise<Country> {
    const formData = new FormData();
    
    formData.append('name', payload.name);
    formData.append('isoCode', payload.isoCode);
    if (payload.isoCode2) formData.append('isoCode2', payload.isoCode2);
    if (payload.flagImage) formData.append('flagImage', payload.flagImage);

    const response = await api.post('/Countries', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  async updateCountry(payload: CountryUpdatePayload): Promise<Country> {
    const formData = new FormData();
    
    formData.append('name', payload.name);
    formData.append('isoCode', payload.isoCode);
    if (payload.isoCode2) formData.append('isoCode2', payload.isoCode2);
    if (payload.flagImage) formData.append('flagImage', payload.flagImage);

    const response = await api.put(`/Countries/${payload.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  async deleteCountry(countryId: string): Promise<void> {
    await api.delete(`/Countries/${countryId}`);
  },

  getFlagFullUrl: (flagUrl: string): string => {
    if (!flagUrl) return '';
    if (flagUrl.startsWith('http')) return flagUrl;
    return `${API_CONFIG.CDN_URL}${flagUrl}`;
  }
};