import { z } from 'zod';

export const PlanSchema = z.enum(['free', 'founder', 'team', 'studio', 'enterprise']);
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
  ottoIncludedUsed: z.number().int().min(0).default(0),
  ottoIncludedResetAt: z.string().datetime().nullable().default(null),
  ottoPurchased: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const PLAN_LIMITS = {
  free:       { verificationsPerMonth: 1,        seatsIncluded: 1,        ottoQuestionsPerMonth: 0        },
  founder:    { verificationsPerMonth: 20,       seatsIncluded: 1,        ottoQuestionsPerMonth: 5        },
  team:       { verificationsPerMonth: Infinity, seatsIncluded: 3,        ottoQuestionsPerMonth: 15       },
  studio:     { verificationsPerMonth: Infinity, seatsIncluded: 8,        ottoQuestionsPerMonth: 50       },
  enterprise: { verificationsPerMonth: Infinity, seatsIncluded: 25,       ottoQuestionsPerMonth: Infinity },
} satisfies Record<Plan, { verificationsPerMonth: number; seatsIncluded: number; ottoQuestionsPerMonth: number }>;

export const OTTO_PACK_SIZES = [10, 25, 60, 150] as const;
export type OttoPackSize = typeof OTTO_PACK_SIZES[number];

export const OTTO_PACK_PRICES_EUR: Record<OttoPackSize, number> = {
  10:  15,
  25:  30,
  60:  60,
  150: 120,
};

export function ottoAvailableQuestions(sub: Subscription): { included: number; purchased: number; total: number } {
  const plan = effectivePlan(sub);
  const includedLimit = PLAN_LIMITS[plan].ottoQuestionsPerMonth;
  const included = Math.max(0, includedLimit - sub.ottoIncludedUsed);
  const purchased = sub.ottoPurchased;
  return { included, purchased, total: included + purchased };
}

export function canAskOtto(sub: Subscription): boolean {
  const { total } = ottoAvailableQuestions(sub);
  return total > 0;
}

export function isActivePlan(sub: Subscription): boolean {
  return sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due';
}

export function effectivePlan(sub: Subscription): Plan {
  return isActivePlan(sub) ? sub.plan : 'free';
}

export function effectiveSeats(sub: Subscription): number {
  return PLAN_LIMITS[effectivePlan(sub)].seatsIncluded + (isActivePlan(sub) ? sub.extraSeats : 0);
}

export function isStudioOrHigher(plan: Plan): boolean {
  return plan === 'studio' || plan === 'enterprise';
}
