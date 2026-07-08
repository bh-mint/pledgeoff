import { describe, it, expect } from 'vitest';
import { CustomerQuoteSchema } from '../customer-analysis';

describe('CustomerQuoteSchema', () => {
  it('accepts quotes from any signal source, including reviews and brave', () => {
    for (const source of ['reddit', 'github', 'hn', 'brave', 'reviews', 'news', 'jobs'] as const) {
      const result = CustomerQuoteSchema.safeParse({
        text: 'The export feature is broken half the time',
        source,
        url: 'https://example.com/review/1',
      });
      expect(result.success, `source '${source}' should be valid`).toBe(true);
    }
  });

  it('rejects a source outside the signal source enum', () => {
    const result = CustomerQuoteSchema.safeParse({
      text: 'Some quote',
      source: 'twitter',
      url: 'https://example.com/1',
    });
    expect(result.success).toBe(false);
  });
});
