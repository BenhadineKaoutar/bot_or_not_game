import { z } from 'zod';

export const ImagePairSchema = z.object({
  pair_id: z.string().uuid(),
  ai_image_id: z.string().uuid(),
  real_image_id: z.string().uuid(),
  category: z.string(),
  difficulty_level: z.number().min(1).max(5),
  creation_date: z.date(),
  success_rate: z.number().min(0).max(100).default(0),
  total_attempts: z.number().min(0).default(0),
  correct_guesses: z.number().min(0).default(0),
  average_response_time: z.number().min(0).default(0),
  is_active: z.boolean().default(true)
});

export const CreateImagePairSchema = z.object({
  ai_image_id: z.string().uuid(),
  real_image_id: z.string().uuid()
});

export const UpdateImagePairSchema = z.object({
  is_active: z.boolean().optional()
});

// TypeScript types
export type ImagePair = z.infer<typeof ImagePairSchema>;
export type CreateImagePairData = z.infer<typeof CreateImagePairSchema>;
export type UpdateImagePairData = z.infer<typeof UpdateImagePairSchema>;

// Image pair with populated image data
export interface ImagePairWithImages extends ImagePair {
  ai_image: {
    id: string;
    filename: string;
    storedFilename: string;
    category: string;
    difficulty_level: number;
  };
  real_image: {
    id: string;
    filename: string;
    storedFilename: string;
    category: string;
    difficulty_level: number;
  };
}

// Pair selection criteria
export interface PairSelectionCriteria {
  category?: string;
  difficulty?: number;
  excludePairIds?: string[];
  limit?: number;
  activeOnly?: boolean;
}