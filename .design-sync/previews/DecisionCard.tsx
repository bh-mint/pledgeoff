import { DecisionCard } from "@pledgeoff/web";

const dims = [
  { name: "Demand", weight: 0.4, score: 82 },
  { name: "Competition", weight: 0.25, score: 71 },
  { name: "Effort", weight: 0.2, score: 78 },
  { name: "Timing", weight: 0.15, score: 85 },
];

const base = {
  id: "6f9619ff-8b86-d011-b42d-00cf4fc964ff",
  ideaId: "b56363fb-8b86-d011-b42d-00cf4fc964aa",
  signalIds: [],
  createdAt: "2026-06-20T09:00:00.000Z",
};

export const GoVerdict = () => (
  <DecisionCard
    ideaId={base.ideaId}
    decision={{
      ...base,
      verdict: "GO",
      confidence: 0.84,
      score: 79,
      dimensions: dims,
      reasoning:
        "Strong, recent demand signals: founders repeatedly describe manual competitor tracking as painful, and existing tools are priced for enterprise. A focused, founder-priced wedge is viable.",
    }}
    categoryAvg={61}
  />
);

export const KillVerdict = () => (
  <DecisionCard
    ideaId={base.ideaId}
    decision={{
      ...base,
      verdict: "KILL",
      confidence: 0.77,
      score: 31,
      dimensions: [
        { name: "Demand", weight: 0.4, score: 22 },
        { name: "Competition", weight: 0.25, score: 35 },
        { name: "Effort", weight: 0.2, score: 44 },
        { name: "Timing", weight: 0.15, score: 30 },
      ],
      reasoning:
        "The market is saturated with free alternatives and the signals show users abandoning paid tools in this category. No credible differentiation surfaced.",
    }}
  />
);

export const PivotVerdict = () => (
  <DecisionCard
    ideaId={base.ideaId}
    decision={{
      ...base,
      verdict: "PIVOT",
      confidence: 0.69,
      score: 55,
      dimensions: [
        { name: "Demand", weight: 0.4, score: 58 },
        { name: "Competition", weight: 0.25, score: 40 },
        { name: "Effort", weight: 0.2, score: 66 },
        { name: "Timing", weight: 0.15, score: 52 },
      ],
      reasoning:
        "Demand exists but concentrates on a narrower segment than the original idea targets. Refocus on agencies managing multiple client accounts and re-validate.",
    }}
  />
);
