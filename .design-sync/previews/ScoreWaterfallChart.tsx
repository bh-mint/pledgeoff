import { ScoreWaterfallChart } from "@pledgeoff/web";

export const GoBreakdown = () => (
  <div style={{ width: 520 }}>
    <ScoreWaterfallChart
      score={79}
      dimensions={[
        { name: "Demand", weight: 0.4, score: 82 },
        { name: "Competition", weight: 0.25, score: 71 },
        { name: "Effort", weight: 0.2, score: 78 },
        { name: "Timing", weight: 0.15, score: 85 },
      ]}
    />
  </div>
);

export const WeakBreakdown = () => (
  <div style={{ width: 520 }}>
    <ScoreWaterfallChart
      score={31}
      dimensions={[
        { name: "Demand", weight: 0.4, score: 22 },
        { name: "Competition", weight: 0.25, score: 35 },
        { name: "Effort", weight: 0.2, score: 44 },
        { name: "Timing", weight: 0.15, score: 30 },
      ]}
    />
  </div>
);
