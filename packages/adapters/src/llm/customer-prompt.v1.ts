import type { Signal } from '@pledgeoff/core';

export const CUSTOMER_PROMPT_VERSION = 'customerPrompt.v1' as const;
export const CUSTOMER_LIMITED_PROMPT_VERSION = 'customerLimitedPrompt.v1' as const;

export function buildCustomerPrompt(ideaText: string, signals: Signal[]): string {
  const signalLines = signals
    .map((s, i) => `[${i + 1}] source:${s.source} sentiment:${s.sentiment} url:${s.url}\ntitle: ${s.title}\nsummary: ${s.summary}`)
    .join('\n\n');

  return `You are a customer intelligence analyst. Analyze market signals for a startup idea and identify customer segments, pain points, sentiment, and representative quotes.

IDEA:
${ideaText}

MARKET SIGNALS (${signals.length} total — use ONLY these as source for quotes):
${signalLines || 'No signals available.'}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "segments": [
    {
      "name": "<segment name, max 10 words>",
      "description": "<who they are and why they want this, max 40 words>",
      "size": "<'small'|'medium'|'large' relative to total addressable market>"
    }
  ],
  "painPoints": [
    {
      "text": "<specific pain point, max 25 words>",
      "rank": <1 = most critical>
    }
  ],
  "sentiment": {
    "positive": <integer 0-100, percentage of signals with positive signal>,
    "negative": <integer 0-100>,
    "neutral": <integer 0-100>
  },
  "quotes": [
    {
      "text": "<verbatim text from the signal summary above — do NOT invent quotes>",
      "source": "<'reddit'|'github'>",
      "url": "<exact url from the signal above>"
    }
  ]
}

Rules:
- segments: 2-3, ordered by market size (largest first)
- painPoints: 3-5, ranked 1 (worst) to 5
- sentiment.positive + negative + neutral must sum to 100
- quotes: 2-5 quotes, ONLY from the signals provided above — copy text verbatim from summaries
- If signals are empty or insufficient, still output 1 segment and 1 pain point based on idea text alone, and use an empty quotes array
- Works for any verdict (GO/KILL/PIVOT) — if demand is weak, segments are smaller and pain points reflect lack of need
- Write in English regardless of idea language
- Do NOT include any text outside the JSON object`;
}

export function buildLimitedCustomerPrompt(ideaText: string): string {
  return `You are a customer intelligence analyst. Identify the primary customer segment and top pain points for this startup idea.

IDEA:
${ideaText}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "segments": [
    {
      "name": "<primary segment name, max 10 words>",
      "description": "<who they are and why they want this, max 40 words>",
      "size": "<'small'|'medium'|'large' relative to total addressable market>"
    }
  ],
  "painPoints": [
    {
      "text": "<specific pain point, max 25 words>",
      "rank": <1 = most critical>
    }
  ]
}

Rules:
- segments: exactly 1, the most important primary segment
- painPoints: 1-3, ranked 1 (worst) first
- Write in English regardless of idea language
- Do NOT include any text outside the JSON object`;
}
