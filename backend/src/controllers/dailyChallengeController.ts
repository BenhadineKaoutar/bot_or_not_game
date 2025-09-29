import { Request, Response } from 'express';
import { DailyChallengeService } from '../services/DailyChallengeService';
import { CreateDailyChallengeSchema } from '../models/DailyChallenge';

export class DailyChallengeController {
  private dailyChallengeService: DailyChallengeService;

  constructor() {
    this.dailyChallengeService = new DailyChallengeService();
  }

  // Create a new daily challenge
  public createDailyChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      const challengeData = CreateDailyChallengeSchema.parse(req.body);
      const challenge = await this.dailyChallengeService.createDailyChallenge(challengeData);

      res.status(201).json({
        success: true,
        message: 'Daily challenge created successfully',
        data: challenge
      });
    } catch (error: any) {
      console.error('Create daily challenge error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create daily challenge'
      });
    }
  };

  // Get today's challenge
  public getTodaysChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      const challenge = await this.dailyChallengeService.getTodaysChallenge();

      if (!challenge) {
        res.status(404).json({
          success: false,
          error: 'No daily challenge available for today'
        });
        return;
      }

      res.json({
        success: true,
        data: challenge
      });
    } catch (error: any) {
      console.error('Get today\'s challenge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve today\'s challenge'
      });
    }
  };

  // Get challenge by date
  public getChallengeByDate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { date } = req.params;
      const challenge = await this.dailyChallengeService.getDailyChallengeByDate(date);

      if (!challenge) {
        res.status(404).json({
          success: false,
          error: `No daily challenge found for ${date}`
        });
        return;
      }

      res.json({
        success: true,
        data: challenge
      });
    } catch (error: any) {
      console.error('Get challenge by date error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve daily challenge'
      });
    }
  };

  // Get all challenges
  public getAllChallenges = async (req: Request, res: Response): Promise<void> => {
    try {
      const challenges = await this.dailyChallengeService.getAllDailyChallenges();

      res.json({
        success: true,
        data: challenges
      });
    } catch (error: any) {
      console.error('Get all challenges error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve daily challenges'
      });
    }
  };

  // Update a daily challenge
  public updateDailyChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedChallenge = await this.dailyChallengeService.updateDailyChallenge(id, updates);

      if (!updatedChallenge) {
        res.status(404).json({
          success: false,
          error: 'Daily challenge not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Daily challenge updated successfully',
        data: updatedChallenge
      });
    } catch (error: any) {
      console.error('Update daily challenge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update daily challenge'
      });
    }
  };

  // Delete a daily challenge
  public deleteDailyChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.dailyChallengeService.deleteDailyChallenge(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Daily challenge not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Daily challenge deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete daily challenge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete daily challenge'
      });
    }
  };
}