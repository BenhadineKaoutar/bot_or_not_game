import { DatabaseService } from './DatabaseService';
import { DailyChallenge, CreateDailyChallengeData } from '../models/DailyChallenge';
import { v4 as uuidv4 } from 'uuid';

export class DailyChallengeService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public async createDailyChallenge(data: CreateDailyChallengeData): Promise<DailyChallenge> {
    const now = new Date();
    
    // Check if challenge already exists for this date
    const existing = await this.getDailyChallengeByDate(data.date);
    if (existing) {
      throw new Error(`Daily challenge already exists for ${data.date}`);
    }

    const challenge: DailyChallenge = {
      id: uuidv4(),
      date: data.date,
      title: data.title,
      description: data.description,
      difficulty_level: data.difficulty_level,
      category: data.category,
      points_reward: data.points_reward,
      is_active: true,
      created_at: now,
      updated_at: now
    };

    await this.db.createDailyChallenge(challenge);
    console.log(`Created daily challenge for ${data.date}: ${data.title}`);
    
    return challenge;
  }

  public async getDailyChallengeByDate(date: string): Promise<DailyChallenge | null> {
    try {
      const challenges = await this.db.getDailyChallenges();
      return challenges.find(c => c.date === date && c.is_active) || null;
    } catch (error) {
      console.error('Error getting daily challenge by date:', error);
      return null;
    }
  }

  public async getTodaysChallenge(): Promise<DailyChallenge | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getDailyChallengeByDate(today);
  }

  public async getAllDailyChallenges(): Promise<DailyChallenge[]> {
    try {
      return await this.db.getDailyChallenges();
    } catch (error) {
      console.error('Error getting all daily challenges:', error);
      return [];
    }
  }

  public async updateDailyChallenge(id: string, updates: Partial<DailyChallenge>): Promise<DailyChallenge | null> {
    try {
      const challenge = await this.db.getDailyChallengeById(id);
      if (!challenge) {
        return null;
      }

      const updatedChallenge = {
        ...challenge,
        ...updates,
        updated_at: new Date()
      };

      await this.db.updateDailyChallenge(id, updatedChallenge);
      return updatedChallenge;
    } catch (error) {
      console.error('Error updating daily challenge:', error);
      return null;
    }
  }

  public async deleteDailyChallenge(id: string): Promise<boolean> {
    try {
      return await this.db.deleteDailyChallenge(id);
    } catch (error) {
      console.error('Error deleting daily challenge:', error);
      return false;
    }
  }

  public async getActiveChallenges(): Promise<DailyChallenge[]> {
    try {
      const challenges = await this.db.getDailyChallenges();
      return challenges.filter(c => c.is_active);
    } catch (error) {
      console.error('Error getting active challenges:', error);
      return [];
    }
  }
}