import type { Signal } from '@pledgeoff/core';

export const COMPETITOR_PROMPT_VERSION = 'competitor-v1';

export function buildCompetitorPrompt(ideaText: string, signals: Signal[]): string {
  const signalBlock = signals.length === 0
    ? 'No signals available. Use general market knowledge.'
    : signals.map((s, i) =>
        `[${i + 1}] ${s.source.toUpperCase()} | ${s.title}\n${s.summary ?? ''}`
      ).join('\n\n');

  return `You are a competitive intelligence analyst. Analyze the market signals below and identify existing competitors for the given idea.

<idea>
${ideaText}
</idea>

<signals>
${signalBlock}
</signals>

<instructions>
Identify up to 6 real competitors mentioned or implied by the signals. For each competitor:
- name: the product or company name
- url: website URL if mentioned or known (omit if unknown)
- positioning: 1-2 sentence description of their market position
- signals: 1-5 specific evidence strings from the signals above (direct quotes or paraphrases)

Then identify up to 4 gaps — things the competitors are NOT doing well that represent opportunities for the idea.

Return ONLY valid JSON. No markdown, no explanation.
</instructions>

<output_format>
{
  "competitors": [
    {
      "name": "string",
      "url": "string or omit",
      "positioning": "string",
      "signals": ["string", "string"]
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
