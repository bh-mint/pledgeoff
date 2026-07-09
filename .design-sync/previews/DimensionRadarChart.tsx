import { DimensionRadarChart } from "@pledgeoff/web";

export const StrongGo = () => (
  <div style={{ width: 420 }}>
    <DimensionRadarChart
      verdict="GO"
      dimensions={[
        { name: "Demand", weight: 0.4, score: 82 },
        { name: "Competition", weight: 0.25, score: 71 },
        { name: "Effort", weight: 0.2, score: 78 },
        { name: "Timing", weight: 0.15, score: 85 },
      ]}
    />
  </div>
);

export const WeakPivot = () => (
  <div style={{ width: 420 }}>
    <DimensionRadarChart
      verdict="PIVOT"
      dimensions={[
        { name: "Demand", weight: 0.4, score: 58 },
        { name: "Competition", weight: 0.25, score: 40 },
        { name: "Effort", weight: 0.2, score: 66 },
        { name: "Timing", weight: 0.15, score: 52 },
      ]}
    />
  </div>
);
