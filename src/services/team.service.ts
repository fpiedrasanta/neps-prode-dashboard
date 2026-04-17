import { api } from '../config/axios';
import { API_CONFIG } from '../config/api';

export interface Team {
  id: string;
  name: string;
  flagUrl: string;
  countryId: string;
  countryName: string;
}

export interface TeamsResponse {
  items: Team[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TeamCreatePayload {
  name: string;
  countryId: string;
  flagImage: File | null;
}

export interface TeamUpdatePayload {
  id: string;
  name: string;
  countryId: string;
  flagImage?: File | null;
}

export const teamService = {
  async getTeams(
    search?: string,
    orderBy: string = 'name',
    orderDescending: boolean = false,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Promise<TeamsResponse> {
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    params.append('orderBy', orderBy);
    params.append('orderDescending', orderDescending.toString());
    params.append('pageNumber', pageNumber.toString());
    params.append('pageSize', pageSize.toString());

    const response = await api.get(`/Teams?${params.toString()}`);
    return response.data;
  },

  async createTeam(payload: TeamCreatePayload): Promise<Team> {
    const formData = new FormData();
    
    formData.append('name', payload.name);
    formData.append('countryId', payload.countryId);
    if (payload.flagImage) formData.append('flagImage', payload.flagImage);

    const response = await api.post('/Teams', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  async updateTeam(payload: TeamUpdatePayload): Promise<Team> {
    const formData = new FormData();
    
    formData.append('name', payload.name);
    formData.append('countryId', payload.countryId);
    if (payload.flagImage) formData.append('flagImage', payload.flagImage);

    const response = await api.put(`/Teams/${payload.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  async deleteTeam(teamId: string): Promise<void> {
    await api.delete(`/Teams/${teamId}`);
  },

  getFlagFullUrl: (flagUrl: string): string => {
    if (!flagUrl) return '';
    if (flagUrl.startsWith('http')) return flagUrl;
    return `${API_CONFIG.CDN_URL}${flagUrl}`;
  }
};