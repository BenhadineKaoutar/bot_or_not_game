import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Generic validation middleware
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

// Validate query parameters
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

// Validate URL parameters
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }
      next(error);
    }
  };
};

// Common validation schemas
export const UUIDSchema = z.object({
  id: z.string().uuid('Invalid UUID format')
});

export const PaginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20)
}).refine(data => {
  return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
}, {
  message: 'Page must be >= 1 and limit must be between 1 and 100'
});

export const ImageFiltersSchema = z.object({
  category: z.enum(['portrait', 'landscape', 'object', 'abstract']).optional(),
  difficulty: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  is_ai_generated: z.string().optional().transform(val => {
    if (val === undefined) return undefined;
    return val === 'true';
  }),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20)
});

// Validate file upload metadata
export const validateImageMetadata = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: 'No image file provided'
    });
    return;
  }

  // Parse JSON fields from form data
  try {
    if (req.body.tags && typeof req.body.tags === 'string') {
      req.body.tags = JSON.parse(req.body.tags);
    }
    
    // Convert string numbers to actual numbers
    if (req.body.difficulty_level) {
      req.body.difficulty_level = parseInt(req.body.difficulty_level, 10);
    }
    
    if (req.body.quality_score) {
      req.body.quality_score = parseInt(req.body.quality_score, 10);
    }
    
    // Convert string boolean to actual boolean
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
};