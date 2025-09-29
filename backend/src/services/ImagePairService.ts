import { v4 as uuidv4 } from 'uuid';
import { ImagePair, CreateImagePairData, PairSelectionCriteria, ImagePairWithImages } from '../models/ImagePair';
import { DatabaseService } from './DatabaseService';
import { ImageService } from './ImageService';

export class ImagePairService {
  private db: DatabaseService;
  private imageService: ImageService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.imageService = new ImageService();
  }

  public async createImagePair(data: CreateImagePairData): Promise<ImagePair> {
    try {
      // Validate that both images exist
      const aiImage = await this.imageService.getImageById(data.ai_image_id);
      const realImage = await this.imageService.getImageById(data.real_image_id);

      if (!aiImage || !realImage) {
        throw new Error('One or both images not found');
      }

      // Validate that one is AI and one is real
      if (aiImage.is_ai_generated === realImage.is_ai_generated) {
        throw new Error('One image must be AI-generated and one must be real');
      }

      // Ensure AI image is actually AI-generated
      if (!aiImage.is_ai_generated) {
        throw new Error('AI image must be marked as AI-generated');
      }

      if (realImage.is_ai_generated) {
        throw new Error('Real image must be marked as real (not AI-generated)');
      }

      // Check if pair already exists
      const existingPairs = await this.db.getAllImagePairs();
      const duplicatePair = existingPairs.find(pair => 
        (pair.ai_image_id === data.ai_image_id && pair.real_image_id === data.real_image_id) ||
        (pair.ai_image_id === data.real_image_id && pair.real_image_id === data.ai_image_id)
      );

      if (duplicatePair) {
        throw new Error('This image pair already exists');
      }

      // Create the pair
      const imagePair: ImagePair = {
        pair_id: uuidv4(),
        ai_image_id: data.ai_image_id,
        real_image_id: data.real_image_id,
        category: aiImage.category, // Use AI image category as primary
        difficulty_level: Math.max(aiImage.difficulty_level, realImage.difficulty_level), // Use higher difficulty
        creation_date: new Date(),
        success_rate: 0,
        total_attempts: 0,
        correct_guesses: 0,
        average_response_time: 0,
        is_active: true
      };

      await this.db.createImagePair(imagePair);
      console.log(`Image pair created: ${imagePair.pair_id}`);
      
      return imagePair;
    } catch (error) {
      console.error('Error creating image pair:', error);
      throw error;
    }
  }

  public async getImagePairById(id: string): Promise<ImagePair | null> {
    return await this.db.getImagePair(id);
  }

  public async getImagePairWithImages(id: string): Promise<ImagePairWithImages | null> {
    const pair = await this.db.getImagePair(id);
    if (!pair) return null;

    const aiImage = await this.imageService.getImageById(pair.ai_image_id);
    const realImage = await this.imageService.getImageById(pair.real_image_id);

    if (!aiImage || !realImage) {
      console.error(`Missing images for pair ${id}`);
      return null;
    }

    return {
      ...pair,
      ai_image: {
        id: aiImage.id,
        filename: aiImage.filename,
        storedFilename: aiImage.storedFilename,
        category: aiImage.category,
        difficulty_level: aiImage.difficulty_level
      },
      real_image: {
        id: realImage.id,
        filename: realImage.filename,
        storedFilename: realImage.storedFilename,
        category: realImage.category,
        difficulty_level: realImage.difficulty_level
      }
    };
  }

  public async getAllImagePairs(filters?: {
    category?: string;
    difficulty?: number;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ pairs: ImagePair[]; total: number; page: number; totalPages: number }> {
    const allPairs = await this.db.getAllImagePairs({
      category: filters?.category,
      difficulty: filters?.difficulty,
      is_active: filters?.is_active
    });

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedPairs = allPairs.slice(startIndex, endIndex);
    const totalPages = Math.ceil(allPairs.length / limit);

    return {
      pairs: paginatedPairs,
      total: allPairs.length,
      page,
      totalPages
    };
  }

  public async selectPairForGame(criteria: PairSelectionCriteria): Promise<ImagePair | null> {
    try {
      const filters = {
        category: criteria.category,
        difficulty: criteria.difficulty,
        is_active: criteria.activeOnly !== false // Default to true
      };

      const allPairs = await this.db.getAllImagePairs(filters);
      
      // Filter out excluded pairs
      let availablePairs = allPairs;
      if (criteria.excludePairIds && criteria.excludePairIds.length > 0) {
        availablePairs = allPairs.filter(pair => 
          !criteria.excludePairIds!.includes(pair.pair_id)
        );
      }

      if (availablePairs.length === 0) {
        console.warn('No available pairs found for criteria:', criteria);
        return null;
      }

      // Smart selection algorithm
      // Prefer pairs with lower usage counts and success rates for better balance
      const weightedPairs = availablePairs.map(pair => {
        let weight = 1;
        
        // Lower usage count = higher weight
        const avgUsage = availablePairs.reduce((sum, p) => sum + p.total_attempts, 0) / availablePairs.length;
        if (pair.total_attempts < avgUsage) {
          weight += 0.5;
        }
        
        // Success rate around 50% is ideal (challenging but fair)
        const successRateDiff = Math.abs(pair.success_rate - 50);
        weight += (50 - successRateDiff) / 100;
        
        return { pair, weight };
      });

      // Sort by weight (higher is better)
      weightedPairs.sort((a, b) => b.weight - a.weight);

      // Select from top candidates with some randomness
      const topCandidates = weightedPairs.slice(0, Math.min(5, weightedPairs.length));
      const selectedIndex = Math.floor(Math.random() * topCandidates.length);
      
      return topCandidates[selectedIndex].pair;
    } catch (error) {
      console.error('Error selecting pair for game:', error);
      return null;
    }
  }

  public async updatePairStats(
    pairId: string, 
    isCorrect: boolean, 
    responseTime: number
  ): Promise<void> {
    try {
      const pair = await this.db.getImagePair(pairId);
      if (!pair) {
        console.error(`Pair not found: ${pairId}`);
        return;
      }

      // Update statistics
      const newTotalAttempts = pair.total_attempts + 1;
      const newCorrectGuesses = pair.correct_guesses + (isCorrect ? 1 : 0);
      const newSuccessRate = (newCorrectGuesses / newTotalAttempts) * 100;
      
      // Update average response time
      const totalResponseTime = pair.average_response_time * pair.total_attempts + responseTime;
      const newAverageResponseTime = totalResponseTime / newTotalAttempts;

      await this.db.updateImagePair(pairId, {
        total_attempts: newTotalAttempts,
        correct_guesses: newCorrectGuesses,
        success_rate: Math.round(newSuccessRate * 100) / 100, // Round to 2 decimal places
        average_response_time: Math.round(newAverageResponseTime)
      });

      // Also increment usage count for both images
      await this.imageService.incrementUsageCount(pair.ai_image_id);
      await this.imageService.incrementUsageCount(pair.real_image_id);

      console.log(`Updated stats for pair ${pairId}: ${newSuccessRate.toFixed(1)}% success rate`);
    } catch (error) {
      console.error('Error updating pair stats:', error);
    }
  }

  public async togglePairActive(id: string): Promise<ImagePair | null> {
    const pair = await this.db.getImagePair(id);
    if (!pair) return null;

    return await this.db.updateImagePair(id, {
      is_active: !pair.is_active
    });
  }

  public async deletePair(id: string): Promise<boolean> {
    return await this.db.deleteImagePair(id);
  }

  public async getPairStats(): Promise<{
    totalPairs: number;
    activePairs: number;
    categoryDistribution: Record<string, number>;
    difficultyDistribution: Record<number, number>;
    averageSuccessRate: number;
    averageResponseTime: number;
  }> {
    const allPairs = await this.db.getAllImagePairs();
    
    const stats = {
      totalPairs: allPairs.length,
      activePairs: allPairs.filter(p => p.is_active).length,
      categoryDistribution: {} as Record<string, number>,
      difficultyDistribution: {} as Record<number, number>,
      averageSuccessRate: 0,
      averageResponseTime: 0
    };

    // Calculate distributions
    allPairs.forEach(pair => {
      stats.categoryDistribution[pair.category] = (stats.categoryDistribution[pair.category] || 0) + 1;
      stats.difficultyDistribution[pair.difficulty_level] = (stats.difficultyDistribution[pair.difficulty_level] || 0) + 1;
    });

    // Calculate averages (only for pairs with attempts)
    const pairsWithAttempts = allPairs.filter(p => p.total_attempts > 0);
    if (pairsWithAttempts.length > 0) {
      const totalSuccessRate = pairsWithAttempts.reduce((sum, p) => sum + p.success_rate, 0);
      const totalResponseTime = pairsWithAttempts.reduce((sum, p) => sum + p.average_response_time, 0);
      
      stats.averageSuccessRate = totalSuccessRate / pairsWithAttempts.length;
      stats.averageResponseTime = totalResponseTime / pairsWithAttempts.length;
    }

    return stats;
  }

  public async getRecommendedPairs(category?: string, limit: number = 5): Promise<ImagePair[]> {
    const filters = {
      category,
      is_active: true
    };

    const allPairs = await this.db.getAllImagePairs(filters);
    
    // Sort by criteria: low usage, balanced success rate, recent creation
    const scoredPairs = allPairs.map(pair => {
      let score = 0;
      
      // Prefer less used pairs
      score += Math.max(0, 100 - pair.total_attempts);
      
      // Prefer pairs with success rate around 50% (challenging but fair)
      const successRateScore = 100 - Math.abs(pair.success_rate - 50) * 2;
      score += Math.max(0, successRateScore);
      
      // Slight preference for newer pairs
      const daysSinceCreation = (Date.now() - pair.creation_date.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 30 - daysSinceCreation);
      
      return { pair, score };
    });

    // Sort by score and return top pairs
    scoredPairs.sort((a, b) => b.score - a.score);
    return scoredPairs.slice(0, limit).map(item => item.pair);
  }
}