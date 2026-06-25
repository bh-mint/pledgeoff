import { z } from 'zod';

export const AnalyzeTranscriptRequestSchema = z.object({
  transcript: z.string().min(10).max(10000),
});

export type AnalyzeTranscriptRequest = z.infer<typeof AnalyzeTranscriptRequestSchema>;
