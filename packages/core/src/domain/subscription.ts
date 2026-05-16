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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const PLAN_LIMITS = {
  free:     { verificationsPerMonth: 1 },
  pro:      { verificationsPerMonth: 20 },
  pro_plus: { verificationsPerMonth: Infinity },
} satisfies Record<Plan, { verificationsPerMonth: number }>;

export function isActivePlan(sub: Subscription): boolean {
  return sub.status === 'active' || sub.status === 'trialing';
}

export function effectivePlan(sub: Subscription): Plan {
  return isActivePlan(sub) ? sub.plan : 'free';
}
