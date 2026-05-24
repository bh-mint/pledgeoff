import type { Verdict } from './decision';

export type DecisionQueueEntry = {
  readonly id: string;
  readonly userId: string;
  readonly ideaId: string;
  readonly priorityScore: number; // 0.0–1.0
  readonly lastSignalChange: string | null; // ISO datetime
  readonly changeSummary: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type QueueItem = DecisionQueueEntry & {
  readonly ideaText: string;
  readonly verdict: Verdict | null;
  readonly confidence: number | null;
};

const VERDICT_BASE: Record<Verdict, number> = { GO: 0.8, PIVOT: 0.5, KILL: 0.2 };

export function computePriorityScore(params: {
  verdict: Verdict | null;
  confidence: number | null;
  score: number | null;
}): number {
  const verdictBase = params.verdict ? VERDICT_BASE[params.verdict] : 0.3;
  const confidence = params.confidence ?? 0.5;
  const normalizedScore = params.score != null ? params.score / 100 : 0.5;
  const raw = verdictBase * 0.4 + confidence * 0.3 + normalizedScore * 0.3;
  return Math.round(raw * 10000) / 10000;
}
