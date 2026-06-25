import { z } from 'zod';

export const HeadlineVariantSchema = z.object({
  variant: z.enum(['A', 'B', 'C']),
  headline: z.string().min(1).max(120),
  angle: z.string().min(1).max(200),
});

export const EmailMessageSchema = z.object({
  sequence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  subject: z.string().min(1).max(100),
  body: z.string().min(1).max(3000),
  sendAt: z.string().min(1).max(60),
});

export const PricingRecommendationSchema = z.object({
  tier: z.string().min(1).max(60),
  priceMonthly: z.number().positive(),
  currency: z.string().length(3),
  rationale: z.string().min(1).max(400),
  anchoring: z.string().min(1).max(200),
});

export const ActionPlanPhaseSchema = z.object({
  phase: z.enum(['0-30', '31-60', '61-90']),
  focus: z.string().min(1).max(120),
  actions: z.array(z.string().min(1).max(200)).min(1).max(6),
  metric: z.string().min(1).max(150),
});

export const LaunchKitSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  headlines: z.array(HeadlineVariantSchema).min(1).max(3),
  emailSequence: z.array(EmailMessageSchema).min(1).max(3),
  pricingRecommendation: PricingRecommendationSchema,
  actionPlan: z.array(ActionPlanPhaseSchema).length(3).optional(),
  createdAt: z.string().datetime({ offset: true }),
});

export type HeadlineVariant = z.infer<typeof HeadlineVariantSchema>;
export type EmailMessage = z.infer<typeof EmailMessageSchema>;
export type PricingRecommendation = z.infer<typeof PricingRecommendationSchema>;
export type ActionPlanPhase = z.infer<typeof ActionPlanPhaseSchema>;
export type LaunchKit = z.infer<typeof LaunchKitSchema>;
