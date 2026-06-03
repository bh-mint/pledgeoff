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
  seats: {
    extraEurPerMonth: 20,
  },
  otto: {
    packs: [
      { count: 10, eur: 15 },
      { count: 25, eur: 30 },
      { count: 60, eur: 60 },
      { count: 150, eur: 120 },
    ] as const,
  },
  validationPacks: {
    packs: [
      { count: 10, eur: 19, label: "Starter" },
      { count: 25, eur: 42, label: "Builder" },
      { count: 60, eur: 85, label: "Sprint" },
    ] as const,
  },
} as const;
