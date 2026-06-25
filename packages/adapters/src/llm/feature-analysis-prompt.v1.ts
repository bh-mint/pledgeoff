export const FEATURE_ANALYSIS_PROMPT_VERSION = 'feature-analysis-v1';

export function buildFeatureAnalysisPrompt(ideaText: string, competitorNames: string[]): string {
  const compList = competitorNames.map((n, i) => `${i + 1}. ${n}`).join('\n');
  return `You are a competitive analyst. Analyze the following idea and its competitors to create a feature comparison matrix.

IDEA:
${ideaText}

COMPETITORS:
${compList}

Generate a feature comparison table with 8-14 features that matter for this category.
For each feature, assess coverage: "yes" (fully covered), "partial" (limited/basic), or "no" (not present).
Group features into logical categories (e.g., "Core", "Analytics", "Integrations", "UX").
The "idea" column should reflect what the described idea intends to build.

Return ONLY valid JSON:
{
  "features": [
    {
      "feature": "Feature name",
      "category": "Category name",
      "competitors": {
        "CompetitorName1": "yes|partial|no",
        "CompetitorName2": "yes|partial|no"
      },
      "idea": "yes|partial|no"
    }
  ]
}`;
}
