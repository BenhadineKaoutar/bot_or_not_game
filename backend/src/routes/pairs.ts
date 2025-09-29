import { Router } from 'express';
import { PairController } from '../controllers/pairController';
import { validateParams, validateQuery, validateBody, UUIDSchema } from '../middleware/validation';
import { CreateImagePairSchema } from '../models/ImagePair';
import { z } from 'zod';

const router = Router();
const pairController = new PairController();

// Validation schemas
const PairFiltersSchema = z.object({
  category: z.enum(['portrait', 'landscape', 'object', 'abstract']).optional(),
  difficulty: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  is_active: z.string().optional().transform(val => {
    if (val === undefined) return undefined;
    return val === 'true';
  }),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20)
});

const GameSelectionSchema = z.object({
  category: z.enum(['portrait', 'landscape', 'object', 'abstract']).optional(),
  difficulty: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  exclude: z.string().optional(), // Comma-separated pair IDs
  active_only: z.string().optional().transform(val => val !== 'false')
});

const RecommendedPairsSchema = z.object({
  category: z.enum(['portrait', 'landscape', 'object', 'abstract']).optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 5)
});

// Create new image pair
router.post(
  '/',
  validateBody(CreateImagePairSchema),
  pairController.createPair
);

// Get all pairs with pagination and filters
router.get(
  '/',
  validateQuery(PairFiltersSchema),
  pairController.getPairs
);

// Get pair statistics
router.get('/stats', pairController.getPairStats);

// Get recommended pairs for games
router.get(
  '/recommended',
  validateQuery(RecommendedPairsSchema),
  pairController.getRecommendedPairs
);

// Select pair for game (used by game service)
router.get(
  '/select-for-game',
  validateQuery(GameSelectionSchema),
  pairController.selectPairForGame
);

// Get single pair by ID
router.get(
  '/:id',
  validateParams(UUIDSchema),
  pairController.getPairById
);

// Get pair with full image data
router.get(
  '/:id/with-images',
  validateParams(UUIDSchema),
  pairController.getPairWithImages
);

// Toggle pair active status
router.patch(
  '/:id/toggle-active',
  validateParams(UUIDSchema),
  pairController.togglePairActive
);

// Delete pair
router.delete(
  '/:id',
  validateParams(UUIDSchema),
  pairController.deletePair
);

export default router;