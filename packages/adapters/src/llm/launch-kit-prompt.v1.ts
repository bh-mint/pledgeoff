import type { Signal } from '@pledgeoff/core';

export const LAUNCH_KIT_PROMPT_VERSION = 'launchKitPrompt.v1' as const;

export function buildLaunchKitPrompt(ideaText: string, signals: Signal[]): string {
  const topSignals = signals.slice(0, 12).map((s) => `- ${s.title}: ${s.summary?.slice(0, 150) ?? ''}`).join('\n');

  return `You are a B2B SaaS go-to-market strategist. Generate a launch kit for a validated startup idea.

IDEA:
${ideaText}

MARKET SIGNALS (real data from Reddit, GitHub, HN):
${topSignals || '(no signals available — use the idea text)'}

Generate a complete launch kit. Respond ONLY with a valid JSON object:
{
  "headlines": [
    { "variant": "A", "headline": "<max 10 words, outcome-focused>", "angle": "<1 sentence: the psychological angle this headline exploits>" },
    { "variant": "B", "headline": "<max 10 words, problem-focused>", "angle": "<1 sentence>" },
    { "variant": "C", "headline": "<max 10 words, contrarian or curiosity-driven>", "angle": "<1 sentence>" }
  ],
  "emailSequence": [
    {
      "sequence": 1,
      "subject": "<welcome subject, max 60 chars>",
      "body": "<150–250 words: thank them for joining, state exactly what the product does, set expectation for next email>",
      "sendAt": "Immediately after signup"
    },
    {
      "sequence": 2,
      "subject": "<follow-up subject, max 60 chars>",
      "body": "<150–250 words: share the 1 insight from market research that proves the pain is real, tease early access>",
      "sendAt": "3 days after signup"
    },
    {
      "sequence": 3,
      "subject": "<pitch subject, max 60 chars>",
      "body": "<150–250 words: announce early access, present pricing clearly, include specific CTA with link placeholder [LINK]>",
      "sendAt": "7 days after signup"
    }
  ],
  "pricingRecommendation": {
    "tier": "<tier name, e.g. Starter, Pro, Growth>",
    "priceMonthly": <number: recommended USD monthly price>,
    "currency": "USD",
    "rationale": "<max 200 words: why this price point — reference competitors, willingness to pay signals from the data, value metric>",
    "anchoring": "<max 100 words: how to frame this price to reduce sticker shock — comparison to alternatives, ROI framing, or annual discount>"
  },
  "actionPlan": [
    {
      "phase": "0-30",
      "focus": "<1 sentence: the single most important focus for days 0–30>",
      "actions": ["<specific action>", "<specific action>", "<specific action>"],
      "metric": "<the one metric that proves this phase succeeded>"
    },
    {
      "phase": "31-60",
      "focus": "<1 sentence: focus for days 31–60, builds on phase 1>",
      "actions": ["<specific action>", "<specific action>", "<specific action>"],
      "metric": "<success metric for this phase>"
    },
    {
      "phase": "61-90",
      "focus": "<1 sentence: focus for days 61–90, scaling what works>",
      "actions": ["<specific action>", "<specific action>", "<specific action>"],
      "metric": "<success metric for this phase>"
    }
  ]
}

Rules:
- Headlines must be specific to this idea — no generic SaaS copy
- Email bodies must be plain text paragraphs — no markdown, no bullet lists, no HTML
- All 3 emails must feel like they come from the same founder voice: honest, direct, not salesy
- Pricing: if signals show enterprise buyers, price higher (>$99/mo); if indie hackers / solo founders, price lower ($9–$49/mo)
- Action plan: each phase builds on the previous; actions must be concrete and specific to this idea (not generic)
- Do NOT invent user counts, revenue numbers, or testimonials you don't have evidence for in the signals
- Write in English regardless of the idea language
- Do NOT include any text outside the JSON object`;
}
