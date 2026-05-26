import type { Plan } from './subscription';

// PLAN provides named constants for all plan values.
// Use these instead of bare string literals when comparing plans.
// Example: plan === PLAN.STUDIO  (not plan === 'studio')
export const PLAN = {
  FREE:       'free',
  FOUNDER:    'founder',
  TEAM:       'team',
  STUDIO:     'studio',
  ENTERPRISE: 'enterprise',
} as const satisfies Record<string, Plan>;

// Ordered from lowest to highest tier — useful for comparison helpers.
export const PLAN_TIERS: readonly Plan[] = ['free', 'founder', 'team', 'studio', 'enterprise'];

export function isAtLeastPlan(userPlan: Plan, minPlan: Plan): boolean {
  return PLAN_TIERS.indexOf(userPlan) >= PLAN_TIERS.indexOf(minPlan);
}
