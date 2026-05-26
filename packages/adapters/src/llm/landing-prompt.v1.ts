import type { Signal } from '@pledgeoff/core';

export const LANDING_PROMPT_VERSION = 'landingPrompt.v1' as const;

export function buildLandingPrompt(ideaText: string, reasoning: string, signals: Signal[] = []): string {
  const signalContext = signals.length > 0
    ? `\n\nMARKET SIGNALS (top ${signals.length} — use the language and pain points from these in your copy):\n${signals.map((s, i) => `[${i + 1}] "${s.title}" — ${s.summary.slice(0, 150)}`).join('\n')}`
    : '';

  return `You are a conversion copywriter specializing in SaaS landing pages. Generate landing page copy for a validated startup idea.

IDEA:
${ideaText}

VALIDATION REASONING:
${reasoning}${signalContext}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "headline": "<max 10 words, outcome-focused, no filler words>",
  "subheadline": "<max 25 words, clarifies HOW and WHO, includes the core mechanism>",
  "features": [
    "<benefit-first feature, max 8 words>",
    "<benefit-first feature, max 8 words>",
    "<benefit-first feature, max 8 words>"
  ],
  "ctaText": "<max 5 words, action verb + outcome, no 'click here'>",
  "waitlistHeadline": "<max 15 words, social proof angle, include a number if possible>"
}

Rules:
- headline: no buzzwords (revolutionary, game-changing, ultimate), focus on the specific outcome
- subheadline: must mention the primary mechanism (how it works), not just what it does
- features: exactly 3, each starts with a verb or benefit noun, no generic phrases like "easy to use"
- ctaText: must create urgency or imply immediate value (e.g. "Validate free →", "Get verdict now")
- waitlistHeadline: aimed at people who aren't ready to sign up yet — gives them a reason to join the list. Do NOT invent user/customer counts (e.g. "400+", "1,000+ founders", "10k users") — no made-up social proof numbers
- Write in English regardless of the idea language
- Do NOT include any text outside the JSON object`;
}
