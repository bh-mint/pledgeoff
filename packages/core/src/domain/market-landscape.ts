import { z } from 'zod';

export const MarketSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  situation: z.enum(['competitive', 'growing', 'opportunity']),
  description: z.string().min(1).max(300),
});
export type MarketSegment = z.infer<typeof MarketSegmentSchema>;

export const MarketLandscapeSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  segments: z.array(MarketSegmentSchema).min(1).max(8),
  trends: z.array(z.string().min(1).max(200)).min(1).max(6),
  uncoveredOpportunities: z.array(z.string().min(1).max(200)).min(1).max(5),
  createdAt: z.string().datetime({ offset: true }),
});
export type MarketLandscape = z.infer<typeof MarketLandscapeSchema>;
