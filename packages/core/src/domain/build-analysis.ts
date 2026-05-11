import { z } from 'zod';

export const TechDecisionSchema = z.enum(['build', 'buy', 'oss']);
export type TechDecision = z.infer<typeof TechDecisionSchema>;

export const TechLibrarySchema = z.object({
  name: z.string().min(1).max(80),
  purpose: z.string().min(1).max(200),
  githubUrl: z.string().url().optional(),
  stars: z.number().int().nonnegative().optional(),
});
export type TechLibrary = z.infer<typeof TechLibrarySchema>;

export const TechComponentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  decision: TechDecisionSchema,
  rationale: z.string().min(1).max(300),
  libraries: z.array(TechLibrarySchema).max(5),
});
export type TechComponent = z.infer<typeof TechComponentSchema>;

export const TechGapSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  opportunity: z.string().min(1).max(300),
});
export type TechGap = z.infer<typeof TechGapSchema>;

export const BuildAnalysisSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  stack: z.array(TechComponentSchema).min(1).max(8),
  gaps: z.array(TechGapSchema).min(0).max(5),
  signalCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type BuildAnalysis = z.infer<typeof BuildAnalysisSchema>;
