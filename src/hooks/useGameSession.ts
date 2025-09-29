import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { GameSession, GameRound } from '../types/game';

export interface GameState {
  session: GameSession | null;
  currentRound: GameRound | null;
  isLoading: boolean;
  error: string | null;
  gameStarted: boolean;
  gameCompleted: boolean;
  totalScore: number;
  currentStreak: number;
  roundsCompleted: number;
  final_stats?: {
    correct_answers: number;
    total_rounds: number;
    accuracy_percentage: number;
    average_response_time: number;
  };
}

export const useGameSession = () => {
  const [gameState, setGameState] = useState<GameState>({
    session: null,
    currentRound: null,
    isLoading: false,
    error: null,
    gameStarted: false,
    gameCompleted: false,
    totalScore: 0,
    currentStreak: 0,
    roundsCompleted: 0,
    final_stats: undefined,
  });

  const startGame = useCallback(async (gameMode: 'daily' | 'streak', playerId?: string) => {
    setGameState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const session = await apiService.startGameSession(gameMode, playerId);
      const firstRound = await apiService.getNextPair(session.session_id);
      
      setGameState(prev => ({
        ...prev,
        session,
        currentRound: firstRound,
        gameStarted: true,
        gameCompleted: false,
        isLoading: false,
        totalScore: firstRound.total_score,
        currentStreak: firstRound.current_streak,
        roundsCompleted: 0,
      }));
      
      return { session, firstRound };
    } catch (error: any) {
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to start game',
      }));
      throw error;
    }
  }, []);

  const submitChoice = useCallback(async (choice: 'ai' | 'real', responseTime: number) => {
    if (!gameState.session || !gameState.currentRound) {
      throw new Error('No active game session');
    }

    setGameState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiService.submitChoice(
        gameState.session.session_id,
        gameState.currentRound.pair.pair_id,
        choice,
        responseTime
      );

      // Update game state with result
      const newRoundsCompleted = gameState.roundsCompleted + 1;
      const newTotalScore = result.final_result?.total_score || gameState.totalScore + result.points_earned;
      const newCurrentStreak = result.final_result?.current_streak !== undefined ? result.final_result.current_streak : gameState.currentStreak + (result.is_correct ? 1 : 0);

      setGameState(prev => ({
        ...prev,
        isLoading: false,
        roundsCompleted: newRoundsCompleted,
        totalScore: newTotalScore,
        currentStreak: newCurrentStreak,
        gameCompleted: result.game_completed || false,
        final_stats: result.final_result?.final_stats,
      }));

      // Don't automatically fetch next round - let the component decide
      if (result.game_completed) {
        setGameState(prev => ({ ...prev, currentRound: null }));
      }

      return result;
    } catch (error: any) {
      setGameState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to submit choice',
      }));
      throw error;
    }
  }, [gameState.session, gameState.currentRound, gameState.roundsCompleted, gameState.totalScore, gameState.currentStreak]);

  const resetGame = useCallback(() => {
    setGameState({
      session: null,
      currentRound: null,
      isLoading: false,
      error: null,
      gameStarted: false,
      gameCompleted: false,
      totalScore: 0,
      currentStreak: 0,
      roundsCompleted: 0,
      final_stats: undefined,
    });
  }, []);

  const getNextRound = useCallback(async () => {
    if (!gameState.session) {
      throw new Error('No active game session');
    }

    setGameState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const nextRound = await apiService.getNextPair(gameState.session.session_id);
      setGameState(prev => ({
        ...prev,
        currentRound: nextRound,
        isLoading: false,
      }));
      return nextRound;
    } catch (error: any) {
      // If no more rounds available, game is completed
      if (error.message.includes('No more') || error.message.includes('completed')) {
        setGameState(prev => ({ ...prev, gameCompleted: true, currentRound: null, isLoading: false }));
      } else {
        setGameState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to get next round',
        }));
        throw error;
      }
    }
  }, [gameState.session]);

  const clearError = useCallback(() => {
    setGameState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    gameState,
    startGame,
    submitChoice,
    getNextRound,
    resetGame,
    clearError,
  };
};