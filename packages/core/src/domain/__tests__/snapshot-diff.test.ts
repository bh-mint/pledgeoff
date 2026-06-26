import { describe, it, expect } from 'vitest';
import { diffCompetitors, diffMarketLandscape } from '../snapshot-diff';
import type { CompetitorAnalysis } from '../competitor-analysis';
import type { MarketLandscape } from '../market-landscape';

function makeAnalysis(overrides: Partial<CompetitorAnalysis> = {}): CompetitorAnalysis {
  return {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    competitors: [
      { name: 'Acme', positioning: 'Enterprise CRM', signals: ['reddit mention'], estimatedPrice: '$99/mo', targetSegment: 'SMB' },
    ],
    gaps: [{ title: 'Mobile app', description: 'No mobile', opportunity: 'Build mobile first' }],
    signalCount: 3,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeLandscape(overrides: Partial<MarketLandscape> = {}): MarketLandscape {
  return {
    id: crypto.randomUUID(),
    ideaId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    segments: [{ name: 'Enterprise', situation: 'competitive', description: 'Crowded' }],
    trends: ['AI adoption rising'],
    uncoveredOpportunities: ['SMB self-serve'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('diffCompetitors', () => {
  it('returns empty array when nothing changed', () => {
    const a = makeAnalysis();
    const b = makeAnalysis({ ...a, id: crypto.randomUUID() });
    expect(diffCompetitors(a, b)).toHaveLength(0);
  });

  it('detects new competitor as major change', () => {
    const before = makeAnalysis();
    const after = makeAnalysis({
      competitors: [...before.competitors, { name: 'Rival', positioning: 'AI-first', signals: ['hn post'] }],
    });
    const diffs = diffCompetitors(before, after);
    expect(diffs.some((d) => d.field === 'competitor.Rival' && d.significance === 'major')).toBe(true);
  });

  it('detects removed competitor as major change', () => {
    const before = makeAnalysis();
    const after = makeAnalysis({ competitors: [] });
    const diffs = diffCompetitors(before, after);
    expect(diffs.some((d) => d.after === '(removed)' && d.significance === 'major')).toBe(true);
  });

  it('detects price change as major change', () => {
    const before = makeAnalysis();
    const after = makeAnalysis({
      competitors: [{ ...before.competitors[0]!, estimatedPrice: '$149/mo' }],
    });
    const diffs = diffCompetitors(before, after);
    expect(diffs.some((d) => d.field === 'Acme.price' && d.significance === 'major')).toBe(true);
    expect(diffs.find((d) => d.field === 'Acme.price')?.before).toBe('$99/mo');
    expect(diffs.find((d) => d.field === 'Acme.price')?.after).toBe('$149/mo');
  });

  it('detects positioning change as minor change', () => {
    const before = makeAnalysis();
    const after = makeAnalysis({
      competitors: [{ ...before.competitors[0]!, positioning: 'SMB-focused CRM' }],
    });
    const diffs = diffCompetitors(before, after);
    expect(diffs.some((d) => d.field === 'Acme.positioning' && d.significance === 'minor')).toBe(true);
  });
});

describe('diffMarketLandscape', () => {
  it('returns empty array when nothing changed', () => {
    const a = makeLandscape();
    const b = makeLandscape({ ...a, id: crypto.randomUUID() });
    expect(diffMarketLandscape(a, b)).toHaveLength(0);
  });

  it('detects new segment as major change', () => {
    const before = makeLandscape();
    const after = makeLandscape({
      segments: [...before.segments, { name: 'Mid-market', situation: 'growing', description: 'Emerging' }],
    });
    const diffs = diffMarketLandscape(before, after);
    expect(diffs.some((d) => d.field === 'segment.Mid-market' && d.significance === 'major')).toBe(true);
  });

  it('detects situation change as major change', () => {
    const before = makeLandscape();
    const after = makeLandscape({
      segments: [{ ...before.segments[0]!, situation: 'opportunity' }],
    });
    const diffs = diffMarketLandscape(before, after);
    expect(diffs.some((d) => d.field === 'segment.Enterprise.situation' && d.significance === 'major')).toBe(true);
  });

  it('detects new trend as minor change', () => {
    const before = makeLandscape();
    const after = makeLandscape({ trends: [...before.trends, 'No-code movement'] });
    const diffs = diffMarketLandscape(before, after);
    expect(diffs.some((d) => d.field === 'trend.new' && d.after === 'No-code movement')).toBe(true);
  });
});
