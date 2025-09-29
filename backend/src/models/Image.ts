import { z } from 'zod';

// Zod schemas for validation
export const ImageCategorySchema = z.enum(['portrait', 'landscape', 'object', 'abstract']);
export const DifficultyLevelSchema = z.number().min(1).max(5);

export const ImageSchema = z.object({
  id: z.string().uuid(),
  filename: z.string().min(1),
  storedFilename: z.string().min(1),
  category: ImageCategorySchema,
  difficulty_level: DifficultyLevelSchema,
  is_ai_generated: z.boolean(),
  source_info: z.string().min(1),
  upload_date: z.date(),
  quality_score: z.number().min(1).max(10),
  usage_count: z.number().min(0).default(0),
  file_size: z.number().min(0),
  dimensions: z.object({
    width: z.number().min(1),
    height: z.number().min(1)
  }),
  tags: z.array(z.string()).default([])
});

export const CreateImageSchema = z.object({
  filename: z.string().min(1),
  category: ImageCategorySchema,
  difficulty_level: DifficultyLevelSchema,
  is_ai_generated: z.boolean(),
  source_info: z.string().min(1),
  quality_score: z.number().min(1).max(10),
  tags: z.array(z.string()).optional().default([])
});

export const UpdateImageSchema = CreateImageSchema.partial();

// TypeScript types
export type ImageCategory = z.infer<typeof ImageCategorySchema>;
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type CreateImageData = z.infer<typeof CreateImageSchema>;
export type UpdateImageData = z.infer<typeof UpdateImageSchema>;

// Image dimensions interface
export interface ImageDimensions {
  width: number;
  height: number;
}

// Image upload result
export interface ProcessedImage {
  id: string;
  originalFilename: string;
  storedFilename: string;
  dimensions: ImageDimensions;
  fileSize: number;
  mimeType: string;
}