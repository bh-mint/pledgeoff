import { z } from 'zod';

export const PlanSchema = z.enum(['free', 'pro', 'pro_plus']);
export type Plan = z.infer<typeof PlanSchema>;

export const SubscriptionStatusSchema = z.enum([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  plan: PlanSchema,
  status: SubscriptionStatusSchema,
  currentPeriodEnd: z.string().datetime().nullable(),
  extraSeats: z.number().int().min(0).default(0),
  stripeExtraSeatItemId: z.string().nullable().default(null),
  pastDueSince: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const PLAN_LIMITS = {
  free:     { verificationsPerMonth: 1,        seatsIncluded: 1  },
  pro:      { verificationsPerMonth: 20,       seatsIncluded: 3  },
  pro_plus: { verificationsPerMonth: Infinity, seatsIncluded: 10 },
} satisfies Record<Plan, { verificationsPerMonth: number; seatsIncluded: number }>;

export function isActivePlan(sub: Subscription): boolean {
  return sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
}

export function effectivePlan(sub: Subscription): Plan {
  return isActivePlan(sub) ? sub.plan : 'free';
}

export function effectiveSeats(sub: Subscription): number {
  return PLAN_LIMITS[effectivePlan(sub)].seatsIncluded + (isActivePlan(sub) ? sub.extraSeats : 0);
}
