import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Idea } from '@pledgeoff/core';
import type { DecisionTimeline } from '@pledgeoff/core';

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
    marginBottom: 28,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  brandName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#09090b' },
  meta: { fontSize: 7.5, color: '#71717a', textAlign: 'right' },
  ideaBox: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 4,
  },
  ideaLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  ideaText: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#09090b', lineHeight: 1.4 },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  entry: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  verdictBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    color: '#ffffff',
  },
  entryDate: { fontSize: 7.5, color: '#71717a' },
  deltaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
    backgroundColor: '#fafafa',
    padding: 6,
    borderRadius: 3,
  },
  deltaLabel: { fontSize: 7.5, color: '#71717a' },
  deltaValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#09090b' },
  reasoning: { fontSize: 8, color: '#3f3f46', lineHeight: 1.55 },
  feedbackRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  feedbackItem: { fontSize: 7.5, color: '#71717a' },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: '#a1a1aa' },
});

interface Props {
  idea: Idea;
  timeline: DecisionTimeline;
  generatedAt: string;
}

export function AuditTrailPDF({ idea, timeline, generatedAt }: Props) {
  const ideaTitle = idea.text.split('\n\n')[0]?.trim() ?? idea.text;
  const generatedDate = new Date(generatedAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <Document title={`Decision Audit Trail — ${ideaTitle.slice(0, 50)}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brandName}>PledgeOFF</Text>
          <View>
            <Text style={styles.meta}>Decision Audit Trail</Text>
            <Text style={styles.meta}>Generated {generatedDate}</Text>
          </View>
        </View>

        {/* Idea */}
        <View style={styles.ideaBox}>
          <Text style={styles.ideaLabel}>Idea</Text>
          <Text style={styles.ideaText}>{ideaTitle}</Text>
        </View>

        {/* Summary row */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          <View>
            <Text style={styles.ideaLabel}>Total decisions</Text>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#09090b' }}>
              {timeline.entries.length}
            </Text>
          </View>
          {timeline.entries.length > 0 && (
            <View>
              <Text style={styles.ideaLabel}>Latest verdict</Text>
              <Text style={{
                fontSize: 18,
                fontFamily: 'Helvetica-Bold',
                color: VERDICT_COLOR[timeline.entries[timeline.entries.length - 1]!.decision.verdict] ?? '#09090b',
              }}>
                {timeline.entries[timeline.entries.length - 1]!.decision.verdict}
              </Text>
            </View>
          )}
        </View>

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Decision history</Text>

        {timeline.entries.length === 0 && (
          <Text style={{ fontSize: 8, color: '#71717a' }}>No decisions recorded yet.</Text>
        )}

        {[...timeline.entries].reverse().map((entry, i) => (
          <View key={entry.decision.id} style={i < timeline.entries.length - 1 ? styles.entry : { marginBottom: 0 }}>
            <View style={styles.entryHeader}>
              <Text style={[styles.verdictBadge, { backgroundColor: VERDICT_COLOR[entry.decision.verdict] ?? '#71717a' }]}>
                {entry.decision.verdict}
              </Text>
              {entry.decision.score != null && (
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#09090b' }}>
                  {entry.decision.score}/100
                </Text>
              )}
              <Text style={styles.entryDate}>
                {new Date(entry.decision.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
              <Text style={{ fontSize: 7.5, color: '#a1a1aa' }}>
                confidence {Math.round(entry.decision.confidence * 100)}%
              </Text>
            </View>

            {/* Delta from previous */}
            {entry.delta && entry.delta.verdictChanged && (
              <View style={styles.deltaRow}>
                <Text style={styles.deltaLabel}>Changed from</Text>
                <Text style={[styles.deltaValue, { color: VERDICT_COLOR[entry.delta.previousVerdict] ?? '#09090b' }]}>
                  {entry.delta.previousVerdict}
                </Text>
                {entry.delta.scoreDelta != null && (
                  <>
                    <Text style={styles.deltaLabel}>Score delta</Text>
                    <Text style={[styles.deltaValue, { color: entry.delta.scoreDelta >= 0 ? '#16a34a' : '#dc2626' }]}>
                      {entry.delta.scoreDelta >= 0 ? '+' : ''}{entry.delta.scoreDelta}
                    </Text>
                  </>
                )}
              </View>
            )}

            <Text style={styles.reasoning}>
              {entry.decision.reasoning.length > 400
                ? entry.decision.reasoning.slice(0, 400) + '…'
                : entry.decision.reasoning}
            </Text>

            {(entry.feedbackCounts.thumbsUp > 0 || entry.feedbackCounts.thumbsDown > 0) && (
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackItem}>👍 {entry.feedbackCounts.thumbsUp}</Text>
                <Text style={styles.feedbackItem}>👎 {entry.feedbackCounts.thumbsDown}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Confidential · Generated by PledgeOFF</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
