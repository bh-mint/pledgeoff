import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Idea, Decision, Signal, Simulation } from '@pledgeoff/core';

const VERDICT_COLOR: Record<string, string> = {
  GO:    '#16a34a',
  PIVOT: '#d97706',
  KILL:  '#dc2626',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  brandName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#09090b',
  },
  meta: {
    fontSize: 8,
    color: '#71717a',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  ideaText: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#09090b',
    lineHeight: 1.4,
    marginBottom: 6,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  confidence: {
    fontSize: 9,
    color: '#52525b',
  },
  reasoning: {
    fontSize: 9,
    color: '#3f3f46',
    lineHeight: 1.6,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    marginBottom: 16,
  },
  signalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  sentimentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  signalTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#09090b',
    marginBottom: 2,
  },
  signalMeta: {
    fontSize: 7,
    color: '#71717a',
  },
  simSection: {
    flexDirection: 'row',
    gap: 12,
  },
  simCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    padding: 10,
  },
  simLabel: {
    fontSize: 7,
    color: '#71717a',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  simValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#09090b',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#a1a1aa',
  },
});

type Props = {
  idea: Idea;
  decision: Decision | null;
  signals: Signal[];
  simulation: Simulation | null;
  authorName: string;
  brandName?: string;
  generatedAt: string;
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#16a34a',
  negative: '#dc2626',
  neutral:  '#d97706',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function IdeaReportPDF({ idea, decision, signals, simulation, authorName, brandName, generatedAt }: Props) {
  const displayBrand = brandName ?? 'PledgeOFF';
  const topSignals = signals.slice(0, 8);

  return (
    <Document title={`Validation Report — ${idea.text.slice(0, 60)}`} author={authorName}>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>{displayBrand}</Text>
          <View>
            <Text style={styles.meta}>Validation Report</Text>
            <Text style={styles.meta}>{authorName}</Text>
            <Text style={styles.meta}>{formatDate(generatedAt)}</Text>
          </View>
        </View>

        {/* Idea */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Idea</Text>
          <Text style={styles.ideaText}>{idea.text}</Text>
          <Text style={[styles.meta, { textAlign: 'left' }]}>Submitted {formatDate(idea.createdAt)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Decision */}
        {decision && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verdict</Text>
            <View style={styles.verdictRow}>
              <View style={[styles.verdictBadge, { backgroundColor: VERDICT_COLOR[decision.verdict] ?? '#71717a' }]}>
                <Text>{decision.verdict}</Text>
              </View>
              <Text style={styles.confidence}>
                Confidence: {Math.round(decision.confidence * 100)}%
              </Text>
            </View>
            <Text style={styles.reasoning}>{decision.reasoning}</Text>
          </View>
        )}

        {/* Signals */}
        {topSignals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence ({signals.length} signals)</Text>
            {topSignals.map((s) => (
              <View key={s.id} style={styles.signalRow}>
                <View style={[styles.sentimentDot, { backgroundColor: SENTIMENT_COLOR[s.sentiment] ?? '#71717a' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.signalTitle}>{s.title}</Text>
                  {s.summary ? <Text style={styles.reasoning}>{s.summary}</Text> : null}
                  <Text style={styles.signalMeta}>{s.source.toUpperCase()} · {formatDate(s.fetchedAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Simulation */}
        {simulation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Simulation (12-month MRR)</Text>
            <View style={styles.simSection}>
              {simulation.scenarios.map((sc) => (
                <View key={sc.name} style={styles.simCard}>
                  <Text style={styles.simLabel}>{sc.name.toUpperCase()}</Text>
                  <Text style={styles.simValue}>{formatCurrency(sc.mrr12)}</Text>
                  <Text style={[styles.signalMeta, { marginTop: 2 }]}>€{sc.pricePerUser}/user</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{displayBrand} · Confidential</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
