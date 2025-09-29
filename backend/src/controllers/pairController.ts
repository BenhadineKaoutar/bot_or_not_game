import { Request, Response } from 'express';
import { ImagePairService } from '../services/ImagePairService';
import { CreateImagePairSchema } from '../models/ImagePair';

export class PairController {
  private pairService: ImagePairService;

  constructor() {
    this.pairService = new ImagePairService();
  }

  // Create new image pair
  public createPair = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = CreateImagePairSchema.parse(req.body);
      const pair = await this.pairService.createImagePair(data);

      res.status(201).json({
        success: true,
        message: 'Image pair created successfully',
        data: pair
      });
    } catch (error: any) {
      console.error('Create pair error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create image pair'
      });
    }
  };

  // Get all pairs with pagination and filters
  public getPairs = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        category: req.query.category as string,
        difficulty: req.query.difficulty ? parseInt(req.query.difficulty as string, 10) : undefined,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
      };

      const result = await this.pairService.getAllImagePairs(filters);

      res.json({
        success: true,
        data: result.pairs,
        pagination: {
          page: result.page,
          limit: filters.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      console.error('Get pairs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image pairs'
      });
    }
  };

  // Get single pair by ID
  public getPairById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const pair = await this.pairService.getImagePairById(id);

      if (!pair) {
        res.status(404).json({
          success: false,
          error: 'Image pair not found'
        });
        return;
      }

      res.json({
        success: true,
        data: pair
      });
    } catch (error: any) {
      console.error('Get pair error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image pair'
      });
    }
  };

  // Get pair with full image data
  public getPairWithImages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const pair = await this.pairService.getImagePairWithImages(id);

      if (!pair) {
        res.status(404).json({
          success: false,
          error: 'Image pair not found or images missing'
        });
        return;
      }

      res.json({
        success: true,
        data: pair
      });
    } catch (error: any) {
      console.error('Get pair with images error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image pair with images'
      });
    }
  };

  // Toggle pair active status
  public togglePairActive = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updatedPair = await this.pairService.togglePairActive(id);

      if (!updatedPair) {
        res.status(404).json({
          success: false,
          error: 'Image pair not found'
        });
        return;
      }

      res.json({
        success: true,
        message: `Pair ${updatedPair.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updatedPair
      });
    } catch (error: any) {
      console.error('Toggle pair active error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle pair status'
      });
    }
  };

  // Delete pair
  public deletePair = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.pairService.deletePair(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Image pair not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Image pair deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete pair error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete image pair'
      });
    }
  };

  // Get pair statistics
  public getPairStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.pairService.getPairStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get pair stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pair statistics'
      });
    }
  };

  // Get recommended pairs for games
  public getRecommendedPairs = async (req: Request, res: Response): Promise<void> => {
    try {
      const category = req.query.category as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

      const pairs = await this.pairService.getRecommendedPairs(category, limit);

      res.json({
        success: true,
        data: pairs,
        message: `Found ${pairs.length} recommended pairs`
      });
    } catch (error: any) {
      console.error('Get recommended pairs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommended pairs'
      });
    }
  };

  // Select pair for game (used by game service)
  public selectPairForGame = async (req: Request, res: Response): Promise<void> => {
    try {
      const criteria = {
        category: req.query.category as string,
        difficulty: req.query.difficulty ? parseInt(req.query.difficulty as string, 10) : undefined,
        excludePairIds: req.query.exclude ? (req.query.exclude as string).split(',') : undefined,
        activeOnly: req.query.active_only !== 'false'
      };

      const pair = await this.pairService.selectPairForGame(criteria);

      if (!pair) {
        res.status(404).json({
          success: false,
          error: 'No suitable pairs found for the given criteria'
        });
        return;
      }

      // Get pair with full image data for the game
      const pairWithImages = await this.pairService.getImagePairWithImages(pair.pair_id);

      res.json({
        success: true,
        data: pairWithImages
      });
    } catch (error: any) {
      console.error('Select pair for game error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to select pair for game'
      });
    }
  };
}