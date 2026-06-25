import type { Signal } from '@pledgeoff/core';

export const COMPETITOR_PROMPT_VERSION = 'competitor-v4';

export function buildCompetitorPrompt(ideaText: string, signals: Signal[]): string {
  const signalBlock = signals.length === 0
    ? 'No signals available.'
    : signals.map((s, i) =>
        `[${i + 1}] ${s.source.toUpperCase()} | ${s.title}\n${s.summary ?? ''}`
      ).join('\n\n');

  return `You are a competitive intelligence analyst. Your task has three phases.

<idea>
${ideaText}
</idea>

<signals>
${signalBlock}
</signals>

<enhanced_fields_instructions>
For EVERY competitor you include (all phases), populate these additional fields when you have reasonable confidence:
- "estimatedPrice": pricing model + representative price (e.g. "Free + $29/mo Pro", "$49/mo", "Enterprise only", "Freemium"). Omit if completely unknown.
- "targetSegment": primary target customer description (e.g. "SMB product teams", "Enterprise marketing ops", "Indie hackers and solopreneurs"). Omit if unclear.
- "strengths": 2–4 strings describing what this competitor does well (e.g. "Large integration ecosystem", "Established brand trust"). Only include factual strengths you're confident about.
- "weaknesses": 2–4 strings describing where this competitor falls short (e.g. "No API access on free plan", "Steep learning curve", "No mobile app"). Only include weaknesses you're confident about.
Do NOT fabricate. If unsure, omit the field entirely.
</enhanced_fields_instructions>

<phase0_instructions>
FIRST: scan the <idea> text above for any competitor names mentioned explicitly (e.g. "Unlike X", "compared to Y", "similar to Z", product names cited by the founder).
For each explicitly named competitor found in the idea text:
- Include them with "source": "knowledge"
- "signals" must contain 1-3 factual strings from your training knowledge about that product
- Do NOT fabricate facts — only include what you are confident is true
These are MANDATORY — do not skip competitors the founder explicitly named.
</phase0_instructions>

<phase1_instructions>
Next: identify up to 3 real competitors EXPLICITLY MENTIONED OR STRONGLY IMPLIED by the signals above that are NOT already included from phase 0.
For each, extract 1-4 evidence strings directly from the signal text.
Set "source": "signal" on every entry in this phase.
</phase1_instructions>

<phase2_instructions>
Finally: add up to 2 ADDITIONAL well-known direct competitors NOT already included from phase 0 or phase 1.
Rules:
- Only include products you are highly confident exist and compete directly with this idea.
- Do NOT invent products. If uncertain, omit.
- "signals" must contain 1-3 factual strings from your training knowledge. Do not fabricate metrics.
- Set "source": "knowledge" on every entry.
- Prefer established, well-known tools over niche ones.
</phase2_instructions>

<gaps_instructions>
After both phases, identify up to 4 gaps — things ALL competitors fail to do well, that represent clear opportunities for the idea above.
Base gaps on signal evidence and competitor weaknesses from both phases.
</gaps_instructions>

Return ONLY valid JSON. No markdown, no explanation, no code fences.

<output_format>
{
  "competitors": [
    {
      "name": "string",
      "url": "string or omit if unknown",
      "positioning": "string, 1-2 sentences",
      "estimatedPrice": "string or omit",
      "targetSegment": "string or omit",
      "strengths": ["string", "string"],
      "weaknesses": ["string", "string"],
      "signals": ["string", "string"],
      "source": "signal"
    },
    {
      "name": "string",
      "url": "string",
      "positioning": "string, 1-2 sentences",
      "estimatedPrice": "string or omit",
      "targetSegment": "string or omit",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "signals": ["factual string from training knowledge"],
      "source": "knowledge"
    }
  ],
  "gaps": [
    {
      "title": "string",
      "description": "string",
      "opportunity": "string"
    }
  ]
}
</output_format>`;
}
