import { z } from 'zod';

export const CreateIdeaRequestSchema = z.object({
  text: z.string().min(10).max(2000),
  teamId: z.string().uuid().nullable().optional(),
  context: z.string().max(3000).nullable().optional(),
});

export type CreateIdeaRequest = z.infer<typeof CreateIdeaRequestSchema>;

export const IdeaResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  text: z.string(),
  createdAt: z.string().datetime(),
});

export type IdeaResponse = z.infer<typeof IdeaResponseSchema>;
