import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from '../controllers/adminController';
import { DailyChallengeController } from '../controllers/dailyChallengeController';
import { uploadMultiple, handleUploadError } from '../middleware/upload';
import { validateBody, validateQuery } from '../middleware/validation';
import { requireApiKey, adminRateLimit, logAdminOperation, requireAdminPermission } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const adminController = new AdminController();
const dailyChallengeController = new DailyChallengeController();

// Apply authentication and rate limiting to all admin routes
router.use(requireApiKey);
router.use(adminRateLimit);

// Validation schemas
const BulkUploadMetadataSchema = z.object({
  category: z.enum(['portrait', 'landscape', 'object', 'abstract']).optional(),
  difficulty_level: z.string().optional().transform(val => val ? parseInt(val, 10) : 3),
  is_ai_generated: z.string().optional().transform(val => val === 'true'),
  source_info: z.string().optional(),
  quality_score: z.string().optional().transform(val => val ? parseInt(val, 10) : 7),
  tags: z.string().optional()
});

const AutoPairSchema = z.object({
  category: z.enum(['portrait', 'landscape', 'object', 'abstract']).optional()
});

const ExportQuerySchema = z.object({
  format: z.enum(['json', 'sql']).optional().default('json')
});

const LogsQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 100),
  level: z.enum(['all', 'error', 'warn', 'info', 'debug']).optional().default('all')
});

const ResetSystemSchema = z.object({
  confirmToken: z.string().min(1, 'Confirmation token is required')
});

// Dashboard and statistics
router.get('/dashboard', logAdminOperation('dashboard'), adminController.getDashboard);
router.get('/health', logAdminOperation('health-check'), adminController.getSystemHealth);
router.get('/performance', logAdminOperation('performance-metrics'), adminController.getPerformanceMetrics);
router.get('/logs', validateQuery(LogsQuerySchema), logAdminOperation('view-logs'), adminController.getSystemLogs);

// Settings management
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Bulk operations
router.post(
  '/bulk-upload',
  uploadMultiple.array('images', 50), // Max 50 files
  handleUploadError,
  (req: Request, res: Response, next: NextFunction) => {
    // Parse and validate metadata
    try {
      if (req.body.tags && typeof req.body.tags === 'string') {
        req.body.tags = JSON.parse(req.body.tags);
      }
      
      if (req.body.difficulty_level) {
        req.body.difficulty_level = parseInt(req.body.difficulty_level, 10);
      }
      
      if (req.body.quality_score) {
        req.body.quality_score = parseInt(req.body.quality_score, 10);
      }
      
      if (req.body.is_ai_generated) {
        req.body.is_ai_generated = req.body.is_ai_generated === 'true';
      }
      
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON in form data'
      });
    }
  },
  logAdminOperation('bulk-upload'),
  adminController.bulkUpload
);

router.post(
  '/auto-pairs',
  validateBody(AutoPairSchema),
  adminController.createAutoPairs
);

// Data management
router.get(
  '/export',
  validateQuery(ExportQuerySchema),
  adminController.exportData
);

router.post(
  '/import',
  uploadMultiple.single('importFile'),
  handleUploadError,
  adminController.importData
);

router.post('/backup', adminController.createBackup);

// Maintenance operations
router.post(
  '/cleanup',
  requireAdminPermission('cleanup'),
  logAdminOperation('cleanup-images'),
  adminController.cleanupImages
);

router.post(
  '/reset',
  requireAdminPermission('reset'),
  validateBody(ResetSystemSchema),
  logAdminOperation('system-reset'),
  adminController.resetSystem
);

// File download endpoint (for exports)
router.get('/download/:filename', (req: Request, res: Response): void => {
  try {
    const filename = req.params.filename;
    const filePath = require('path').join(process.cwd(), 'data', 'exports', filename);
    
    // Security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
      return;
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(404).json({
            success: false,
            error: 'File not found'
          });
        }
      }
    });
  } catch (error) {
    console.error('Download endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Download failed'
    });
  }
});

// Daily Challenge Management
router.post('/daily-challenges', dailyChallengeController.createDailyChallenge);
router.get('/daily-challenges', dailyChallengeController.getAllChallenges);
router.get('/daily-challenges/today', dailyChallengeController.getTodaysChallenge);
router.get('/daily-challenges/:date', dailyChallengeController.getChallengeByDate);
router.put('/daily-challenges/:id', dailyChallengeController.updateDailyChallenge);
router.delete('/daily-challenges/:id', dailyChallengeController.deleteDailyChallenge);

export default router;