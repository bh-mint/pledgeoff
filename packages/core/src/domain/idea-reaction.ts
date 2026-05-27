import { z } from 'zod';

export const ReactionTypeSchema = z.enum(['agree', 'disagree']);
export type ReactionType = z.infer<typeof ReactionTypeSchema>;

export const IdeaReactionSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  reaction: ReactionTypeSchema,
  createdAt: z.string().datetime({ offset: true }),
});

export type IdeaReaction = z.infer<typeof IdeaReactionSchema>;

export function createIdeaReaction(input: {
  ideaId: string;
  userId: string;
  reaction: ReactionType;
}): IdeaReaction {
  return {
    id: crypto.randomUUID(),
    ideaId: input.ideaId,
    userId: input.userId,
    reaction: input.reaction,
    createdAt: new Date().toISOString(),
  };
}
