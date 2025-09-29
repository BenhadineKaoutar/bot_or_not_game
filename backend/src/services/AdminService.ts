import fs from 'fs/promises';
import path from 'path';
import { DatabaseService } from './DatabaseService';
import { ImageService } from './ImageService';
import { ImagePairService } from './ImagePairService';
import { GameService } from './GameService';
import { Image, CreateImageData } from '../models/Image';
import { ImagePair } from '../models/ImagePair';

export interface SystemStats {
  database: {
    totalImages: number;
    totalPairs: number;
    totalSessions: number;
    totalRounds: number;
    activePairs: number;
  };
  images: {
    aiImages: number;
    realImages: number;
    categoryCounts: Record<string, number>;
    difficultyDistribution: Record<number, number>;
    averageUsage: number;
    totalFileSize: number;
  };
  pairs: {
    totalPairs: number;
    activePairs: number;
    categoryDistribution: Record<string, number>;
    difficultyDistribution: Record<number, number>;
    averageSuccessRate: number;
    averageResponseTime: number;
  };
  games: {
    totalGames: number;
    dailyGames: number;
    streakGames: number;
    completedGames: number;
    averageScore: number;
    topStreak: number;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    lastBackup?: string;
    dataSize: number;
  };
}

export interface BulkUploadResult {
  successful: number;
  failed: number;
  errors: Array<{
    filename: string;
    error: string;
  }>;
  uploadedImages: Image[];
}

export interface ExportData {
  version: string;
  exportDate: string;
  images: Record<string, Image>;
  pairs: Record<string, ImagePair>;
  sessions: Record<string, any>;
  rounds: Record<string, any>;
  metadata: {
    totalImages: number;
    totalPairs: number;
    totalSessions: number;
    exportSize: number;
  };
}

