import { z } from 'zod';

export const TranscriptQuoteSchema = z.object({
  text: z.string().min(1).max(600),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  theme: z.string().min(1).max(150),
});
export type TranscriptQuote = z.infer<typeof TranscriptQuoteSchema>;

export const TranscriptAnalysisSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  confirmedHypotheses: z.array(z.string().min(1).max(400)).max(10),
  rejectedHypotheses: z.array(z.string().min(1).max(400)).max(10),
  newInsights: z.array(z.string().min(1).max(400)).max(10),
  quotes: z.array(TranscriptQuoteSchema).max(15),
  signalStrength: z.enum(['strong', 'moderate', 'weak']),
  createdAt: z.string().datetime({ offset: true }),
});
export type TranscriptAnalysis = z.infer<typeof TranscriptAnalysisSchema>;
