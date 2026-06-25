export const TRANSCRIPT_PROMPT_VERSION = 'transcript-v1';

export function buildTranscriptPrompt(ideaText: string, transcript: string, hypotheses: string[]): string {
  const hypothesesBlock = hypotheses.length > 0
    ? `<hypotheses_to_validate>\n${hypotheses.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n</hypotheses_to_validate>`
    : '<hypotheses_to_validate>No prior hypotheses — identify what the transcript reveals.</hypotheses_to_validate>';

  const truncated = transcript.length > 8000 ? transcript.slice(0, 8000) + '\n[transcript truncated]' : transcript;

  return `You are an expert in qualitative research analysis. Analyze the interview transcript below for a founder validating the idea described.

<idea>
${ideaText}
</idea>

${hypothesesBlock}

<transcript>
${truncated}
</transcript>

<instructions>
Analyze the transcript and produce:
1. confirmedHypotheses — hypotheses from the list above that this interview supports (quote evidence if possible)
2. rejectedHypotheses — hypotheses that this interview contradicts or weakens
3. newInsights — important findings NOT in the hypotheses list that emerged from this conversation
4. quotes — 3-6 direct quotes that are most revealing (verbatim or paraphrased, labeled with sentiment and theme)
5. signalStrength — overall assessment:
   - "strong": clear problem evidence, high willingness to pay, specific pain
   - "moderate": some evidence but mixed signals or vague responses
   - "weak": no clear problem, solution-first framing, or interview was too shallow

Be specific. Do not generalize. Base everything strictly on what was said.
</instructions>

Return ONLY valid JSON. No markdown, no explanation.

<output_format>
{
  "confirmedHypotheses": ["string"],
  "rejectedHypotheses": ["string"],
  "newInsights": ["string"],
  "quotes": [
    {
      "text": "string, direct quote or close paraphrase",
      "sentiment": "positive|negative|neutral",
      "theme": "string, e.g. 'pain intensity' or 'workaround behavior'"
    }
  ],
  "signalStrength": "strong|moderate|weak"
}
</output_format>`;
}
