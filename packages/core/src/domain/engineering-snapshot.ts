import { z } from 'zod';

export const VelocityMetricsSchema = z.object({
  prMergeRatePerWeek: z.number().nonnegative(),
  avgCycleTimeDays: z.number().nonnegative(),
  avgLeadTimeDays: z.number().nonnegative(),
  issuesClosedPerWeek: z.number().nonnegative(),
  topBottlenecks: z.array(z.string()).max(5),
  snapshotAt: z.string().datetime({ offset: true }),
});

export type VelocityMetrics = z.infer<typeof VelocityMetricsSchema>;

export const EngineeringSnapshotSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  githubOrg: z.string().min(1).max(100),
  repoFilter: z.array(z.string()).nullable(),
  velocityMetrics: VelocityMetricsSchema,
  bottlenecks: z.array(z.string()).max(5),
  snapshotAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
});

export type EngineeringSnapshot = z.infer<typeof EngineeringSnapshotSchema>;

export const DeliveryEstimateSchema = z.object({
  estimateDays: z.object({
    min: z.number().positive(),
    mid: z.number().positive(),
    max: z.number().positive(),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
  reasoning: z.string(),
  hasVelocityData: z.boolean(),
});

export type DeliveryEstimate = z.infer<typeof DeliveryEstimateSchema>;

export function detectBottlenecks(metrics: Omit<VelocityMetrics, 'topBottlenecks' | 'snapshotAt'>): string[] {
  const bottlenecks: string[] = [];
  if (metrics.avgCycleTimeDays > 7) bottlenecks.push('Long PR review cycles (>7 days)');
  if (metrics.prMergeRatePerWeek < 1) bottlenecks.push('Slow merge rate (<1 PR/week)');
  if (metrics.issuesClosedPerWeek < 2) bottlenecks.push('Low issue resolution rate');
  if (metrics.avgLeadTimeDays > metrics.avgCycleTimeDays * 1.5) bottlenecks.push('High lead time vs cycle time ratio');
  return bottlenecks.slice(0, 5);
}
