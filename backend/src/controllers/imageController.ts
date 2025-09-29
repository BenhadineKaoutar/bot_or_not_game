import { Request, Response } from 'express';
import { ImageService } from '../services/ImageService';
import { CreateImageSchema } from '../models/Image';

export class ImageController {
  private imageService: ImageService;

  constructor() {
    this.imageService = new ImageService();
  }

  // Upload single image
  public uploadImage = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
        return;
      }

      // Validate image file
      await this.imageService.validateImageFile(req.file);

      // Validate metadata
      const metadata = CreateImageSchema.parse(req.body);

      // Process and save image
      const image = await this.imageService.processAndSaveImage(req.file, metadata);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          id: image.id,
          filename: image.filename,
          category: image.category,
          difficulty_level: image.difficulty_level,
          is_ai_generated: image.is_ai_generated,
          upload_date: image.upload_date,
          dimensions: image.dimensions,
          file_size: image.file_size
        }
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to upload image'
      });
    }
  };

  // Get all images with pagination and filters
  public getImages = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        category: req.query.category as string,
        difficulty: req.query.difficulty ? parseInt(req.query.difficulty as string, 10) : undefined,
        is_ai_generated: req.query.is_ai_generated ? req.query.is_ai_generated === 'true' : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
      };

      const result = await this.imageService.getAllImages(filters);

      res.json({
        success: true,
        data: result.images,
        pagination: {
          page: result.page,
          limit: filters.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      console.error('Get images error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve images'
      });
    }
  };

  // Get single image by ID
  public getImageById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const image = await this.imageService.getImageById(id);

      if (!image) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      res.json({
        success: true,
        data: image
      });
    } catch (error: any) {
      console.error('Get image error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image'
      });
    }
  };

  // Get image file
  public getImageFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.imageService.getImageFile(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Image file not found'
        });
        return;
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('Content-Disposition', `inline; filename="${result.image.filename}"`);

      // Send file
      res.sendFile(result.filePath);
    } catch (error: any) {
      console.error('Get image file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image file'
      });
    }
  };

  // Update image metadata
  public updateImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedImage = await this.imageService.updateImage(id, updates);

      if (!updatedImage) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Image updated successfully',
        data: updatedImage
      });
    } catch (error: any) {
      console.error('Update image error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update image'
      });
    }
  };

  // Delete image
  public deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.imageService.deleteImage(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete image error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete image'
      });
    }
  };

  // Get image statistics
  public getImageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.imageService.getImageStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Get image stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image statistics'
      });
    }
  };
}