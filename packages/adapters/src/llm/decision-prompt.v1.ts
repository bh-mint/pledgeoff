import type { Signal } from '@pledgeoff/core';

export const PROMPT_VERSION = 'decisionPrompt.v1' as const;

export function buildDecisionPrompt(ideaText: string, signals: Signal[]): string {
  const signalSummaries = signals
    .map(
      (s, i) =>
        `Signal ${i + 1} [${s.source.toUpperCase()}] (sentiment: ${s.sentiment})\nTitle: ${s.title}\nSummary: ${s.summary.slice(0, 500)}`,
    )
    .join('\n\n');

  return `You are a startup decision intelligence system. Analyze market signals and produce a GO/KILL/PIVOT verdict for a product idea.

IDEA:
${ideaText}

MARKET SIGNALS (${signals.length} found):
${signalSummaries || '(no signals found — limited data available)'}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "verdict": "GO" | "KILL" | "PIVOT",
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "<2-4 sentences explaining the verdict based on the signals>",
  "dimensions": [
    { "name": "Market Demand",  "weight": 0.40, "score": <0-100> },
    { "name": "Competition",    "weight": 0.25, "score": <0-100> },
    { "name": "Feasibility",    "weight": 0.20, "score": <0-100> },
    { "name": "Timing",         "weight": 0.15, "score": <0-100> }
  ]
}

Rules:
- GO: strong positive signal, clear demand, feasible
- KILL: negative signals dominate, low demand, high risk
- PIVOT: mixed signals, demand exists but product direction needs adjustment
- confidence reflects how much evidence supports the verdict (0.5 = weak, 0.9 = strong)
- reasoning must cite specific evidence from the signals
- dimensions.score: 0-100 per dimension based on signals; weights must sum to 1.0
- Do NOT include any text outside the JSON object`;
}
