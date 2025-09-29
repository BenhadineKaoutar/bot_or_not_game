import { z } from 'zod';

export const DailyChallengeSchema = z.object({
  id: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD format
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty_level: z.number().min(1).max(5),
  category: z.enum(['portrait', 'landscape', 'object', 'abstract', 'any']).optional(),
  points_reward: z.number().min(50).max(1000).default(100),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date()
});

export const CreateDailyChallengeSchema = z.object({
  date: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  difficulty_level: z.number().min(1).max(5),
  category: z.enum(['portrait', 'landscape', 'object', 'abstract', 'any']).optional(),
  points_reward: z.number().min(50).max(1000).default(100)
});

export type DailyChallenge = z.infer<typeof DailyChallengeSchema>;
export type CreateDailyChallengeData = z.infer<typeof CreateDailyChallengeSchema>;