// Game-related TypeScript interfaces

export interface GameSession {
  session_id: string;
  game_mode: 'daily' | 'streak';
  start_time: string;
  player_id?: string;
}

export interface ImagePair {
  pair_id: string;
  ai_image: {
    id: string;
    filename: string;
    storedFilename: string;
    category: string;
    difficulty_level: number;
  };
  real_image: {
    id: string;
    filename: string;
    storedFilename: string;
    category: string;
    difficulty_level: number;
  };
  category: string;
  difficulty_level: number;
}

export interface GameRound {
  session_id: string;
  pair: ImagePair;
  round_number: number;
  current_streak: number;
  total_score: number;
}

export interface GameResult {
  round_id: string;
  is_correct: boolean;
  points_earned: number;
  correct_answer: 'ai' | 'real';
  player_choice: 'ai' | 'real';
  response_time: number;
  game_completed?: boolean;
  final_result?: {
    session_id: string;
    total_score: number;
    rounds_completed: number;
    current_streak: number;
    is_completed: boolean;
    final_stats: {
      correct_answers: number;
      total_rounds: number;
      accuracy_percentage: number;
      average_response_time: number;
    };
  };
}