import type { CompetitorAnalysis, Competitor } from './competitor-analysis';
import type { MarketLandscape } from './market-landscape';

export type SnapshotDiff = {
  readonly field: string;
  readonly before: string;
  readonly after: string;
  readonly significance: 'major' | 'minor';
};

export function diffCompetitors(before: CompetitorAnalysis, after: CompetitorAnalysis): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];

  const beforeNames = new Set(before.competitors.map((c) => c.name));
  const afterNames = new Set(after.competitors.map((c) => c.name));

  for (const name of afterNames) {
    if (!beforeNames.has(name)) {
      diffs.push({ field: `competitor.${name}`, before: '(absent)', after: name, significance: 'major' });
    }
  }

  for (const name of beforeNames) {
    if (!afterNames.has(name)) {
      diffs.push({ field: `competitor.${name}`, before: name, after: '(removed)', significance: 'major' });
    }
  }

  const afterMap = new Map<string, Competitor>(after.competitors.map((c) => [c.name, c]));
  for (const bc of before.competitors) {
    const ac = afterMap.get(bc.name);
    if (!ac) continue;

    if (bc.positioning !== ac.positioning) {
      diffs.push({ field: `${bc.name}.positioning`, before: bc.positioning, after: ac.positioning, significance: 'minor' });
    }
    if ((bc.estimatedPrice ?? '') !== (ac.estimatedPrice ?? '')) {
      diffs.push({
        field: `${bc.name}.price`,
        before: bc.estimatedPrice ?? '(unknown)',
        after: ac.estimatedPrice ?? '(unknown)',
        significance: 'major',
      });
    }
    if ((bc.targetSegment ?? '') !== (ac.targetSegment ?? '')) {
      diffs.push({
        field: `${bc.name}.segment`,
        before: bc.targetSegment ?? '(unknown)',
        after: ac.targetSegment ?? '(unknown)',
        significance: 'major',
      });
    }
  }

  const beforeGapTitles = new Set(before.gaps.map((g) => g.title));
  const afterGapTitles = new Set(after.gaps.map((g) => g.title));
  for (const title of afterGapTitles) {
    if (!beforeGapTitles.has(title)) {
      diffs.push({ field: 'gap.new', before: '(absent)', after: title, significance: 'minor' });
    }
  }
  for (const title of beforeGapTitles) {
    if (!afterGapTitles.has(title)) {
      diffs.push({ field: 'gap.removed', before: title, after: '(gone)', significance: 'minor' });
    }
  }

  return diffs;
}

export function diffMarketLandscape(before: MarketLandscape, after: MarketLandscape): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];

  const beforeSegs = new Map(before.segments.map((s) => [s.name, s.situation]));
  const afterSegs = new Map(after.segments.map((s) => [s.name, s.situation]));

  for (const [name, situation] of afterSegs) {
    if (!beforeSegs.has(name)) {
      diffs.push({ field: `segment.${name}`, before: '(absent)', after: situation, significance: 'major' });
    } else if (beforeSegs.get(name) !== situation) {
      diffs.push({ field: `segment.${name}.situation`, before: beforeSegs.get(name)!, after: situation, significance: 'major' });
    }
  }

  for (const name of beforeSegs.keys()) {
    if (!afterSegs.has(name)) {
      diffs.push({ field: `segment.${name}`, before: 'present', after: '(removed)', significance: 'major' });
    }
  }

  const beforeTrends = new Set(before.trends);
  for (const t of after.trends) {
    if (!beforeTrends.has(t)) {
      diffs.push({ field: 'trend.new', before: '(absent)', after: t, significance: 'minor' });
    }
  }

  const beforeOpp = new Set(before.uncoveredOpportunities);
  for (const o of after.uncoveredOpportunities) {
    if (!beforeOpp.has(o)) {
      diffs.push({ field: 'opportunity.new', before: '(absent)', after: o, significance: 'minor' });
    }
  }

  return diffs;
}
