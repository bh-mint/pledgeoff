import type { Signal } from '@pledgeoff/core';

export const COMPETITOR_PROMPT_VERSION = 'competitor-v2';

export function buildCompetitorPrompt(ideaText: string, signals: Signal[]): string {
  const signalBlock = signals.length === 0
    ? 'No signals available.'
    : signals.map((s, i) =>
        `[${i + 1}] ${s.source.toUpperCase()} | ${s.title}\n${s.summary ?? ''}`
      ).join('\n\n');

  return `You are a competitive intelligence analyst. Your task has two phases.

<idea>
${ideaText}
</idea>

<signals>
${signalBlock}
</signals>

<phase1_instructions>
Identify up to 5 real competitors EXPLICITLY MENTIONED OR STRONGLY IMPLIED by the signals above.
For each, extract 1-4 evidence strings directly from the signal text.
Set "source": "signal" on every entry in this phase.
</phase1_instructions>

<phase2_instructions>
After phase 1, add up to 3 ADDITIONAL well-known direct competitors that were NOT found in the signals above.
Rules for phase 2:
- Only include products you are highly confident exist and compete directly with this idea.
- Do NOT invent products. If uncertain, omit.
- "signals" must contain 1-3 factual strings about the product from your training knowledge (e.g. "Used by 50k+ teams", "Raised $10M Series A"). Do not fabricate metrics — use only what you are confident is true.
- Set "source": "knowledge" on every entry in this phase.
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
      "signals": ["string", "string"],
      "source": "signal"
    },
    {
      "name": "string",
      "url": "string",
      "positioning": "string, 1-2 sentences",
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
