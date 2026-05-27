import { z } from 'zod';
import { Result, ok, err } from 'neverthrow';
import { InvalidDomainDataError } from './errors';

export const VerdictSchema = z.enum(['GO', 'KILL', 'PIVOT']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const DimensionSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(100),
});
export type Dimension = z.infer<typeof DimensionSchema>;

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  verdict: VerdictSchema,
  reasoning: z.string().min(1).max(5000),
  confidence: z.number().min(0).max(1),
  score: z.number().int().min(0).max(100).optional(),
  signalIds: z.array(z.string().uuid()),
  dimensions: z.array(DimensionSchema).optional(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Decision = z.infer<typeof DecisionSchema>;

export class InvalidDecisionError extends Error {
  readonly code = 'INVALID_DECISION' as const;
}

const EXPECTED_DIMENSIONS = ['Market Demand', 'Competition', 'Feasibility', 'Timing'] as const;

export function validateDimensions(dimensions: Dimension[]): Result<Dimension[], InvalidDecisionError> {
  const names = new Set(dimensions.map((d) => d.name));
  const missing = EXPECTED_DIMENSIONS.filter((n) => !names.has(n));
  if (missing.length > 0) {
    return err(new InvalidDecisionError(`Missing dimensions: ${missing.join(', ')}`));
  }
  const weightSum = dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (Math.abs(weightSum - 1.0) > 0.05) {
    return err(new InvalidDecisionError(`Dimension weights sum to ${weightSum.toFixed(2)}, expected 1.0`));
  }
  return ok(dimensions);
}

export function computeScore(dimensions?: Dimension[]): number | undefined {
  if (!dimensions?.length) return undefined;
  return Math.round(dimensions.reduce((sum, d) => sum + d.weight * d.score, 0));
}

// Stricter schema for reading from DB: score is required (NOT NULL after migration DB-1).
const DecisionPersistenceSchema = DecisionSchema.extend({
  score: z.number().int().min(0).max(100),
});

export function decisionFromPersistence(data: unknown): Decision {
  const result = DecisionPersistenceSchema.safeParse(data);
  if (!result.success) {
    throw new InvalidDomainDataError('Decision', result.error.message);
  }
  return result.data;
}

export { InvalidDomainDataError };
