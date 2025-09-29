import { Request, Response } from 'express';
import { GameService } from '../services/GameService';
import { CreateGameSessionSchema, CreateGameRoundSchema } from '../models/GameSession';

export class GameController {
  private gameService: GameService;

  constructor() {
    this.gameService = new GameService();
  }

  // Start new game session
  public startGame = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = CreateGameSessionSchema.parse(req.body);
      const session = await this.gameService.startGameSession(data);

      res.status(201).json({
        success: true,
        message: 'Game session started successfully',
        data: {
          session_id: session.session_id,
          game_mode: session.game_mode,
          start_time: session.start_time,
          player_id: session.player_id
        }
      });
    } catch (error: any) {
      console.error('Start game error:', error);
      
      if (error.message.includes('already completed')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to start game session'
        });
      }
    }
  };

  // Get game session details
  public getGameSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const session = await this.gameService.getGameSession(sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Game session not found'
        });
        return;
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error: any) {
      console.error('Get game session error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve game session'
      });
    }
  };

  // Get next image pair for the game
  public getNextPair = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const nextPair = await this.gameService.getNextPairForGame(sessionId);

      res.json({
        success: true,
        data: nextPair
      });
    } catch (error: any) {
      console.error('Get next pair error:', error);
      
      if (error.message.includes('not found') || error.message.includes('completed')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error.message.includes('No suitable')) {
        res.status(404).json({
          success: false,
          error: 'No more image pairs available for this game'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get next image pair'
        });
      }
    }
  };

  // Submit player choice for a round
  public submitChoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const roundData = CreateGameRoundSchema.parse({
        ...req.body,
        session_id: sessionId
      });

      const result = await this.gameService.submitPlayerChoice(roundData);

      const response: any = {
        success: true,
        data: {
          round_id: result.round.round_id,
          is_correct: result.isCorrect,
          points_earned: result.pointsEarned,
          correct_answer: result.round.correct_answer,
          player_choice: result.round.player_choice,
          response_time: result.round.response_time
        }
      };

      // If game is completed, include final results
      if (result.gameResult) {
        response.data.game_completed = true;
        response.data.final_result = result.gameResult;
        response.message = 'Round submitted and game completed';
      } else {
        response.message = 'Round submitted successfully';
      }

      res.json(response);
    } catch (error: any) {
      console.error('Submit choice error:', error);
      
      if (error.message.includes('not found') || error.message.includes('completed')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to submit player choice'
        });
      }
    }
  };

  // End game session manually
  public endGame = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const gameResult = await this.gameService.endGameSession(sessionId);

      res.json({
        success: true,
        message: 'Game session ended successfully',
        data: gameResult
      });
    } catch (error: any) {
      console.error('End game error:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to end game session'
        });
      }
    }
  };

  // Get player statistics
  public getPlayerStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { playerId } = req.params;
      const stats = await this.gameService.getPlayerStats(playerId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get player stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve player statistics'
      });
    }
  };

  // Get leaderboard
  public getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const gameMode = req.query.mode as 'daily' | 'streak' | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const leaderboard = await this.gameService.getLeaderboard(gameMode, limit);

      res.json({
        success: true,
        data: leaderboard,
        meta: {
          game_mode: gameMode || 'all',
          limit,
          total_players: leaderboard.length
        }
      });
    } catch (error: any) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve leaderboard'
      });
    }
  };

  // Check if daily challenge is available
  public checkDailyChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      const { playerId } = req.params;
      
      // This is a simplified check - in a real implementation, you'd check the database
      const today = new Date().toISOString().split('T')[0];
      
      res.json({
        success: true,
        data: {
          available: true, // Simplified - always available for now
          date: today,
          player_id: playerId
        }
      });
    } catch (error: any) {
      console.error('Check daily challenge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check daily challenge availability'
      });
    }
  };
}
export default GameController;