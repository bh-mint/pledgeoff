import { describe, it, expect } from 'vitest';
import type { Signal } from '@pledgeoff/core';
import { buildCustomerPrompt, CUSTOMER_PROMPT_VERSION } from '../customer-prompt.v1';
import { buildCompetitorPrompt, COMPETITOR_PROMPT_VERSION } from '../competitor-prompt.v1';

const ideaText = 'App to track daily habits and productivity metrics';

function makeSignal(source: Signal['source'], title = 'Some signal'): Signal {
  return {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    source,
    sentiment: 'neutral',
    url: `https://example.com/${source}`,
    title,
    summary: `Summary from ${source}`,
    fetchedAt: new Date().toISOString(),
  };
}

describe('buildCustomerPrompt (v2 — review enrichment)', () => {
  it('adds the review-priority block when review signals are present', () => {
    const prompt = buildCustomerPrompt(ideaText, [makeSignal('brave'), makeSignal('reviews')]);
    expect(prompt).toContain('REVIEW SIGNALS PRIORITY');
    expect(prompt).toContain('G2 and Capterra');
  });

  it('omits the review-priority block without review signals', () => {
    const prompt = buildCustomerPrompt(ideaText, [makeSignal('brave'), makeSignal('github')]);
    expect(prompt).not.toContain('REVIEW SIGNALS PRIORITY');
  });

  it('instructs quotes to carry the exact signal source value', () => {
    const prompt = buildCustomerPrompt(ideaText, [makeSignal('reviews')]);
    expect(prompt).toContain("the exact source value of the quoted signal");
  });

  it('bumped the prompt version to v2', () => {
    expect(CUSTOMER_PROMPT_VERSION).toBe('customerPrompt.v2');
  });
});

describe('buildCompetitorPrompt (v5 — direction signals)', () => {
  it('adds direction instructions when job signals are present', () => {
    const prompt = buildCompetitorPrompt(ideaText, [makeSignal('jobs')]);
    expect(prompt).toContain('<direction_signals_instructions>');
  });

  it('adds direction instructions when news signals are present', () => {
    const prompt = buildCompetitorPrompt(ideaText, [makeSignal('news')]);
    expect(prompt).toContain('<direction_signals_instructions>');
  });

  it('omits direction instructions without jobs or news signals', () => {
    const prompt = buildCompetitorPrompt(ideaText, [makeSignal('brave'), makeSignal('github')]);
    expect(prompt).not.toContain('<direction_signals_instructions>');
  });

  it('bumped the prompt version to v5', () => {
    expect(COMPETITOR_PROMPT_VERSION).toBe('competitor-v5');
  });
});
