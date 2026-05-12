export const SEARCH_QUERIES_PROMPT_VERSION = 'v4';

export function buildSearchQueriesPrompt(ideaText: string): string {
  return `You are a market research assistant. Given a startup idea (title + description), generate targeted search queries to find real user discussions and articles related to the PROBLEM this idea solves.

IDEA:
${ideaText}

Generate exactly 2 search queries for Dev.to/Hacker News and 2 for Google (searching Reddit discussions).

Rules:
- Read the FULL idea text (title AND description) to understand the domain and problem
- Focus on the PROBLEM being solved, not the solution name or brand
- Dev.to queries: short keyword phrases to find similar tools, articles, SaaS products
  Think: category + use case. Example: "meeting summarizer async teams"
- Google/Reddit queries: natural language phrases that target users would search to discuss this pain
  Example: "async meeting notes remote team productivity"
- Each query must be specific to the domain — avoid generic terms
- Do NOT include invented product names or brand names

Respond with valid JSON only:
{
  "devto": ["query1", "query2"],
  "google": ["query1", "query2"]
}`;
}
