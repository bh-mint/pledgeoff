import { describe, it, expect } from 'vitest';
import type { Signal, CompetitorMarketData } from '@pledgeoff/core';
import { buildCustomerPrompt, CUSTOMER_PROMPT_VERSION } from '../customer-prompt.v1';
import { buildCompetitorPrompt, COMPETITOR_PROMPT_VERSION } from '../competitor-prompt.v1';
import { buildSimulationPrompt, SIMULATION_PROMPT_VERSION } from '../simulation-prompt.v1';

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

describe('buildSimulationPrompt (v2 — verified market data)', () => {
  const notion: CompetitorMarketData = {
    name: 'Notion',
    fundingTotalUsd: 343_000_000,
    numEmployeesRange: '501–1000',
    foundedYear: 2013,
    lastFundingType: 'series_c',
    lastFundingAt: '2021-10-08',
  };

  it('adds the verified market data block with formatted funding line', () => {
    const prompt = buildSimulationPrompt(ideaText, 'GO', [makeSignal('brave')], [notion]);
    expect(prompt).toContain('VERIFIED MARKET DATA (Crunchbase');
    expect(prompt).toContain('Notion: total funding $343M · last round series c (2021) · 501–1000 employees · founded 2013');
    expect(prompt).toContain('cite at least one datapoint explicitly in assumptions');
  });

  it('omits the block when no market data is provided', () => {
    const prompt = buildSimulationPrompt(ideaText, 'GO', [makeSignal('brave')]);
    expect(prompt).not.toContain('VERIFIED MARKET DATA');
  });

  it('describes an org with no public metrics without inventing numbers', () => {
    const bare: CompetitorMarketData = {
      name: 'TinyStartup', fundingTotalUsd: null, numEmployeesRange: null,
      foundedYear: null, lastFundingType: null, lastFundingAt: null,
    };
    const prompt = buildSimulationPrompt(ideaText, 'GO', [], [bare]);
    expect(prompt).toContain('TinyStartup: listed on Crunchbase, no public metrics');
  });

  it('bumped the prompt version to v2', () => {
    expect(SIMULATION_PROMPT_VERSION).toBe('simulationPrompt.v2');
  });
});
