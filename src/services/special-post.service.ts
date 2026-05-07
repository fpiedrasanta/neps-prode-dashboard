import { api } from '../config/axios';

export interface SpecialPost {
  id: string;
  isSpecialPost: boolean;
  title: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string | null;
  userFullName?: string | null;
  matchId?: string | null;
  comments?: Array<{
    id: string;
    content: string;
    userId: string;
    userName: string;
    createdAt: string;
  }>;
}

export interface SpecialPostPayload {
  title: string;
  content: string;
}

export interface SpecialPostListResponse {
  posts: SpecialPost[];
  totalCount: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}


export const specialPostService = {
  async getSpecialPosts(pageNumber: number = 1, pageSize: number = 10, search?: string): Promise<SpecialPostListResponse> {
    const params = new URLSearchParams();
    params.append('pageNumber', pageNumber.toString());
    params.append('pageSize', pageSize.toString());
    
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    
    const response = await api.get(`/posts/special?${params.toString()}`);
    return response.data;
  },

  async createSpecialPost(payload: SpecialPostPayload): Promise<SpecialPost> {
    const response = await api.post(`/posts/special`, payload);
    return response.data;
  },

  async updateSpecialPost(id: string, payload: SpecialPostPayload): Promise<SpecialPost> {
    const response = await api.put(`/posts/special/${id}`, payload);
    return response.data;
  },

  async deleteSpecialPost(id: string): Promise<void> {
    await api.delete(`/posts/special/${id}`);
  }
};
