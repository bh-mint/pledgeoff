import { RevenueAreaChart } from "@pledgeoff/web";

export const ThreeScenarios = () => (
  <div style={{ width: 520 }}>
    <RevenueAreaChart
      simulation={{
        id: "6f9619ff-8b86-d011-b42d-00cf4fc964ff",
        ideaId: "b56363fb-8b86-d011-b42d-00cf4fc964aa",
        userId: "aaaaaaaa-8b86-d011-b42d-00cf4fc964bb",
        tamLow: 120_000_000,
        tamHigh: 480_000_000,
        breakEvenMonths: 9,
        assumptions: [
          "Founder-led sales for the first 6 months",
          "3% monthly churn after month 6",
          "Pricing anchored at €49/mo",
        ],
        scenarios: [
          { name: "conservative", pricePerUser: 29, mrr6: 1200, mrr12: 4800, mrr24: 14500 },
          { name: "moderate", pricePerUser: 49, mrr6: 3400, mrr12: 12800, mrr24: 41000 },
          { name: "optimistic", pricePerUser: 79, mrr6: 7800, mrr12: 29500, mrr24: 96000 },
        ],
        createdAt: "2026-06-20T09:00:00.000Z",
      }}
    />
  </div>
);
