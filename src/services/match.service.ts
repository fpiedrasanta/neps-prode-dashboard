import { api } from '../config/axios';

export interface Country {
  id: string;
  name: string;
  isoCode: string;
  isoCode2?: string | null;
  flagUrl: string;
}

export interface Team {
  id: string;
  name: string;
  flagUrl: string;
  country: Country;
}

export interface City {
  id: string;
  name: string;
  country: Country;
}

export interface UserPrediction {
  id: string;
  homeGoals: number;
  awayGoals: number;
  createdAt: string;
  updatedAt: string;
  points?: number | null;
}

export interface PredictionStats {
  homeWinPercentage: number;
  drawPercentage: number;
  awayWinPercentage: number;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  matchDate: string;
  city: City;
  country: Country;
  homeScore?: number | null;
  awayScore?: number | null;
  userPrediction?: UserPrediction | null;
  points?: number | null;
  predictionStats?: PredictionStats | null;
  status: 1 | 2 | 3;
  group?: string;
}

export interface MatchResultPayload {
  homeScore: number;
  awayScore: number;
}

export interface MatchesResponse {
  items: Match[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export const matchService = {
  async getMatches(
    status?: 1 | 2 | 3,
    teamNameSearch?: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Promise<MatchesResponse> {
    const params = new URLSearchParams();
    
    if (status) params.append('status', status.toString());
    if (teamNameSearch) params.append('teamNameSearch', teamNameSearch);
    params.append('pageNumber', pageNumber.toString());
    params.append('pageSize', pageSize.toString());

    const response = await api.get(`/Matches?${params.toString()}`);
    return response.data;
  },

  async updateMatchResult(matchId: string, payload: MatchResultPayload): Promise<void> {
    await api.patch(`/Matches/${matchId}/scores`, payload);
  },

  async createMatch(payload: {
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    cityId: string;
    countryId: string;
  }): Promise<Match> {
    const response = await api.post('/Matches', payload);
    return response.data;
  },

  async updateMatch(matchId: string, payload: {
    homeTeamId: string;
    awayTeamId: string;
    matchDate: string;
    cityId: string;
    countryId: string;
  }): Promise<Match> {
    const response = await api.put(`/Matches/${matchId}`, payload);
    return response.data;
  },

  async deleteMatch(matchId: string): Promise<void> {
    await api.delete(`/Matches/${matchId}`);
  }
};
