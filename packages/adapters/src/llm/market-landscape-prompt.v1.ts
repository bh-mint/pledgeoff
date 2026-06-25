import type { Signal } from '@pledgeoff/core';

export const MARKET_LANDSCAPE_PROMPT_VERSION = 'market-landscape-v1';

export function buildMarketLandscapePrompt(ideaText: string, signals: Signal[]): string {
  const signalBlock = signals.length === 0
    ? 'No signals available.'
    : signals.map((s, i) =>
        `[${i + 1}] ${s.source.toUpperCase()} | ${s.title}\n${s.summary ?? ''}`
      ).join('\n\n');

  return `You are a market intelligence analyst. Based on the idea and signals below, map the market landscape.

<idea>
${ideaText}
</idea>

<signals>
${signalBlock}
</signals>

<instructions>
Identify 3–6 distinct market segments relevant to this idea. For each segment, assess its current situation:
- "competitive": dominated by established players, difficult to win
- "growing": expanding market with room for new entrants
- "opportunity": underserved or overlooked segment with clear whitespace

Then identify 2–4 macro trends shaping this market.
Then identify 2–4 uncovered opportunities — specific problems or use cases that existing solutions miss.

Base your analysis on the signals above + your training knowledge. Do NOT fabricate facts. Be specific and actionable.
</instructions>

Return ONLY valid JSON. No markdown, no explanation, no code fences.

<output_format>
{
  "segments": [
    {
      "name": "string, segment name (e.g. 'SMB Product Teams')",
      "situation": "competitive|growing|opportunity",
      "description": "string, 1-2 sentences describing this segment and why it has this situation"
    }
  ],
  "trends": [
    "string, macro trend affecting this market"
  ],
  "uncoveredOpportunities": [
    "string, specific gap or unmet need that existing solutions miss"
  ]
}
</output_format>`;
}
