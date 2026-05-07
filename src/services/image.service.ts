import { api } from '../config/axios';

export interface Image {
  id: string;
  fileName: string;
  url: string;
  name: string;
  type: string;
  date: string;
}

export interface ImageListResponse {
  items: Image[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const imageService = {
  async getImages(pageNumber: number = 1, pageSize: number = 10, search?: string): Promise<ImageListResponse> {
    const params = new URLSearchParams();
    params.append('PageNumber', pageNumber.toString());
    params.append('PageSize', pageSize.toString());
    
    if (search && search.trim()) {
      params.append('Search', search.trim());
    }
    
    const response = await api.get(`/Images?${params.toString()}`);
    return response.data;
  },

  async uploadImages(files: Array<{ file: File; name: string }>): Promise<Image[]> {
    const formData = new FormData();
    
    // ✅ Formato correcto que espera el endpoint: dos arrays paralelos
    files.forEach(item => {
      formData.append('files', item.file);
    });
    
    files.forEach(item => {
      formData.append('names', item.name.trim() || item.file.name);
    });
    
    const response = await api.post(`/Images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  async getImage(id: string): Promise<Image> {
    const response = await api.get(`/Images/${id}`);
    return response.data;
  },

  async deleteImage(id: string): Promise<void> {
    await api.delete(`/Images/${id}`);
  }
};