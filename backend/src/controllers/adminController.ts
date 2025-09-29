import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { CreateImageSchema } from '../models/Image';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  // Get dashboard statistics
  public getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.adminService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard statistics'
      });
    }
  };

  // Bulk upload images
  public bulkUpload = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files provided for bulk upload'
        });
        return;
      }

      // Parse default metadata from request body
      const defaultMetadata = {
        category: req.body.category || 'object',
        difficulty_level: parseInt(req.body.difficulty_level) || 3,
        is_ai_generated: req.body.is_ai_generated === 'true',
        source_info: req.body.source_info || 'Bulk upload',
        quality_score: parseInt(req.body.quality_score) || 7,
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      };

      const result = await this.adminService.bulkUploadImages(req.files, defaultMetadata);

      const statusCode = result.failed > 0 ? 207 : 201; // 207 Multi-Status if some failed

      res.status(statusCode).json({
        success: true,
        message: `Bulk upload completed: ${result.successful} successful, ${result.failed} failed`,
        data: {
          summary: {
            successful: result.successful,
            failed: result.failed,
            total: req.files.length
          },
          uploadedImages: result.uploadedImages.map(img => ({
            id: img.id,
            filename: img.filename,
            category: img.category,
            is_ai_generated: img.is_ai_generated
          })),
          errors: result.errors
        }
      });
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Bulk upload failed: ' + error.message
      });
    }
  };

  // Create automatic image pairs
  public createAutoPairs = async (req: Request, res: Response): Promise<void> => {
    try {
      const category = req.body.category as string | undefined;
      const result = await this.adminService.createAutoPairs(category);

      res.json({
        success: true,
        message: `Auto-pair creation completed: ${result.created} pairs created`,
        data: {
          created: result.created,
          errors: result.errors
        }
      });
    } catch (error: any) {
      console.error('Create auto pairs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create automatic pairs: ' + error.message
      });
    }
  };

  // Export data
  public exportData = async (req: Request, res: Response): Promise<void> => {
    try {
      const format = (req.query.format as 'json' | 'sql') || 'json';
      const filename = await this.adminService.exportData(format);

      res.json({
        success: true,
        message: 'Data exported successfully',
        data: {
          filename,
          format,
          downloadUrl: `/api/admin/download/${filename}`
        }
      });
    } catch (error: any) {
      console.error('Export data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data: ' + error.message
      });
    }
  };

  // Import data
  public importData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No import file provided'
        });
        return;
      }

      // Save uploaded file temporarily
      const tempPath = req.file.path;
      const result = await this.adminService.importData(tempPath);

      res.json({
        success: true,
        message: 'Data import completed',
        data: {
          imported: result.imported,
          errors: result.errors
        }
      });
    } catch (error: any) {
      console.error('Import data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import data: ' + error.message
      });
    }
  };

  // Cleanup unused images
  public cleanupImages = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.adminService.cleanupUnusedImages();

      res.json({
        success: true,
        message: `Cleanup completed: ${result.deleted} images deleted`,
        data: {
          deleted: result.deleted,
          freedSpace: result.freedSpace,
          freedSpaceMB: Math.round(result.freedSpace / 1024 / 1024 * 100) / 100,
          errors: result.errors
        }
      });
    } catch (error: any) {
      console.error('Cleanup images error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup images: ' + error.message
      });
    }
  };

  // Create manual backup
  public createBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const filename = await this.adminService.createBackup();

      res.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          filename,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Create backup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create backup: ' + error.message
      });
    }
  };

  // System health check
  public getSystemHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.adminService.getSystemHealth();

      const statusCode = health.status === 'critical' ? 503 : 
                        health.status === 'warning' ? 200 : 200;

      res.status(statusCode).json({
        success: health.status !== 'critical',
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('System health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check system health: ' + error.message
      });
    }
  };

  // Get system logs (simplified)
  public getSystemLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const level = req.query.level as string || 'all';

      // This is a simplified implementation
      // In a real system, you'd read from actual log files
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System health check completed',
          module: 'admin'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'info',
          message: 'Auto-save completed successfully',
          module: 'database'
        }
      ];

      res.json({
        success: true,
        data: {
          logs: logs.slice(0, limit),
          total: logs.length,
          level,
          limit
        }
      });
    } catch (error: any) {
      console.error('Get system logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system logs'
      });
    }
  };

  // Reset system data (dangerous operation)
  public resetSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      const confirmToken = req.body.confirmToken;
      const expectedToken = 'RESET_CONFIRM_' + new Date().toISOString().split('T')[0];

      if (confirmToken !== expectedToken) {
        res.status(400).json({
          success: false,
          error: 'Invalid confirmation token. Use: ' + expectedToken
        });
        return;
      }

      // This is a dangerous operation - implement with extreme caution
      res.status(501).json({
        success: false,
        error: 'System reset not implemented for safety reasons'
      });
    } catch (error: any) {
      console.error('Reset system error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset system'
      });
    }
  };

  // Get performance metrics
  public getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      console.error('Get performance metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics'
      });
    }
  };

  // Update system settings
  public updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = req.body;

      // This is a placeholder - implement actual settings management
      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: settings
      });
    } catch (error: any) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  };

  // Get current settings
  public getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      // This is a placeholder - implement actual settings retrieval
      const settings = {
        autoSaveInterval: 300000, // 5 minutes
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
        defaultDifficulty: 3,
        defaultQualityScore: 7
      };

      res.json({
        success: true,
        data: settings
      });
    } catch (error: any) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve settings'
      });
    }
  };
}