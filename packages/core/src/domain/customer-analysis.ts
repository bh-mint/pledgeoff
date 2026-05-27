import { z } from 'zod';

export const CustomerSegmentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(300),
  size: z.enum(['small', 'medium', 'large']),
});
export type CustomerSegment = z.infer<typeof CustomerSegmentSchema>;

export const PainPointSchema = z.object({
  text: z.string().min(1).max(200),
  rank: z.number().int().min(1),
});
export type PainPoint = z.infer<typeof PainPointSchema>;

export const SentimentBreakdownSchema = z.object({
  positive: z.number().min(0).max(100),
  negative: z.number().min(0).max(100),
  neutral: z.number().min(0).max(100),
});
export type SentimentBreakdown = z.infer<typeof SentimentBreakdownSchema>;

export const CustomerQuoteSchema = z.object({
  text: z.string().min(1).max(400),
  source: z.enum(['reddit', 'hn', 'github']),
  url: z.string().url(),
});
export type CustomerQuote = z.infer<typeof CustomerQuoteSchema>;

export const CustomerAnalysisSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  segments: z.array(CustomerSegmentSchema).min(1).max(5),
  painPoints: z.array(PainPointSchema).min(1).max(10),
  sentiment: SentimentBreakdownSchema,
  quotes: z.array(CustomerQuoteSchema).min(1).max(10),
  createdAt: z.string().datetime({ offset: true }),
});
export type CustomerAnalysis = z.infer<typeof CustomerAnalysisSchema>;
