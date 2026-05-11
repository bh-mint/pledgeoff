const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','is','are','was','were','be','been','being','have',
  'has','had','do','does','did','will','would','could','should','may',
  'might','that','this','these','those','it','its','i','my','your','our',
  'their','we','they','he','she','who','which','what','when','where','how',
  'not','no','so','if','then','than','into','up','out','about','also',
  'can','get','use','using','used','make','makes','made','new','want',
  'wants','need','needs','help','helps','based','via','per','vs',
  'category','saas','consumer','marketplace','hardware','service','other',
]);

/**
 * Extracts 5-6 search keywords from idea title + description.
 * Title words are prioritized; description fills remaining slots.
 * Stop words and single-char tokens are removed.
 */
export function extractSearchKeywords(ideaText: string): string {
  const [rawTitle = '', rawDesc = ''] = ideaText.split('\n\n');

  const tokenize = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const titleTokens = tokenize(rawTitle);
  const descTokens = tokenize(rawDesc);

  // Deduplicate: title first, then description words not already included
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const w of [...titleTokens, ...descTokens]) {
    if (!seen.has(w)) {
      seen.add(w);
      keywords.push(w);
    }
    if (keywords.length === 6) break;
  }

  return keywords.join(' ');
}
