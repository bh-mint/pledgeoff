import { z } from 'zod';

export const CompetitorSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().optional(),
  positioning: z.string().min(1).max(300),
  signals: z.array(z.string().min(1).max(200)).min(1).max(5),
  // 'signal' = found in fetched signals; 'knowledge' = LLM general knowledge supplement; undefined = legacy/signal
  source: z.enum(['signal', 'knowledge']).optional(),
  estimatedPrice: z.string().max(80).optional(),
  targetSegment: z.string().max(150).optional(),
  strengths: z.array(z.string().min(1).max(150)).max(5).optional(),
  weaknesses: z.array(z.string().min(1).max(150)).max(5).optional(),
});
export type Competitor = z.infer<typeof CompetitorSchema>;

export const CompetitorGapSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  opportunity: z.string().min(1).max(300),
});
export type CompetitorGap = z.infer<typeof CompetitorGapSchema>;

export const CompetitorAnalysisSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  competitors: z.array(CompetitorSchema).min(0).max(8),
  gaps: z.array(CompetitorGapSchema).min(0).max(5),
  signalCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
});
export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;
