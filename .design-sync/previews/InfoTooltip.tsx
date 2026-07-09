import { InfoTooltip } from "@pledgeoff/web";

const label: React.CSSProperties = {
  fontFamily: "var(--font-chivo-mono), monospace",
  fontSize: 11,
  color: "var(--dim)",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

export const OnMetricLabel = () => (
  <div style={{ padding: 24 }}>
    <span style={label}>
      Win Rate
      <InfoTooltip content="Share of reported outcomes where the verdict held. Needs at least 3 outcomes.">
        <span style={{ cursor: "help", color: "var(--faint)" }}>?</span>
      </InfoTooltip>
    </span>
  </div>
);

export const AlignedLeft = () => (
  <div style={{ padding: 24 }}>
    <span style={label}>
      Confidence
      <InfoTooltip align="left" content="Model confidence in the verdict, from signal strength and coverage.">
        <span style={{ cursor: "help", color: "var(--faint)" }}>?</span>
      </InfoTooltip>
    </span>
  </div>
);
