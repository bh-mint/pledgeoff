export const PRICING = {
  founder: {
    monthly: { eur: 49, annual_equivalent: 39, annual_total: 468 },
    label: "Founder",
  },
  team: {
    monthly: { eur: 99, annual_equivalent: 79, annual_total: 948 },
    label: "Team",
  },
  studio: {
    monthly: { eur: 349, annual_equivalent: 279, annual_total: 3348 },
    label: "Studio",
  },
  enterprise: {
    monthly: { eur: 1199, annual_equivalent: 959, annual_total: 11508 },
    label: "Enterprise",
  },
} as const;
