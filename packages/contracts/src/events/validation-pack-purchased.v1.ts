import { z } from 'zod';

export const ValidationPackPurchasedV1PayloadSchema = z.object({
  userId: z.string().uuid(),
  validationCount: z.number().int().positive(),
});

export const ValidationPackPurchasedV1Schema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('validation-pack.purchased.v1'),
  eventVersion: z.literal(1),
  occurredAt: z.string().datetime(),
  traceId: z.string(),
  payload: ValidationPackPurchasedV1PayloadSchema,
});

export type ValidationPackPurchasedV1 = z.infer<typeof ValidationPackPurchasedV1Schema>;
