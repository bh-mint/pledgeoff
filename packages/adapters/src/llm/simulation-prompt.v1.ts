import type { Signal, Verdict } from '@pledgeoff/core';

export const SIMULATION_PROMPT_VERSION = 'simulationPrompt.v1' as const;

export function buildSimulationPrompt(ideaText: string, verdict: Verdict, signals: Signal[]): string {
  const signalSummaries = signals
    .slice(0, 10)
    .map(
      (s, i) =>
        `Signal ${i + 1} [${s.source.toUpperCase()}] (sentiment: ${s.sentiment})\nTitle: ${s.title}\nSummary: ${s.summary.slice(0, 300)}`,
    )
    .join('\n\n');

  return `You are a startup revenue simulation engine. Based on the product idea, its ${verdict} verdict, and market signals, generate a realistic revenue simulation.

IDEA:
${ideaText}

VERDICT: ${verdict}

MARKET SIGNALS (${signals.length} found):
${signalSummaries || '(no signals — use general SaaS benchmarks)'}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "tamLow": <total addressable market in USD, conservative estimate, integer>,
  "tamHigh": <total addressable market in USD, optimistic estimate, integer>,
  "scenarios": [
    {
      "name": "conservative",
      "pricePerUser": <monthly price in USD>,
      "mrr6": <monthly recurring revenue at 6 months>,
      "mrr12": <monthly recurring revenue at 12 months>,
      "mrr24": <monthly recurring revenue at 24 months>
    },
    {
      "name": "moderate",
      "pricePerUser": <monthly price in USD>,
      "mrr6": <MRR at 6 months>,
      "mrr12": <MRR at 12 months>,
      "mrr24": <MRR at 24 months>
    },
    {
      "name": "optimistic",
      "pricePerUser": <monthly price in USD>,
      "mrr6": <MRR at 6 months>,
      "mrr12": <MRR at 12 months>,
      "mrr24": <MRR at 24 months>
    }
  ],
  "breakEvenMonths": <months until MRR covers basic operating costs, integer>,
  "assumptions": [<string>, <string>, <string>]
}

Rules:
- All monetary values are integers in USD
- TAM should be realistic for the niche described (not the entire world market)
- Conservative scenario: bootstrapped, slow growth, lower price point
- Moderate scenario: normal SaaS growth, typical price point for category
- Optimistic scenario: viral growth or strong sales, premium price
- breakEvenMonths assumes $2000-5000/mo baseline costs (tools, hosting, marketing)
- assumptions: 3 key assumptions underlying the simulation (e.g. "B2C self-serve", "10% MoM growth", "No enterprise deals")
- MRR values must be realistic and increasing (mrr6 < mrr12 < mrr24)
- Do NOT include any text outside the JSON object`;
}
