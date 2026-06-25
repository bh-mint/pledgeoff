import { z } from 'zod';

export const InterviewQuestionSchema = z.object({
  question: z.string().min(1).max(800),
  purpose: z.string().min(1).max(600),
  followUp: z.string().max(600).optional(),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const InterviewGuideSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  targetSegment: z.string().min(1).max(500),
  questions: z.array(InterviewQuestionSchema).min(1).max(15),
  hypotheses: z.array(z.string().min(1).max(600)).min(1).max(10),
  redFlags: z.array(z.string().min(1).max(600)).min(1).max(8),
  createdAt: z.string().datetime({ offset: true }),
});
export type InterviewGuide = z.infer<typeof InterviewGuideSchema>;
