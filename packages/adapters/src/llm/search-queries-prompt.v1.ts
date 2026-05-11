export const SEARCH_QUERIES_PROMPT_VERSION = 'v2';

export function buildSearchQueriesPrompt(ideaText: string): string {
  return `You are a market research assistant. Given a startup idea (title + description), generate targeted search queries to find real user discussions about the PROBLEM this idea solves.

IDEA:
${ideaText}

Generate exactly 2 search queries for Hacker News and 2 for Reddit.

Rules:
- Read the FULL idea text (title AND description) to understand the domain and problem
- Focus on the PROBLEM being solved and who experiences it, not the solution name
- Hacker News queries: natural language phrases that founders, developers, and PMs would discuss
  Think: "Ask HN" pain points, tool comparisons, workflow problems in the space
  Example: "developer burnout remote team management"
- Reddit queries: target specific communities where the target users discuss this pain point
  Use natural language. Example: "burnout detection remote engineering teams"
- Each query must be specific to the domain — avoid generic terms that match unrelated content
- Do NOT include the product name or invented brand names

Respond with valid JSON only:
{
  "hn": ["query1", "query2"],
  "reddit": ["query1", "query2"]
}`;
}
