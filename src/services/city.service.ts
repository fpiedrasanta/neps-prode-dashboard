import { api } from '../config/axios';

export interface City {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
}

export interface CitiesResponse {
  items: City[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CityCreatePayload {
  name: string;
  countryId: string;
}

export interface CityUpdatePayload {
  id: string;
  name: string;
  countryId: string;
}

export const cityService = {
  async getCities(
    countryId: string,
    search?: string,
    orderBy: string = 'name',
    orderDescending: boolean = false,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Promise<CitiesResponse> {
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    params.append('orderBy', orderBy);
    params.append('orderDescending', orderDescending.toString());
    params.append('pageNumber', pageNumber.toString());
    params.append('pageSize', pageSize.toString());

    const response = await api.get(`/Cities/country/${countryId}?${params.toString()}`);
    return response.data;
  },

  async createCity(payload: CityCreatePayload): Promise<City> {
    const response = await api.post('/Cities', payload);
    return response.data;
  },

  async updateCity(payload: CityUpdatePayload): Promise<City> {
    const response = await api.put(`/Cities/${payload.id}`, payload);
    return response.data;
  },

  async deleteCity(cityId: string): Promise<void> {
    await api.delete(`/Cities/${cityId}`);
  }
};