import { v4 as uuidv4 } from "uuid";
import {
  GameSession,
  GameRound,
  CreateGameSessionData,
  CreateGameRoundData,
  GameResult,
  PlayerChoice,
} from "../models/GameSession";
import { DatabaseService } from "./DatabaseService";
import { ImagePairService } from "./ImagePairService";

export class GameService {
  private db: DatabaseService;
  private pairService: ImagePairService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.pairService = new ImagePairService();
  }

  public async startGameSession(
    data: CreateGameSessionData
  ): Promise<GameSession> {
    try {
      const session: GameSession = {
        session_id: uuidv4(),
        player_id: data.player_id,
        game_mode: data.game_mode,
        start_time: new Date(),
        total_score: 0,
        rounds_completed: 0,
        current_streak: 0,
        is_completed: false,
        daily_challenge_date:
          data.game_mode === "daily" ? this.getTodayString() : undefined,
      };

      // Check if daily challenge already completed today
      if (data.game_mode === "daily" && data.player_id) {
        const existingSession = await this.getTodaysDailySession(
          data.player_id
        );
        if (existingSession && existingSession.is_completed) {
          throw new Error("Daily challenge already completed today");
        }
      }

      await this.db.createGameSession(session);
      console.log(
        `Game session started: ${session.session_id} (${session.game_mode})`
      );

      return session;
    } catch (error) {
      console.error("Error starting game session:", error);
      throw error;
    }
  }

  public async getGameSession(sessionId: string): Promise<GameSession | null> {
    return await this.db.getGameSession(sessionId);
  }

  public async getNextPairForGame(sessionId: string): Promise<any> {
    try {
      const session = await this.db.getGameSession(sessionId);
      if (!session) {
        throw new Error("Game session not found");
      }

      if (session.is_completed) {
        throw new Error("Game session is already completed");
      }

      // Get rounds already played in this session
      const playedRounds = await this.db.getGameRoundsBySession(sessionId);
      const usedPairIds = playedRounds.map((round) => round.pair_id);

      // Determine difficulty based on game mode and progress
      let difficulty: number | undefined;
      if (session.game_mode === "daily") {
        // Daily mode: use available difficulty levels
        // Get available difficulty levels from existing pairs
        const allPairs = await this.pairService.getAllImagePairs({
          is_active: true,
        });
        const availableDifficulties = [
          ...new Set(allPairs.pairs.map((p) => p.difficulty_level)),
        ].sort();

        if (availableDifficulties.length > 0) {
          const roundNumber = playedRounds.length + 1;
          // Distribute available difficulties across 3 rounds
          if (availableDifficulties.length === 1) {
            // Only one difficulty available - use it for all rounds
            difficulty = availableDifficulties[0];
          } else if (availableDifficulties.length >= 3) {
            // Multiple difficulties - use progression
            if (roundNumber === 1)
              difficulty = availableDifficulties[0]; // Easiest
            else if (roundNumber === 2)
              difficulty =
                availableDifficulties[
                  Math.floor(availableDifficulties.length / 2)
                ];
            // Medium
            else
              difficulty =
                availableDifficulties[availableDifficulties.length - 1]; // Hardest
          } else {
            // Two difficulties - alternate
            difficulty = availableDifficulties[roundNumber <= 2 ? 0 : 1];
          }
        }
        // If no specific difficulty found, let it be undefined (any difficulty)
      } else if (session.game_mode === "streak") {
        // Streak mode: progressive difficulty
        const streak = session.current_streak;
        if (streak < 3) difficulty = 1;
        else if (streak < 7) difficulty = 2;
        else if (streak < 12) difficulty = 3;
        else if (streak < 20) difficulty = 4;
        else difficulty = 5; // Maximum difficulty
      }

      // Select appropriate pair
      let pair = await this.pairService.selectPairForGame({
        difficulty,
        excludePairIds: usedPairIds,
        activeOnly: true,
      });

      // If no pair found with specific difficulty, try without difficulty constraint
      if (!pair && difficulty !== undefined) {
        pair = await this.pairService.selectPairForGame({
          excludePairIds: usedPairIds,
          activeOnly: true,
        });
      }

      // If still no pair found, try without excluding used pairs (allow repeats)
      if (!pair) {
        pair = await this.pairService.selectPairForGame({
          difficulty,
          activeOnly: true,
        });
      }

      // Last resort: try any active pair
      if (!pair) {
        pair = await this.pairService.selectPairForGame({
          activeOnly: true,
        });
      }

      if (!pair) {
        // Check if there are any images at all
        const allImages = await this.pairService.getAllImagePairs({
          is_active: true,
        });
        if (allImages.pairs.length === 0) {
          throw new Error(
            "No image pairs available. Please upload images and create pairs through the admin panel first."
          );
        } else {
          throw new Error(
            "No suitable image pairs available for this game mode. Try again or add more image pairs."
          );
        }
      }

      // Get pair with full image data
      const pairWithImages = await this.pairService.getImagePairWithImages(
        pair.pair_id
      );
      if (!pairWithImages) {
        throw new Error("Failed to load image pair data");
      }

      return {
        session_id: sessionId,
        pair: pairWithImages,
        round_number: playedRounds.length + 1,
        current_streak: session.current_streak,
        total_score: session.total_score,
      };
    } catch (error) {
      console.error("Error getting next pair:", error);
      throw error;
    }
  }

  public async submitPlayerChoice(data: CreateGameRoundData): Promise<{
    round: GameRound;
    isCorrect: boolean;
    pointsEarned: number;
    gameResult?: GameResult;
  }> {
    try {
      const session = await this.db.getGameSession(data.session_id);
      if (!session) {
        throw new Error("Game session not found");
      }

      if (session.is_completed) {
        throw new Error("Game session is already completed");
      }

      // Get the image pair to determine correct answer
      const pair = await this.pairService.getImagePairById(data.pair_id);
      if (!pair) {
        throw new Error("Image pair not found");
      }

      // Determine correct answer (which image is AI-generated)
      const correctAnswer: PlayerChoice = "ai"; // Player should choose the AI image

      // Check if player's choice is correct
      const isCorrect = data.player_choice === correctAnswer;

      // Calculate points
      const pointsEarned = this.calculatePoints(
        isCorrect,
        data.response_time,
        pair.difficulty_level,
        session.current_streak,
        session.game_mode
      );

      // Get current round number
      const existingRounds = await this.db.getGameRoundsBySession(
        data.session_id
      );
      const roundNumber = existingRounds.length + 1;

      // Create game round
      const round: GameRound = {
        round_id: uuidv4(),
        session_id: data.session_id,
        pair_id: data.pair_id,
        player_choice: data.player_choice,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        response_time: data.response_time,
        points_earned: pointsEarned,
        round_number: roundNumber,
        timestamp: new Date(),
      };

      await this.db.createGameRound(round);

      // Update session statistics
      const newTotalScore = session.total_score + pointsEarned;
      const newRoundsCompleted = session.rounds_completed + 1;
      let newCurrentStreak = session.current_streak;

      if (session.game_mode === "streak") {
        if (isCorrect) {
          newCurrentStreak += 1;
        } else {
          // Streak broken - end the game
          const gameResult = await this.endGameSession(data.session_id, {
            total_score: newTotalScore,
            rounds_completed: newRoundsCompleted,
            current_streak: newCurrentStreak,
            is_completed: true,
            end_time: new Date(),
          });

          // Update pair statistics
          await this.pairService.updatePairStats(
            data.pair_id,
            isCorrect,
            data.response_time
          );

          return { round, isCorrect, pointsEarned, gameResult };
        }
      } else if (session.game_mode === "daily") {
        // Daily mode: complete after 3 rounds
        if (newRoundsCompleted >= 3) {
          const gameResult = await this.endGameSession(data.session_id, {
            total_score: newTotalScore,
            rounds_completed: newRoundsCompleted,
            current_streak: newCurrentStreak,
            is_completed: true,
            end_time: new Date(),
          });

          // Update pair statistics
          await this.pairService.updatePairStats(
            data.pair_id,
            isCorrect,
            data.response_time
          );

          return { round, isCorrect, pointsEarned, gameResult };
        }
      }

      // Update session (game continues)
      await this.db.updateGameSession(data.session_id, {
        total_score: newTotalScore,
        rounds_completed: newRoundsCompleted,
        current_streak: newCurrentStreak,
      });

      // Update pair statistics
      await this.pairService.updatePairStats(
        data.pair_id,
        isCorrect,
        data.response_time
      );

      return { round, isCorrect, pointsEarned };
    } catch (error) {
      console.error("Error submitting player choice:", error);
      throw error;
    }
  }

  public async endGameSession(
    sessionId: string,
    updates?: Partial<GameSession>
  ): Promise<GameResult> {
    try {
      const session = await this.db.getGameSession(sessionId);
      if (!session) {
        throw new Error("Game session not found");
      }

      const finalUpdates = {
        ...updates,
        is_completed: true,
        end_time: new Date(),
      };

      const updatedSession = await this.db.updateGameSession(
        sessionId,
        finalUpdates
      );
      if (!updatedSession) {
        throw new Error("Failed to update game session");
      }

      // Get all rounds for final statistics
      const rounds = await this.db.getGameRoundsBySession(sessionId);
      const correctAnswers = rounds.filter((r) => r.is_correct).length;
      const totalRounds = rounds.length;
      const accuracyPercentage =
        totalRounds > 0 ? (correctAnswers / totalRounds) * 100 : 0;
      const averageResponseTime =
        totalRounds > 0
          ? rounds.reduce((sum, r) => sum + r.response_time, 0) / totalRounds
          : 0;

      const gameResult: GameResult = {
        session_id: sessionId,
        total_score: updatedSession.total_score,
        rounds_completed: updatedSession.rounds_completed,
        current_streak: updatedSession.current_streak,
        is_completed: true,
        final_stats: {
          correct_answers: correctAnswers,
          total_rounds: totalRounds,
          accuracy_percentage: Math.round(accuracyPercentage * 100) / 100,
          average_response_time: Math.round(averageResponseTime),
        },
      };

      console.log(
        `Game session completed: ${sessionId} - Score: ${gameResult.total_score}`
      );
      return gameResult;
    } catch (error) {
      console.error("Error ending game session:", error);
      throw error;
    }
  }

  private calculatePoints(
    isCorrect: boolean,
    responseTime: number,
    difficulty: number,
    currentStreak: number,
    gameMode: string
  ): number {
    if (!isCorrect) return 0;

    const basePoints = 100;
    const difficultyMultiplier = difficulty * 0.2; // 0.2 to 1.0
    const timeBonus = Math.max(0, (30 - responseTime / 1000) * 2); // Bonus for quick responses

    let streakMultiplier = 1;
    if (gameMode === "streak") {
      streakMultiplier = 1 + currentStreak * 0.1; // 10% bonus per streak
    }

    const totalPoints =
      (basePoints + basePoints * difficultyMultiplier + timeBonus) *
      streakMultiplier;
    return Math.round(totalPoints);
  }

  private getTodayString(): string {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  }

  private async getTodaysDailySession(
    playerId: string
  ): Promise<GameSession | null> {
    const today = this.getTodayString();
    const allSessions = Object.values(await this.db["gameSessions"]);

    return (
      allSessions.find(
        (session) =>
          session.player_id === playerId &&
          session.game_mode === "daily" &&
          session.daily_challenge_date === today
      ) || null
    );
  }

  public async getPlayerStats(playerId: string): Promise<{
    totalGames: number;
    dailyGames: number;
    streakGames: number;
    totalScore: number;
    bestStreak: number;
    averageAccuracy: number;
    averageResponseTime: number;
    lastPlayed?: Date;
  }> {
    // This is a simplified version - in a real implementation, you'd have proper player tracking
    const allSessions = Object.values(await this.db["gameSessions"]);
    const playerSessions = allSessions.filter((s) => s.player_id === playerId);

    if (playerSessions.length === 0) {
      return {
        totalGames: 0,
        dailyGames: 0,
        streakGames: 0,
        totalScore: 0,
        bestStreak: 0,
        averageAccuracy: 0,
        averageResponseTime: 0,
      };
    }

    const dailyGames = playerSessions.filter(
      (s) => s.game_mode === "daily"
    ).length;
    const streakGames = playerSessions.filter(
      (s) => s.game_mode === "streak"
    ).length;
    const totalScore = playerSessions.reduce(
      (sum, s) => sum + s.total_score,
      0
    );
    const bestStreak = Math.max(...playerSessions.map((s) => s.current_streak));
    const lastPlayed = new Date(
      Math.max(...playerSessions.map((s) => s.start_time.getTime()))
    );

    // Calculate accuracy from all rounds
    const allRounds = Object.values(await this.db["gameRounds"]);
    const playerRounds = allRounds.filter((r) =>
      playerSessions.some((s) => s.session_id === r.session_id)
    );

    const correctRounds = playerRounds.filter((r) => r.is_correct).length;
    const averageAccuracy =
      playerRounds.length > 0 ? (correctRounds / playerRounds.length) * 100 : 0;
    const averageResponseTime =
      playerRounds.length > 0
        ? playerRounds.reduce((sum, r) => sum + r.response_time, 0) /
          playerRounds.length
        : 0;

    return {
      totalGames: playerSessions.length,
      dailyGames,
      streakGames,
      totalScore,
      bestStreak,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      lastPlayed,
    };
  }

  public async getLeaderboard(
    gameMode?: "daily" | "streak",
    limit: number = 10
  ): Promise<any[]> {
    const allSessions = Object.values(await this.db["gameSessions"]);

    let filteredSessions = allSessions.filter((s) => s.is_completed);
    if (gameMode) {
      filteredSessions = filteredSessions.filter(
        (s) => s.game_mode === gameMode
      );
    }

    // Group by player and get best scores
    const playerStats = new Map<string, any>();

    filteredSessions.forEach((session) => {
      const playerId = session.player_id || "anonymous";
      const existing = playerStats.get(playerId);

      if (!existing || session.total_score > existing.best_score) {
        playerStats.set(playerId, {
          player_id: playerId,
          best_score: session.total_score,
          best_streak: session.current_streak,
          total_games: (existing?.total_games || 0) + 1,
          last_played: session.end_time || session.start_time,
        });
      } else {
        existing.total_games += 1;
        existing.best_streak = Math.max(
          existing.best_streak,
          session.current_streak
        );
        if (session.end_time && session.end_time > existing.last_played) {
          existing.last_played = session.end_time;
        }
      }
    });

    // Sort by best score and return top players
    const leaderboard = Array.from(playerStats.values())
      .sort((a, b) => b.best_score - a.best_score)
      .slice(0, limit)
      .map((player, index) => ({
        rank: index + 1,
        ...player,
      }));

    return leaderboard;
  }
}
