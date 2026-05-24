import { z } from 'zod';

export const EngineeringSnapshotResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  githubOrg: z.string(),
  repoFilter: z.array(z.string()).nullable(),
  velocityMetrics: z.object({
    prMergeRatePerWeek: z.number(),
    avgCycleTimeDays: z.number(),
    avgLeadTimeDays: z.number(),
    issuesClosedPerWeek: z.number(),
    topBottlenecks: z.array(z.string()),
    snapshotAt: z.string(),
  }),
  bottlenecks: z.array(z.string()),
  snapshotAt: z.string(),
  createdAt: z.string(),
});

export const DeliveryEstimateResponseSchema = z.object({
  estimateDays: z.object({
    min: z.number(),
    mid: z.number(),
    max: z.number(),
  }),
  confidence: z.enum(['low', 'medium', 'high']),
  reasoning: z.string(),
  hasVelocityData: z.boolean(),
});
