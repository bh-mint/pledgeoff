export const INTERVIEW_GUIDE_PROMPT_VERSION = 'interview-guide-v1';

export function buildInterviewGuidePrompt(ideaText: string, icpSegments: string[]): string {
  const segmentBlock = icpSegments.length > 0
    ? `<icp_segments>\n${icpSegments.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n</icp_segments>`
    : '<icp_segments>Not yet analyzed — infer the most likely segment from the idea.</icp_segments>';

  return `You are an expert in customer development and primary research. Generate a structured interview guide for a founder to validate the idea below.

<idea>
${ideaText}
</idea>

${segmentBlock}

<instructions>
1. Identify the single most important segment to interview first (targetSegment).
2. Write exactly 8-10 interview questions that:
   - Start with open-ended questions about the problem (NOT the solution)
   - Progress from context → pain → behavior → alternatives → willingness to pay
   - Each question has a clear purpose (why you're asking it)
   - Include a follow-up for the most critical questions
3. Write 3-5 hypotheses the founder should be testing (things they believe but haven't proven).
4. Write 3-4 red flags — answers that would indicate this is NOT the right customer or problem.

Do NOT mention the product name or solution in questions 1-6. Ask about the problem space first.
</instructions>

Return ONLY valid JSON. No markdown, no explanation.

<output_format>
{
  "targetSegment": "string, specific segment to interview first (e.g. 'B2B SaaS founders at pre-seed stage')",
  "questions": [
    {
      "question": "string, the actual question to ask",
      "purpose": "string, why you ask this (what you learn from the answer)",
      "followUp": "string — ONLY include for the 2-3 most critical questions; OMIT this key entirely for others (do NOT set to null)"
    }
  ],
  "hypotheses": [
    "string, a specific belief to validate (e.g. 'Founders spend >4 hours/week on market research')"
  ],
  "redFlags": [
    "string, an answer or pattern that signals you should pivot (e.g. 'They validate ideas by asking friends')"
  ]
}
</output_format>`;
}
