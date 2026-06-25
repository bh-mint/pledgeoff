import { z } from 'zod';

export const BattlecardEntrySchema = z.object({
  competitorName: z.string().min(1).max(100),
  objection: z.string().min(1).max(300),
  response: z.string().min(1).max(600),
  ourAdvantages: z.array(z.string().min(1).max(200)).min(1).max(6),
  theirWeaknesses: z.array(z.string().min(1).max(200)).min(1).max(6),
});

export type BattlecardEntry = z.infer<typeof BattlecardEntrySchema>;

export const BattlecardSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  entries: z.array(BattlecardEntrySchema).min(1).max(8),
  createdAt: z.string().datetime({ offset: true }),
});

export type Battlecard = z.infer<typeof BattlecardSchema>;
