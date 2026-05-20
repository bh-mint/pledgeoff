export const PRICING = {
  pro: {
    monthly: { eur: 149, annual_equivalent: 119, annual_total: 1428 },
    label: "Pro",
  },
  pro_plus: {
    monthly: { eur: 249, annual_equivalent: 199, annual_total: 2388 },
    label: "Pro+",
  },
  agency: {
    monthly: { eur: 499, annual_equivalent: 399, annual_total: 4788 },
    label: "Agency",
  },
} as const;
