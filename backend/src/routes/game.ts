import { Router } from 'express';
import { GameController } from '../controllers/gameController';
import { validateParams, validateQuery, validateBody, UUIDSchema } from '../middleware/validation';
import { CreateGameSessionSchema, CreateGameRoundSchema, GameModeSchema } from '../models/GameSession';
import { z } from 'zod';

const router = Router();
const gameController = new GameController();

// Validation schemas
const SessionParamsSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format')
});

const PlayerParamsSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required')
});

const LeaderboardQuerySchema = z.object({
  mode: GameModeSchema.optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10)
}).refine(data => {
  return data.limit >= 1 && data.limit <= 100;
}, {
  message: 'Limit must be between 1 and 100'
});

const SubmitChoiceSchema = CreateGameRoundSchema.omit({ session_id: true });

// Start new game session
router.post(
  '/start',
  validateBody(CreateGameSessionSchema),
  gameController.startGame
);

// Get leaderboard
router.get(
  '/leaderboard',
  validateQuery(LeaderboardQuerySchema),
  gameController.getLeaderboard
);

// Check daily challenge availability for player
router.get(
  '/daily-challenge/:playerId',
  validateParams(PlayerParamsSchema),
  gameController.checkDailyChallenge
);

// Get player statistics
router.get(
  '/stats/:playerId',
  validateParams(PlayerParamsSchema),
  gameController.getPlayerStats
);

// Get game session details
router.get(
  '/sessions/:sessionId',
  validateParams(SessionParamsSchema),
  gameController.getGameSession
);

// Get next image pair for game session
router.get(
  '/sessions/:sessionId/next-pair',
  validateParams(SessionParamsSchema),
  gameController.getNextPair
);

// Submit player choice for a round
router.post(
  '/sessions/:sessionId/submit',
  validateParams(SessionParamsSchema),
  validateBody(SubmitChoiceSchema),
  gameController.submitChoice
);

// End game session manually
router.post(
  '/sessions/:sessionId/end',
  validateParams(SessionParamsSchema),
  gameController.endGame
);

export default router;