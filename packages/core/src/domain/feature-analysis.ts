import { z } from 'zod';

export const FeatureCoverageSchema = z.enum(['yes', 'partial', 'no']);
export type FeatureCoverage = z.infer<typeof FeatureCoverageSchema>;

export const FeatureRowSchema = z.object({
  feature: z.string().min(1).max(100),
  category: z.string().min(1).max(60).optional(),
  competitors: z.record(z.string(), FeatureCoverageSchema),
  idea: FeatureCoverageSchema,
});
export type FeatureRow = z.infer<typeof FeatureRowSchema>;

export const FeatureAnalysisSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  features: z.array(FeatureRowSchema).min(1).max(20),
  competitorNames: z.array(z.string()).min(1).max(8),
  createdAt: z.string().datetime({ offset: true }),
});
export type FeatureAnalysis = z.infer<typeof FeatureAnalysisSchema>;