export class AdminService {
  private db: DatabaseService;
  private imageService: ImageService;
  private pairService: ImagePairService;
  private gameService: GameService;
  private startTime: number;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.imageService = new ImageService();
    this.pairService = new ImagePairService();
    this.gameService = new GameService();
    this.startTime = Date.now();
  }

  public async getDashboardStats(): Promise<SystemStats> {
    try {
      // Get basic database stats
      const dbStats = this.db.getStats();

      // Get detailed image stats
      const imageStats = await this.imageService.getImageStats();

      // Get pair stats
      const pairStats = await this.pairService.getPairStats();

      // Get game stats
      const gameStats = await this.getGameStats();

      // Get system stats
      const systemStats = await this.getSystemStats();

      return {
        database: dbStats,
        images: {
          ...imageStats,
          totalFileSize: await this.calculateTotalFileSize()
        },
        pairs: pairStats,
        games: gameStats,
        system: {
          uptime: Date.now() - this.startTime,
          memoryUsage: process.memoryUsage(),
          lastBackup: await this.getLastBackupDate(),
          dataSize: await this.calculateDataSize()
        }
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error('Failed to retrieve dashboard statistics');
    }
  }

  public async bulkUploadImages(
    files: Express.Multer.File[],
    defaultMetadata: Partial<CreateImageData>
  ): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      successful: 0,
      failed: 0,
      errors: [],
      uploadedImages: []
    };

    for (const file of files) {
      try {
        // Validate file
        await this.imageService.validateImageFile(file);

        // Extract metadata from filename or use defaults
        const metadata = this.extractMetadataFromFilename(file.originalname, defaultMetadata);

        // Process and save image
        const image = await this.imageService.processAndSaveImage(file, metadata);
        
        result.successful++;
        result.uploadedImages.push(image);
        
        console.log(`Bulk upload success: ${file.originalname}`);
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          filename: file.originalname,
          error: error.message
        });
        
        console.error(`Bulk upload failed for ${file.originalname}:`, error.message);
      }
    }

    console.log(`Bulk upload completed: ${result.successful} successful, ${result.failed} failed`);
    return result;
  }

  public async createAutoPairs(category?: string): Promise<{
    created: number;
    errors: string[];
  }> {
    try {
      const filters = category ? { category } : undefined;
      const allImages = await this.imageService.getAllImages(filters);
      
      const aiImages = allImages.images.filter(img => img.is_ai_generated);
      const realImages = allImages.images.filter(img => !img.is_ai_generated);

      const result = {
        created: 0,
        errors: [] as string[]
      };

      // Create pairs by matching similar categories and difficulties
      for (const aiImage of aiImages) {
        // Find matching real images
        const matchingRealImages = realImages.filter(realImg => 
          realImg.category === aiImage.category &&
          Math.abs(realImg.difficulty_level - aiImage.difficulty_level) <= 1
        );

        if (matchingRealImages.length === 0) {
          result.errors.push(`No matching real image found for AI image: ${aiImage.filename}`);
          continue;
        }

        // Select the best matching real image (closest difficulty, lowest usage)
        const bestMatch = matchingRealImages.reduce((best, current) => {
          const bestScore = Math.abs(best.difficulty_level - aiImage.difficulty_level) * 10 + best.usage_count;
          const currentScore = Math.abs(current.difficulty_level - aiImage.difficulty_level) * 10 + current.usage_count;
          return currentScore < bestScore ? current : best;
        });

        try {
          await this.pairService.createImagePair({
            ai_image_id: aiImage.id,
            real_image_id: bestMatch.id
          });
          
          result.created++;
          
          // Remove the used real image from the pool to avoid duplicates
          const index = realImages.indexOf(bestMatch);
          if (index > -1) {
            realImages.splice(index, 1);
          }
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            result.errors.push(`Failed to create pair for ${aiImage.filename}: ${error.message}`);
          }
        }
      }

      console.log(`Auto-pair creation completed: ${result.created} pairs created`);
      return result;
    } catch (error) {
      console.error('Error in auto-pair creation:', error);
      throw new Error('Failed to create automatic pairs');
    }
  }

  public async exportData(format: 'json' | 'sql' = 'json'): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bot-or-not-export-${timestamp}.${format}`;
      const exportPath = path.join(process.cwd(), 'data', 'exports');
      
      // Ensure export directory exists
      await fs.mkdir(exportPath, { recursive: true });
      
      if (format === 'json') {
        return await this.exportToJSON(path.join(exportPath, filename));
      } else {
        return await this.exportToSQL(path.join(exportPath, filename));
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  public async importData(filePath: string): Promise<{
    imported: {
      images: number;
      pairs: number;
      sessions: number;
    };
    errors: string[];
  }> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const importData: ExportData = JSON.parse(fileContent);

      const result = {
        imported: { images: 0, pairs: 0, sessions: 0 },
        errors: [] as string[]
      };

      // Import images
      for (const [id, image] of Object.entries(importData.images)) {
        try {
          await this.db.createImage(image);
          result.imported.images++;
        } catch (error: any) {
          result.errors.push(`Failed to import image ${id}: ${error.message}`);
        }
      }

      // Import pairs
      for (const [id, pair] of Object.entries(importData.pairs)) {
        try {
          await this.db.createImagePair(pair);
          result.imported.pairs++;
        } catch (error: any) {
          result.errors.push(`Failed to import pair ${id}: ${error.message}`);
        }
      }

      // Import sessions
      for (const [id, session] of Object.entries(importData.sessions)) {
        try {
          await this.db.createGameSession(session);
          result.imported.sessions++;
        } catch (error: any) {
          result.errors.push(`Failed to import session ${id}: ${error.message}`);
        }
      }

      console.log(`Data import completed: ${JSON.stringify(result.imported)}`);
      return result;
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }

  public async cleanupUnusedImages(): Promise<{
    deleted: number;
    freedSpace: number;
    errors: string[];
  }> {
    try {
      const allImages = await this.imageService.getAllImages();
      const allPairs = await this.pairService.getAllImagePairs();
      
      const usedImageIds = new Set<string>();
      allPairs.pairs.forEach(pair => {
        usedImageIds.add(pair.ai_image_id);
        usedImageIds.add(pair.real_image_id);
      });

      const unusedImages = allImages.images.filter(img => !usedImageIds.has(img.id));
      
      const result = {
        deleted: 0,
        freedSpace: 0,
        errors: [] as string[]
      };

      for (const image of unusedImages) {
        try {
          result.freedSpace += image.file_size;
          await this.imageService.deleteImage(image.id);
          result.deleted++;
        } catch (error: any) {
          result.errors.push(`Failed to delete image ${image.filename}: ${error.message}`);
        }
      }

      console.log(`Cleanup completed: ${result.deleted} images deleted, ${result.freedSpace} bytes freed`);
      return result;
    } catch (error) {
      console.error('Error in cleanup:', error);
      throw new Error('Failed to cleanup unused images');
    }
  }

  public async createBackup(): Promise<string> {
    try {
      const backupFilename = await this.db.createBackup();
      console.log(`Manual backup created: ${backupFilename}`);
      return backupFilename;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  public async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      value?: any;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Memory usage check
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    if (memUsageMB > 500) {
      checks.push({
        name: 'Memory Usage',
        status: 'warn' as const,
        message: `High memory usage: ${memUsageMB.toFixed(2)}MB`,
        value: memUsageMB
      });
      overallStatus = 'warning';
    } else {
      checks.push({
        name: 'Memory Usage',
        status: 'pass' as const,
        message: `Memory usage normal: ${memUsageMB.toFixed(2)}MB`,
        value: memUsageMB
      });
    }

    // Database stats check
    const dbStats = this.db.getStats();
    checks.push({
      name: 'Database',
      status: 'pass' as const,
      message: `${dbStats.totalImages} images, ${dbStats.totalPairs} pairs`,
      value: dbStats
    });

    // File system check
    try {
      const uploadsPath = path.join(process.cwd(), 'uploads', 'images');
      await fs.access(uploadsPath);
      checks.push({
        name: 'File System',
        status: 'pass' as const,
        message: 'Upload directory accessible'
      });
    } catch {
      checks.push({
        name: 'File System',
        status: 'fail' as const,
        message: 'Upload directory not accessible'
      });
      overallStatus = 'critical';
    }

    // Data integrity check
    const integrityCheck = await this.checkDataIntegrity();
    if (integrityCheck.issues.length > 0) {
      checks.push({
        name: 'Data Integrity',
        status: 'warn' as const,
        message: `${integrityCheck.issues.length} integrity issues found`,
        value: integrityCheck.issues
      });
      if (overallStatus === 'healthy') overallStatus = 'warning';
    } else {
      checks.push({
        name: 'Data Integrity',
        status: 'pass' as const,
        message: 'No integrity issues found'
      });
    }

    return { status: overallStatus, checks };
  }

  private extractMetadataFromFilename(filename: string, defaults: Partial<CreateImageData>): CreateImageData {
    // Simple filename parsing - you can enhance this based on your naming conventions
    const lowerFilename = filename.toLowerCase();
    
    let category = defaults.category || 'object';
    if (lowerFilename.includes('portrait') || lowerFilename.includes('face')) category = 'portrait';
    else if (lowerFilename.includes('landscape') || lowerFilename.includes('scenery')) category = 'landscape';
    else if (lowerFilename.includes('abstract')) category = 'abstract';

    let isAI = defaults.is_ai_generated ?? false;
    if (lowerFilename.includes('ai') || lowerFilename.includes('generated') || lowerFilename.includes('synthetic')) {
      isAI = true;
    } else if (lowerFilename.includes('real') || lowerFilename.includes('photo') || lowerFilename.includes('camera')) {
      isAI = false;
    }

    return {
      filename,
      category: category as any,
      difficulty_level: defaults.difficulty_level || 3,
      is_ai_generated: isAI,
      source_info: defaults.source_info || 'Bulk upload',
      quality_score: defaults.quality_score || 7,
      tags: defaults.tags || []
    };
  }

  private async exportToJSON(filePath: string): Promise<string> {
    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      images: Object.fromEntries(await this.db['images']),
      pairs: Object.fromEntries(await this.db['imagePairs']),
      sessions: Object.fromEntries(await this.db['gameSessions']),
      rounds: Object.fromEntries(await this.db['gameRounds']),
      metadata: {
        totalImages: (await this.db['images']).size,
        totalPairs: (await this.db['imagePairs']).size,
        totalSessions: (await this.db['gameSessions']).size,
        exportSize: 0
      }
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    exportData.metadata.exportSize = Buffer.byteLength(jsonContent, 'utf8');
    
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    return path.basename(filePath);
  }

  private async exportToSQL(filePath: string): Promise<string> {
    // Simplified SQL export - you can enhance this for specific database systems
    let sqlContent = '-- Bot or Not Database Export\n';
    sqlContent += `-- Generated on: ${new Date().toISOString()}\n\n`;

    // Add table creation statements and data inserts
    sqlContent += '-- This is a simplified SQL export\n';
    sqlContent += '-- Implement specific database schema as needed\n';

    await fs.writeFile(filePath, sqlContent);
    return path.basename(filePath);
  }

  private async getGameStats() {
    // Simplified game stats - enhance based on your needs
    return {
      totalGames: 0,
      dailyGames: 0,
      streakGames: 0,
      completedGames: 0,
      averageScore: 0,
      topStreak: 0
    };
  }

  private async getSystemStats() {
    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      lastBackup: await this.getLastBackupDate(),
      dataSize: await this.calculateDataSize()
    };
  }

  private async calculateTotalFileSize(): Promise<number> {
    try {
      const uploadsPath = path.join(process.cwd(), 'uploads', 'images');
      const files = await fs.readdir(uploadsPath);
      let totalSize = 0;

      for (const file of files) {
        try {
          const stats = await fs.stat(path.join(uploadsPath, file));
          totalSize += stats.size;
        } catch {
          // Skip files that can't be accessed
        }
      }

      return totalSize;
    } catch {
      return 0;
    }
  }

  private async calculateDataSize(): Promise<number> {
    try {
      const dataPath = path.join(process.cwd(), 'data');
      const files = await fs.readdir(dataPath);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const stats = await fs.stat(path.join(dataPath, file));
            totalSize += stats.size;
          } catch {
            // Skip files that can't be accessed
          }
        }
      }

      return totalSize;
    } catch {
      return 0;
    }
  }

  private async getLastBackupDate(): Promise<string | undefined> {
    try {
      const backupPath = path.join(process.cwd(), 'data', 'backups');
      const files = await fs.readdir(backupPath);
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
      
      if (backupFiles.length === 0) return undefined;

      backupFiles.sort().reverse(); // Get most recent
      return backupFiles[0];
    } catch {
      return undefined;
    }
  }

  private async checkDataIntegrity(): Promise<{ issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check for orphaned pairs (pairs referencing non-existent images)
      const allPairs = await this.pairService.getAllImagePairs();
      const allImages = await this.imageService.getAllImages();
      const imageIds = new Set(allImages.images.map(img => img.id));

      for (const pair of allPairs.pairs) {
        if (!imageIds.has(pair.ai_image_id)) {
          issues.push(`Pair ${pair.pair_id} references non-existent AI image ${pair.ai_image_id}`);
        }
        if (!imageIds.has(pair.real_image_id)) {
          issues.push(`Pair ${pair.pair_id} references non-existent real image ${pair.real_image_id}`);
        }
      }

      // Check for missing image files
      for (const image of allImages.images) {
        const filePath = path.join(process.cwd(), 'uploads', 'images', image.storedFilename);
        try {
          await fs.access(filePath);
        } catch {
          issues.push(`Image file missing: ${image.storedFilename} for image ${image.id}`);
        }
      }

    } catch (error) {
      issues.push(`Error during integrity check: ${error}`);
    }

    return { issues };
  }
}