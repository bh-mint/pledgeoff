import { z } from 'zod';

export const SimulationScenarioSchema = z.object({
  name: z.enum(['conservative', 'moderate', 'optimistic']),
  pricePerUser: z.number().positive(),
  mrr6: z.number().nonnegative(),
  mrr12: z.number().nonnegative(),
  mrr24: z.number().nonnegative(),
});
export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;

export const SimulationSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  tamLow: z.number().nonnegative(),
  tamHigh: z.number().nonnegative(),
  scenarios: z.array(SimulationScenarioSchema).length(3),
  breakEvenMonths: z.number().nonnegative(),
  assumptions: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type Simulation = z.infer<typeof SimulationSchema>;
