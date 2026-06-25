export function buildBattlecardPrompt(ideaText: string, competitorNames: string[]): string {
  const competitorList = competitorNames.length > 0
    ? competitorNames.map((n, i) => `${i + 1}. ${n}`).join('\n')
    : '(no specific competitors identified — infer likely ones from the idea)';

  return `You are a competitive intelligence analyst. Generate a sales battlecard for the following product idea against its competitors.

IDEA:
${ideaText}

COMPETITORS TO COVER (up to 6):
${competitorList}

For each competitor, produce one battlecard entry with:
- objection: the most common objection a prospect raises when comparing to this competitor (1 sentence, max 200 chars)
- response: the ideal sales response to that objection (2–3 sentences, max 500 chars)
- ourAdvantages: 2–4 specific advantages our product has over this competitor (each max 150 chars)
- theirWeaknesses: 2–4 known weaknesses or gaps in this competitor (each max 150 chars)

Base your analysis on what is typical for each competitor's known product positioning.

Respond with valid JSON only, no markdown, no explanation:
{
  "entries": [
    {
      "competitorName": "string",
      "objection": "string",
      "response": "string",
      "ourAdvantages": ["string", ...],
      "theirWeaknesses": ["string", ...]
    }
  ]
}`;
}
