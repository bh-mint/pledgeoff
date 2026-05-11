export const SEARCH_QUERIES_PROMPT_VERSION = 'v1';

export function buildSearchQueriesPrompt(ideaText: string): string {
  return `You are a market research assistant. Given a startup idea (title + description), generate targeted search queries to find real user discussions about the PROBLEM this idea solves.

IDEA:
${ideaText}

Generate exactly 2 search queries for GitHub and 2 for Reddit.

Rules:
- Read the FULL idea text (title AND description) to understand the domain and problem
- Use quoted phrases for specific multi-word concepts (e.g., "code review" "pull request")
- Focus on the PROBLEM and DOMAIN, not the solution or the product name
- GitHub: target developer pain points, feature requests, issues in the relevant technical domain
- Reddit: target communities where the target users discuss their problems
- Each query must be specific enough to return relevant results, not generic keywords

Respond with valid JSON only:
{
  "github": ["query1", "query2"],
  "reddit": ["query1", "query2"]
}`;
}
