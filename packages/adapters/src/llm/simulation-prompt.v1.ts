import type { Signal, Verdict, CompetitorMarketData } from '@pledgeoff/core';

// v2: optional VERIFIED MARKET DATA block (Crunchbase per-competitor funding/
// headcount) that anchors TAM and pricing and must be cited in assumptions.
export const SIMULATION_PROMPT_VERSION = 'simulationPrompt.v2' as const;

function formatMarketDataLine(d: CompetitorMarketData): string {
  const parts: string[] = [];
  if (d.fundingTotalUsd !== null) {
    const millions = d.fundingTotalUsd / 1_000_000;
    parts.push(`total funding $${millions >= 10 ? Math.round(millions) : millions.toFixed(1)}M`);
  }
  if (d.lastFundingType !== null) {
    const year = d.lastFundingAt ? ` (${d.lastFundingAt.slice(0, 4)})` : '';
    parts.push(`last round ${d.lastFundingType.replace(/_/g, ' ')}${year}`);
  }
  if (d.numEmployeesRange !== null) parts.push(`${d.numEmployeesRange} employees`);
  if (d.foundedYear !== null) parts.push(`founded ${d.foundedYear}`);
  return `- ${d.name}: ${parts.join(' · ') || 'listed on Crunchbase, no public metrics'}`;
}

export function buildSimulationPrompt(
  ideaText: string,
  verdict: Verdict,
  signals: Signal[],
  marketData?: readonly CompetitorMarketData[],
): string {
  const signalSummaries = signals
    .slice(0, 10)
    .map(
      (s, i) =>
        `Signal ${i + 1} [${s.source.toUpperCase()}] (sentiment: ${s.sentiment})\nTitle: ${s.title}\nSummary: ${s.summary.slice(0, 300)}`,
    )
    .join('\n\n');

  const marketDataBlock =
    marketData && marketData.length > 0
      ? `\nVERIFIED MARKET DATA (Crunchbase, per competitor):\n${marketData.map(formatMarketDataLine).join('\n')}\n`
      : '';

  const marketDataRule =
    marketData && marketData.length > 0
      ? '\n- VERIFIED MARKET DATA is ground truth: anchor TAM and pricing in competitor funding/headcount and cite at least one datapoint explicitly in assumptions (e.g. "Competitor X raised $5M series A (2024), 120 employees — funded space, premium pricing viable")'
      : '';

  return `You are a startup revenue simulation engine. Based on the product idea, its ${verdict} verdict, and market signals, generate a realistic revenue simulation.

IDEA:
${ideaText}

VERDICT: ${verdict}

MARKET SIGNALS (${signals.length} found):
${signalSummaries || '(no signals — use general SaaS benchmarks)'}
${marketDataBlock}
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
- MRR values must be realistic and increasing (mrr6 < mrr12 < mrr24)${marketDataRule}
- Do NOT include any text outside the JSON object`;
}
