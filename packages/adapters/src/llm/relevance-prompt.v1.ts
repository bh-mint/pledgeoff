export const RELEVANCE_PROMPT_VERSION = '1.0.0';

export function buildRelevancePrompt(
  ideaText: string,
  signals: ReadonlyArray<{ readonly id: string; readonly title: string; readonly summary: string }>,
): string {
  const signalList = signals
    .map((s, i) => `${i + 1}. [id:${s.id}] Title: "${s.title}"\n   Summary: "${s.summary.slice(0, 300)}"`)
    .join('\n\n');

  return `You are evaluating web signals for relevance to a startup idea being validated.

IDEA:
${ideaText.slice(0, 800)}

SIGNALS:
${signalList}

Score each signal 0-100 for relevance to this specific idea:
- 80-100: Directly addresses the idea's market, problem, or competitive landscape
- 50-79: Same domain or audience, tangentially useful
- 20-49: Loosely related topic
- 0-19: Unrelated

Respond with JSON only, no explanation:
{"scores": [{"id": "<signal_id>", "score": <0-100>}, ...]}`;
}
