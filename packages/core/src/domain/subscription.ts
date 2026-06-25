import { z } from 'zod';
import { InvalidDomainDataError } from './errors';

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
  currentPeriodEnd: z.string().datetime({ offset: true }).nullable(),
  extraSeats: z.number().int().min(0).default(0),
  stripeExtraSeatItemId: z.string().nullable().default(null),
  pastDueSince: z.string().datetime({ offset: true }).nullable().default(null),
  ottoIncludedUsed: z.number().int().min(0).default(0),
  ottoIncludedResetAt: z.string().datetime({ offset: true }).nullable().default(null),
  ottoPurchased: z.number().int().min(0).default(0),
  verificationsPurchased: z.number().int().min(0).default(0),
  adminOverride: z.boolean().default(false),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const PLAN_LIMITS = {
  free:       { verificationsPerMonth: 1,        seatsIncluded: 1,        ottoQuestionsPerMonth: 0        },
  founder:    { verificationsPerMonth: 20,       seatsIncluded: 1,        ottoQuestionsPerMonth: 15       },
  team:       { verificationsPerMonth: 60,       seatsIncluded: 3,        ottoQuestionsPerMonth: 45       },
  studio:     { verificationsPerMonth: 100,      seatsIncluded: 8,        ottoQuestionsPerMonth: 120      },
  enterprise: { verificationsPerMonth: 200,      seatsIncluded: Infinity, ottoQuestionsPerMonth: Infinity },
} satisfies Record<Plan, { verificationsPerMonth: number; seatsIncluded: number; ottoQuestionsPerMonth: number }>;

export const TOOL_KEYS = ['icp', 'icp_limited', 'comp', 'rev', 'build', 'page', 'gtm', 'features', 'battlecard', 'market-landscape'] as const;
export type ToolKey = typeof TOOL_KEYS[number];

export const PLAN_TOOL_GATES: Record<Plan, readonly ToolKey[]> = {
  free:       ['icp_limited'],
  founder:    ['icp', 'comp', 'rev', 'build', 'page', 'features', 'market-landscape'],
  team:       ['icp', 'comp', 'rev', 'build', 'page', 'gtm', 'features', 'battlecard', 'market-landscape'],
  studio:     ['icp', 'comp', 'rev', 'build', 'page', 'gtm', 'features', 'battlecard', 'market-landscape'],
  enterprise: ['icp', 'comp', 'rev', 'build', 'page', 'gtm', 'features', 'battlecard', 'market-landscape'],
} as const;

export function hasPlanToolAccess(plan: Plan, tool: ToolKey): boolean {
  return (PLAN_TOOL_GATES[plan] as readonly string[]).includes(tool);
}

export function requiredPlanForTool(tool: ToolKey): Plan {
  if (tool === 'gtm' || tool === 'battlecard') return 'team';
  return 'founder';
}

export const VALIDATION_PACK_SIZES = [10, 25, 60, 100] as const;
export type ValidationPackSize = typeof VALIDATION_PACK_SIZES[number];

export const VALIDATION_PACK_PRICES_EUR: Record<ValidationPackSize, number> = {
  10: 19,
  25: 42,
  60: 85,
  100: 120,
};

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

export function subscriptionFromPersistence(data: unknown): Subscription {
  const result = SubscriptionSchema.safeParse(data);
  if (!result.success) {
    throw new InvalidDomainDataError('Subscription', result.error.message);
  }
  return result.data;
}
