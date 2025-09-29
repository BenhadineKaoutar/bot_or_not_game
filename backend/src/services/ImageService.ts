import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { Image, CreateImageData, ProcessedImage, ImageDimensions } from '../models/Image';
import { DatabaseService } from './DatabaseService';

export class ImageService {
  private db: DatabaseService;
  private uploadsPath: string;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.uploadsPath = path.join(process.cwd(), 'uploads', 'images');
  }

  public async processAndSaveImage(
    file: Express.Multer.File,
    metadata: CreateImageData
  ): Promise<Image> {
    try {
      // Generate unique ID and filename
      const imageId = uuidv4();
      const fileExtension = path.extname(file.originalname);
      const storedFilename = `${imageId}${fileExtension}`;
      const filePath = path.join(this.uploadsPath, storedFilename);

      // Process image with Sharp
      const processedImage = await this.processImage(file.buffer, filePath);

      // Create image record
      const image: Image = {
        id: imageId,
        filename: file.originalname,
        storedFilename,
        category: metadata.category,
        difficulty_level: metadata.difficulty_level,
        is_ai_generated: metadata.is_ai_generated,
        source_info: metadata.source_info,
        upload_date: new Date(),
        quality_score: metadata.quality_score,
        usage_count: 0,
        file_size: processedImage.fileSize,
        dimensions: processedImage.dimensions,
        tags: metadata.tags || []
      };

      // Save to database
      await this.db.createImage(image);

      console.log(`Image processed and saved: ${image.filename} (${image.id})`);
      return image;
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process and save image');
    }
  }

  private async processImage(
    buffer: Buffer,
    outputPath: string
  ): Promise<ProcessedImage> {
    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      // Process and optimize image
      const processedBuffer = await sharp(buffer)
        .resize(800, 600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toBuffer();

      // Save processed image
      await fs.writeFile(outputPath, processedBuffer);

      // Get final dimensions
      const finalMetadata = await sharp(processedBuffer).metadata();

      return {
        id: path.basename(outputPath, path.extname(outputPath)),
        originalFilename: path.basename(outputPath),
        storedFilename: path.basename(outputPath),
        dimensions: {
          width: finalMetadata.width || metadata.width,
          height: finalMetadata.height || metadata.height
        },
        fileSize: processedBuffer.length,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Error in image processing:', error);
      throw new Error('Image processing failed');
    }
  }

  public async getImageById(id: string): Promise<Image | null> {
    return await this.db.getImage(id);
  }

  public async getAllImages(filters?: {
    category?: string;
    difficulty?: number;
    is_ai_generated?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ images: Image[]; total: number; page: number; totalPages: number }> {
    const allImages = await this.db.getAllImages({
      category: filters?.category,
      difficulty: filters?.difficulty,
      is_ai_generated: filters?.is_ai_generated
    });

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedImages = allImages.slice(startIndex, endIndex);
    const totalPages = Math.ceil(allImages.length / limit);

    return {
      images: paginatedImages,
      total: allImages.length,
      page,
      totalPages
    };
  }

  public async updateImage(id: string, updates: Partial<Image>): Promise<Image | null> {
    return await this.db.updateImage(id, updates);
  }

  public async deleteImage(id: string): Promise<boolean> {
    try {
      const image = await this.db.getImage(id);
      if (!image) return false;

      // Delete physical file
      const filePath = path.join(this.uploadsPath, image.storedFilename);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Could not delete file ${filePath}:`, error);
      }

      // Delete from database
      return await this.db.deleteImage(id);
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  public async getImageFile(id: string): Promise<{ filePath: string; image: Image } | null> {
    const image = await this.db.getImage(id);
    if (!image) return null;

    const filePath = path.join(this.uploadsPath, image.storedFilename);
    
    try {
      await fs.access(filePath);
      return { filePath, image };
    } catch {
      console.error(`Image file not found: ${filePath}`);
      return null;
    }
  }

  public async incrementUsageCount(id: string): Promise<void> {
    const image = await this.db.getImage(id);
    if (image) {
      await this.db.updateImage(id, {
        usage_count: image.usage_count + 1
      });
    }
  }

  public async validateImageFile(file: Express.Multer.File): Promise<boolean> {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size too large (max 10MB)');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed');
    }

    // Validate image with Sharp
    try {
      const metadata = await sharp(file.buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image file');
      }
      return true;
    } catch (error) {
      throw new Error('Invalid or corrupted image file');
    }
  }

  public async getImageStats(): Promise<{
    totalImages: number;
    aiImages: number;
    realImages: number;
    categoryCounts: Record<string, number>;
    difficultyDistribution: Record<number, number>;
    averageUsage: number;
  }> {
    const allImages = await this.db.getAllImages();
    
    const stats = {
      totalImages: allImages.length,
      aiImages: allImages.filter(img => img.is_ai_generated).length,
      realImages: allImages.filter(img => !img.is_ai_generated).length,
      categoryCounts: {} as Record<string, number>,
      difficultyDistribution: {} as Record<number, number>,
      averageUsage: 0
    };

    // Calculate category counts
    allImages.forEach(img => {
      stats.categoryCounts[img.category] = (stats.categoryCounts[img.category] || 0) + 1;
      stats.difficultyDistribution[img.difficulty_level] = (stats.difficultyDistribution[img.difficulty_level] || 0) + 1;
    });

    // Calculate average usage
    if (allImages.length > 0) {
      const totalUsage = allImages.reduce((sum, img) => sum + img.usage_count, 0);
      stats.averageUsage = totalUsage / allImages.length;
    }

    return stats;
  }
}