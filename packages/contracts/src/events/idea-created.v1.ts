import { z } from 'zod';

export const IdeaCreatedV1PayloadSchema = z.object({
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  text: z.string().min(10).max(2000),
});

export const IdeaCreatedV1Schema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('idea.created.v1'),
  eventVersion: z.literal(1),
  occurredAt: z.string().datetime(),
  traceId: z.string(),
  payload: IdeaCreatedV1PayloadSchema,
});

export type IdeaCreatedV1 = z.infer<typeof IdeaCreatedV1Schema>;
