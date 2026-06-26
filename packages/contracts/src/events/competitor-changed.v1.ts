import { z } from 'zod';

export const SnapshotDiffSchema = z.object({
  field: z.string(),
  before: z.string(),
  after: z.string(),
  significance: z.enum(['major', 'minor']),
});

export const CompetitorChangedV1PayloadSchema = z.object({
  ideaId: z.string().uuid(),
  source: z.enum(['competitors', 'landscape']),
  diffs: z.array(SnapshotDiffSchema).min(1),
  majorChanges: z.number().int().nonnegative(),
});

export const CompetitorChangedV1Schema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('competitor.changed.v1'),
  eventVersion: z.literal(1),
  occurredAt: z.string().datetime(),
  traceId: z.string(),
  payload: CompetitorChangedV1PayloadSchema,
});

export type CompetitorChangedV1 = z.infer<typeof CompetitorChangedV1Schema>;
