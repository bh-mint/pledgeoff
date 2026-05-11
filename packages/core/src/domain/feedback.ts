import { z } from 'zod';

export const FeedbackVoteSchema = z.enum(['thumbs_up', 'thumbs_down']);
export type FeedbackVote = z.infer<typeof FeedbackVoteSchema>;

export const FeedbackSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  decisionId: z.string().uuid(),
  userId: z.string().uuid(),
  vote: FeedbackVoteSchema,
  comment: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;
