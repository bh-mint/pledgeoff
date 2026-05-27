import { z } from 'zod';

export const LandingPageSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  headline: z.string().min(1).max(100),
  subheadline: z.string().min(1).max(200),
  features: z.array(z.string()).min(1).max(5),
  ctaText: z.string().min(1).max(60),
  waitlistHeadline: z.string().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
});
export type LandingPage = z.infer<typeof LandingPageSchema>;
