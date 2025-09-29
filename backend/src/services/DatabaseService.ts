import fs from 'fs/promises';
import path from 'path';
import { Image } from '../models/Image';
import { ImagePair } from '../models/ImagePair';
import { GameSession, GameRound } from '../models/GameSession';
import { DailyChallenge } from '../models/DailyChallenge';

export interface DatabaseData {
  images: Record<string, Image>;
  imagePairs: Record<string, ImagePair>;
  gameSessions: Record<string, GameSession>;
  gameRounds: Record<string, GameRound>;
  dailyChallenges: Record<string, DailyChallenge>;
  statistics: Record<string, any>;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private dataPath: string;
  private backupPath: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  // In-memory storage
  private images: Map<string, Image> = new Map();
  private imagePairs: Map<string, ImagePair> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();
  private gameRounds: Map<string, GameRound> = new Map();
  private dailyChallenges: Map<string, DailyChallenge> = new Map();
  private statistics: Map<string, any> = new Map();

  private constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    this.backupPath = path.join(this.dataPath, 'backups');
    this.ensureDirectories();
    this.loadFromDisk();
    this.startAutoSave();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.mkdir(this.backupPath, { recursive: true });
      await fs.mkdir(path.join(process.cwd(), 'uploads', 'images'), { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      console.log('Loading data from disk...');
      
      // Load images
      const imagesPath = path.join(this.dataPath, 'images.json');
      if (await this.fileExists(imagesPath)) {
        const imagesData = JSON.parse(await fs.readFile(imagesPath, 'utf-8'));
        Object.entries(imagesData).forEach(([id, image]: [string, any]) => {
          // Convert date strings back to Date objects
          image.upload_date = new Date(image.upload_date);
          this.images.set(id, image as Image);
        });
        console.log(`Loaded ${this.images.size} images`);
      }

      // Load image pairs
      const pairsPath = path.join(this.dataPath, 'pairs.json');
      if (await this.fileExists(pairsPath)) {
        const pairsData = JSON.parse(await fs.readFile(pairsPath, 'utf-8'));
        Object.entries(pairsData).forEach(([id, pair]: [string, any]) => {
          pair.creation_date = new Date(pair.creation_date);
          this.imagePairs.set(id, pair as ImagePair);
        });
        console.log(`Loaded ${this.imagePairs.size} image pairs`);
      }

      // Load game sessions
      const sessionsPath = path.join(this.dataPath, 'sessions.json');
      if (await this.fileExists(sessionsPath)) {
        const sessionsData = JSON.parse(await fs.readFile(sessionsPath, 'utf-8'));
        Object.entries(sessionsData).forEach(([id, session]: [string, any]) => {
          session.start_time = new Date(session.start_time);
          if (session.end_time) session.end_time = new Date(session.end_time);
          this.gameSessions.set(id, session as GameSession);
        });
        console.log(`Loaded ${this.gameSessions.size} game sessions`);
      }

      // Load game rounds
      const roundsPath = path.join(this.dataPath, 'rounds.json');
      if (await this.fileExists(roundsPath)) {
        const roundsData = JSON.parse(await fs.readFile(roundsPath, 'utf-8'));
        Object.entries(roundsData).forEach(([id, round]: [string, any]) => {
          round.timestamp = new Date(round.timestamp);
          this.gameRounds.set(id, round as GameRound);
        });
        console.log(`Loaded ${this.gameRounds.size} game rounds`);
      }

      // Load daily challenges
      const challengesPath = path.join(this.dataPath, 'dailyChallenges.json');
      if (await this.fileExists(challengesPath)) {
        const challengesData = JSON.parse(await fs.readFile(challengesPath, 'utf-8'));
        Object.entries(challengesData).forEach(([id, challenge]: [string, any]) => {
          challenge.created_at = new Date(challenge.created_at);
          challenge.updated_at = new Date(challenge.updated_at);
          this.dailyChallenges.set(id, challenge as DailyChallenge);
        });
        console.log(`Loaded ${this.dailyChallenges.size} daily challenges`);
      }

      console.log('Data loading completed successfully');
    } catch (error) {
      console.error('Error loading data from disk:', error);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private startAutoSave(): void {
    // Auto-save every 5 minutes
    this.autoSaveInterval = setInterval(() => {
      this.saveToDisk().catch(error => {
        console.error('Auto-save failed:', error);
      });
    }, 5 * 60 * 1000);

    console.log('Auto-save started (every 5 minutes)');
  }

  public async saveToDisk(): Promise<void> {
    try {
      console.log('Saving data to disk...');

      // Save images
      const imagesData = Object.fromEntries(this.images.entries());
      await fs.writeFile(
        path.join(this.dataPath, 'images.json'),
        JSON.stringify(imagesData, null, 2)
      );

      // Save image pairs
      const pairsData = Object.fromEntries(this.imagePairs.entries());
      await fs.writeFile(
        path.join(this.dataPath, 'pairs.json'),
        JSON.stringify(pairsData, null, 2)
      );

      // Save game sessions
      const sessionsData = Object.fromEntries(this.gameSessions.entries());
      await fs.writeFile(
        path.join(this.dataPath, 'sessions.json'),
        JSON.stringify(sessionsData, null, 2)
      );

      // Save game rounds
      const roundsData = Object.fromEntries(this.gameRounds.entries());
      await fs.writeFile(
        path.join(this.dataPath, 'rounds.json'),
        JSON.stringify(roundsData, null, 2)
      );

      // Save daily challenges
      const challengesData = Object.fromEntries(this.dailyChallenges.entries());
      await fs.writeFile(
        path.join(this.dataPath, 'dailyChallenges.json'),
        JSON.stringify(challengesData, null, 2)
      );

      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data to disk:', error);
      throw error;
    }
  }

  public async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    const backupFilePath = path.join(this.backupPath, backupFileName);

    const backupData: DatabaseData = {
      images: Object.fromEntries(this.images.entries()),
      imagePairs: Object.fromEntries(this.imagePairs.entries()),
      gameSessions: Object.fromEntries(this.gameSessions.entries()),
      gameRounds: Object.fromEntries(this.gameRounds.entries()),
      dailyChallenges: Object.fromEntries(this.dailyChallenges.entries()),
      statistics: Object.fromEntries(this.statistics.entries())
    };

    await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2));
    console.log(`Backup created: ${backupFileName}`);
    return backupFileName;
  }

  // Image operations
  public async createImage(image: Image): Promise<Image> {
    this.images.set(image.id, image);
    return image;
  }

  public async getImage(id: string): Promise<Image | null> {
    return this.images.get(id) || null;
  }

  public async getAllImages(filters?: {
    category?: string;
    difficulty?: number;
    is_ai_generated?: boolean;
  }): Promise<Image[]> {
    let images = Array.from(this.images.values());

    if (filters) {
      if (filters.category) {
        images = images.filter(img => img.category === filters.category);
      }
      if (filters.difficulty) {
        images = images.filter(img => img.difficulty_level === filters.difficulty);
      }
      if (filters.is_ai_generated !== undefined) {
        images = images.filter(img => img.is_ai_generated === filters.is_ai_generated);
      }
    }

    return images;
  }

  public async updateImage(id: string, updates: Partial<Image>): Promise<Image | null> {
    const image = this.images.get(id);
    if (!image) return null;

    const updatedImage = { ...image, ...updates };
    this.images.set(id, updatedImage);
    return updatedImage;
  }

  public async deleteImage(id: string): Promise<boolean> {
    return this.images.delete(id);
  }

  // Image pair operations
  public async createImagePair(pair: ImagePair): Promise<ImagePair> {
    this.imagePairs.set(pair.pair_id, pair);
    return pair;
  }

  public async getImagePair(id: string): Promise<ImagePair | null> {
    return this.imagePairs.get(id) || null;
  }

  public async getAllImagePairs(filters?: {
    category?: string;
    difficulty?: number;
    is_active?: boolean;
  }): Promise<ImagePair[]> {
    let pairs = Array.from(this.imagePairs.values());

    if (filters) {
      if (filters.category) {
        pairs = pairs.filter(pair => pair.category === filters.category);
      }
      if (filters.difficulty) {
        pairs = pairs.filter(pair => pair.difficulty_level === filters.difficulty);
      }
      if (filters.is_active !== undefined) {
        pairs = pairs.filter(pair => pair.is_active === filters.is_active);
      }
    }

    return pairs;
  }

  public async updateImagePair(id: string, updates: Partial<ImagePair>): Promise<ImagePair | null> {
    const pair = this.imagePairs.get(id);
    if (!pair) return null;

    const updatedPair = { ...pair, ...updates };
    this.imagePairs.set(id, updatedPair);
    return updatedPair;
  }

  public async deleteImagePair(id: string): Promise<boolean> {
    return this.imagePairs.delete(id);
  }

  // Game session operations
  public async createGameSession(session: GameSession): Promise<GameSession> {
    this.gameSessions.set(session.session_id, session);
    return session;
  }

  public async getGameSession(id: string): Promise<GameSession | null> {
    return this.gameSessions.get(id) || null;
  }

  public async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | null> {
    const session = this.gameSessions.get(id);
    if (!session) return null;

    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }

  // Game round operations
  public async createGameRound(round: GameRound): Promise<GameRound> {
    this.gameRounds.set(round.round_id, round);
    return round;
  }

  public async getGameRoundsBySession(sessionId: string): Promise<GameRound[]> {
    return Array.from(this.gameRounds.values())
      .filter(round => round.session_id === sessionId)
      .sort((a, b) => a.round_number - b.round_number);
  }

  // Daily Challenges
  public async createDailyChallenge(challenge: DailyChallenge): Promise<DailyChallenge> {
    this.dailyChallenges.set(challenge.id, challenge);
    return challenge;
  }

  public async getDailyChallenges(): Promise<DailyChallenge[]> {
    return Array.from(this.dailyChallenges.values());
  }

  public async getDailyChallengeById(id: string): Promise<DailyChallenge | null> {
    return this.dailyChallenges.get(id) || null;
  }

  public async updateDailyChallenge(id: string, challenge: DailyChallenge): Promise<DailyChallenge> {
    this.dailyChallenges.set(id, challenge);
    return challenge;
  }

  public async deleteDailyChallenge(id: string): Promise<boolean> {
    return this.dailyChallenges.delete(id);
  }

  // Statistics
  public getStats() {
    return {
      totalImages: this.images.size,
      totalPairs: this.imagePairs.size,
      totalSessions: this.gameSessions.size,
      totalRounds: this.gameRounds.size,
      totalDailyChallenges: this.dailyChallenges.size,
      activePairs: Array.from(this.imagePairs.values()).filter(p => p.is_active).length
    };
  }

  // Cleanup
  public async shutdown(): Promise<void> {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    await this.saveToDisk();
    console.log('Database service shutdown completed');
  }
}