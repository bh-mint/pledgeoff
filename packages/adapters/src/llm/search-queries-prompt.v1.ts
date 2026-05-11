export const SEARCH_QUERIES_PROMPT_VERSION = 'v1';

export function buildSearchQueriesPrompt(ideaText: string): string {
  return `You are a market research assistant. Given a startup idea (title + description), generate targeted search queries to find real user discussions about the PROBLEM this idea solves.

IDEA:
${ideaText}

Generate exactly 2 search queries for GitHub and 2 for Reddit.

Rules:
- Read the FULL idea text (title AND description) to understand the domain and problem
- Focus on the PROBLEM being solved and who experiences it, not the solution name
- GitHub queries: MUST end with "in:title" so terms appear in the issue/PR title (not buried in body)
  Use quoted phrases for key concepts. Example: "\"developer burnout\" remote in:title"
- Reddit queries: target specific communities where the target users discuss this pain point
  Use natural language. Example: "developer burnout remote work engineering team"
- Each query must be specific to the domain — avoid generic terms that match unrelated popular issues

Respond with valid JSON only:
{
  "github": ["query1 in:title", "query2 in:title"],
  "reddit": ["query1", "query2"]
}`;
}
