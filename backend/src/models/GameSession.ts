import { z } from 'zod';

export const GameModeSchema = z.enum(['daily', 'streak']);

export const GameSessionSchema = z.object({
  session_id: z.string().uuid(),
  player_id: z.string().optional(),
  game_mode: GameModeSchema,
  start_time: z.date(),
  end_time: z.date().optional(),
  total_score: z.number().min(0).default(0),
  rounds_completed: z.number().min(0).default(0),
  current_streak: z.number().min(0).default(0),
  is_completed: z.boolean().default(false),
  daily_challenge_date: z.string().optional() // YYYY-MM-DD format
});

export const CreateGameSessionSchema = z.object({
  game_mode: GameModeSchema,
  player_id: z.string().optional()
});

export const GameRoundSchema = z.object({
  round_id: z.string().uuid(),
  session_id: z.string().uuid(),
  pair_id: z.string().uuid(),
  player_choice: z.enum(['ai', 'real']),
  correct_answer: z.enum(['ai', 'real']),
  is_correct: z.boolean(),
  response_time: z.number().min(0), // milliseconds
  points_earned: z.number().min(0),
  round_number: z.number().min(1),
  timestamp: z.date()
});

export const CreateGameRoundSchema = z.object({
  session_id: z.string().uuid(),
  pair_id: z.string().uuid(),
  player_choice: z.enum(['ai', 'real']),
  response_time: z.number().min(0)
});

// TypeScript types
export type GameMode = z.infer<typeof GameModeSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type CreateGameSessionData = z.infer<typeof CreateGameSessionSchema>;
export type GameRound = z.infer<typeof GameRoundSchema>;
export type CreateGameRoundData = z.infer<typeof CreateGameRoundSchema>;

// Game session with rounds
export interface GameSessionWithRounds extends GameSession {
  rounds: GameRound[];
}

// Player choice type
export type PlayerChoice = 'ai' | 'real';

// Game result
export interface GameResult {
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
}