import type { Signal } from '@pledgeoff/core';

export const BUILD_PROMPT_VERSION = 'buildPrompt.v1' as const;
export const ANALYZE_BUILD_MAX_TOKENS = 4096;

export function buildBuildPrompt(ideaText: string, signals: Signal[]): string {
  const githubSignals = signals.filter((s) => s.source === 'github');
  const signalLines = signals
    .map((s, i) => `[${i + 1}] source:${s.source} url:${s.url}\ntitle: ${s.title}\nsummary: ${s.summary}`)
    .join('\n\n');

  return `You are a senior software architect. Analyze an idea and its engineering signals to recommend a concrete tech stack, key libraries, and technical gaps that represent product opportunities.

IDEA:
${ideaText}

SIGNALS (${signals.length} total, ${githubSignals.length} from GitHub):
${signalLines || 'No signals available.'}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "stack": [
    {
      "name": "<component name, e.g. 'Database', 'Frontend', 'Auth', max 40 chars>",
      "description": "<what this layer does in the system, max 50 words>",
      "decision": "<'build'|'buy'|'oss'>",
      "rationale": "<why this decision, max 40 words>",
      "libraries": [
        {
          "name": "<library/tool name>",
          "purpose": "<what it does in this stack, max 30 words>",
          "githubUrl": "<https://github.com/... if known, omit if not>",
          "stars": <approximate stars as integer if known, omit if not>
        }
      ]
    }
  ],
  "gaps": [
    {
      "title": "<gap title, max 15 words>",
      "description": "<what's missing or painful in current solutions, evidence from signals, max 50 words>",
      "opportunity": "<how your product can solve this gap, max 50 words>"
    }
  ]
}

Rules:
- stack: 3-6 components covering the essential layers (e.g. Frontend, Backend/API, Database, Auth, Infra, AI/ML if relevant)
- decision meanings: 'build' = custom code, 'buy' = paid SaaS, 'oss' = open-source library/framework
- libraries: 0-3 per component, only well-known libraries relevant to this idea
- gaps: 1-4 technical gaps found in signals (missing features, painful integrations, poor DX) that the product could solve
- If signals are sparse, base recommendations on the idea text and common patterns for this type of product
- Prefer battle-tested, widely adopted solutions for an MVP
- Include githubUrl only for real, verifiable repos you are confident about
- Write in English regardless of idea language
- Do NOT include any text outside the JSON object`;
}
