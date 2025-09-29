// API service for communicating with the backend
import type { GameSession, GameRound, GameResult } from '../types/game';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'include',
      ...options,
    };

    try {
      console.log(`Making API request to: ${url}`, config);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`API Error ${response.status}:`, errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data.data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check if the backend server is running on port 3001');
      }
      throw error;
    }
  }

  // Game API methods
  async startGameSession(gameMode: 'daily' | 'streak', playerId?: string): Promise<GameSession> {
    return this.request<GameSession>('/game/start', {
      method: 'POST',
      body: JSON.stringify({
        game_mode: gameMode,
        player_id: playerId,
      }),
    });
  }

  async getNextPair(sessionId: string): Promise<GameRound> {
    return this.request<GameRound>(`/game/sessions/${sessionId}/next-pair`);
  }

  async submitChoice(
    sessionId: string,
    pairId: string,
    choice: 'ai' | 'real',
    responseTime: number
  ): Promise<GameResult> {
    return this.request<GameResult>(`/game/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        pair_id: pairId,
        player_choice: choice,
        response_time: responseTime,
      }),
    });
  }

  async endGameSession(sessionId: string): Promise<any> {
    return this.request(`/game/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  }

  async checkDailyChallenge(playerId: string): Promise<{
    available: boolean;
    date: string;
    player_id: string;
  }> {
    return this.request(`/game/daily-challenge/${playerId}`);
  }

  async getLeaderboard(gameMode?: 'daily' | 'streak', limit: number = 10): Promise<any[]> {
    const params = new URLSearchParams();
    if (gameMode) params.append('mode', gameMode);
    params.append('limit', limit.toString());
    
    return this.request(`/game/leaderboard?${params}`);
  }

  // Image API methods
  getImageUrl(storedFilename: string): string {
    return `${API_BASE_URL}/images/${storedFilename}/file`;
  }

  // Health check
  async healthCheck(): Promise<any> {
    const url = `${API_BASE_URL}/health`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Health check failed');
      }

      return data; // Return the full response for health check
    } catch (error) {
      console.error(`Health check failed:`, error);
      throw error;
    }
  }


}

export const apiService = new ApiService();
export default apiService;

// Re-export types for convenience
export type { GameSession, ImagePair, GameRound, GameResult } from '../types/game';

export { API_BASE_URL };