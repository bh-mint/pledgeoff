import { z } from 'zod';
import { Result, ok } from 'neverthrow';

export const OutcomeTypeSchema = z.enum(['built_worked', 'built_failed', 'not_built']);
export type OutcomeType = z.infer<typeof OutcomeTypeSchema>;

export const DecisionOutcomeSchema = z.object({
  id: z.string().uuid(),
  ideaId: z.string().uuid(),
  userId: z.string().uuid(),
  verdictAtTime: z.string(),
  outcomeType: OutcomeTypeSchema,
  notes: z.string().max(1000).nullable(),
  reportedAt: z.string().datetime({ offset: true }),
});

export type DecisionOutcome = z.infer<typeof DecisionOutcomeSchema>;

export class OutcomeAlreadyReportedError extends Error {
  readonly code = 'OUTCOME_ALREADY_REPORTED';
  constructor() {
    super('Outcome already reported for this idea');
  }
}

export class InvalidVerdictError extends Error {
  readonly code = 'INVALID_VERDICT';
  constructor() {
    super('No decision found for this idea');
  }
}

export function createDecisionOutcome(input: {
  ideaId: string;
  userId: string;
  verdictAtTime: string;
  outcomeType: OutcomeType;
  notes?: string | null;
}): Result<DecisionOutcome, never> {
  return ok({
    id: crypto.randomUUID(),
    ideaId: input.ideaId,
    userId: input.userId,
    verdictAtTime: input.verdictAtTime,
    outcomeType: input.outcomeType,
    notes: input.notes ?? null,
    reportedAt: new Date().toISOString(),
  });
}

export type FlywheelStats = {
  totalOutcomes: number;
  accuracyRate: number | null; // null if <3 outcomes
  byVerdict: {
    GO: { total: number; correct: number };
    KILL: { total: number; correct: number };
    PIVOT: { total: number; total_reported: number };
  };
  accuracyTrend: Array<{ month: string; rate: number; count: number }>;
};

export function calculateAccuracy(outcomes: DecisionOutcome[]): FlywheelStats {
  const total = outcomes.length;

  const byVerdict = {
    GO: { total: 0, correct: 0 },
    KILL: { total: 0, correct: 0 },
    PIVOT: { total: 0, total_reported: 0 },
  };

  for (const o of outcomes) {
    const v = o.verdictAtTime as 'GO' | 'KILL' | 'PIVOT';
    if (v === 'GO') {
      byVerdict.GO.total++;
      if (o.outcomeType === 'built_worked') byVerdict.GO.correct++;
    } else if (v === 'KILL') {
      byVerdict.KILL.total++;
      if (o.outcomeType === 'not_built') byVerdict.KILL.correct++;
    } else if (v === 'PIVOT') {
      byVerdict.PIVOT.total_reported++;
    }
  }

  const correctTotal = byVerdict.GO.correct + byVerdict.KILL.correct;
  const measurableTotal = byVerdict.GO.total + byVerdict.KILL.total;
  const accuracyRate = total < 3 ? null : measurableTotal === 0 ? null : Math.round((correctTotal / measurableTotal) * 100);

  // monthly breakdown
  const monthMap = new Map<string, { correct: number; total: number }>();
  for (const o of outcomes) {
    const month = o.reportedAt.slice(0, 7); // YYYY-MM
    const v = o.verdictAtTime as 'GO' | 'KILL' | 'PIVOT';
    if (v === 'PIVOT') continue;
    const entry = monthMap.get(month) ?? { correct: 0, total: 0 };
    entry.total++;
    if ((v === 'GO' && o.outcomeType === 'built_worked') || (v === 'KILL' && o.outcomeType === 'not_built')) {
      entry.correct++;
    }
    monthMap.set(month, entry);
  }

  const accuracyTrend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { correct, total: t }]) => ({
      month,
      rate: t === 0 ? 0 : Math.round((correct / t) * 100),
      count: t,
    }));

  return { totalOutcomes: total, accuracyRate, byVerdict, accuracyTrend };
}
