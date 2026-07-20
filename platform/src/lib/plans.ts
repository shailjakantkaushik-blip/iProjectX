export const PLAN_CATALOG = [
  {
    slug: "starter",
    name: "Starter",
    description: "For small PMO teams getting portfolio visibility.",
    monthlyPrice: 4900,
    annualPrice: 49000,
    seatLimit: 10,
    projectLimit: 25,
    isEnterprise: false,
    sortOrder: 1,
    features: [
      "Executive dashboard",
      "Projects & programs",
      "Risk & RAID tracking",
      "Demand pipeline",
      "Basic reporting",
      "Email support",
    ],
  },
  {
    slug: "professional",
    name: "Professional",
    description: "Full delivery control for growing enterprises.",
    monthlyPrice: 14900,
    annualPrice: 149000,
    seatLimit: 50,
    projectLimit: 200,
    isEnterprise: false,
    sortOrder: 2,
    features: [
      "Everything in Starter",
      "Stage-gate governance",
      "EVM financials & FY allocation",
      "Resource capacity planning",
      "Agile sprints & releases",
      "White-label branding",
      "Priority support",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale with SSO-ready white-label delivery.",
    monthlyPrice: 39900,
    annualPrice: 399000,
    seatLimit: 500,
    projectLimit: 5000,
    isEnterprise: true,
    sortOrder: 3,
    features: [
      "Everything in Professional",
      "Custom domain white-label",
      "Hide powered-by branding",
      "Advanced seat governance",
      "Dedicated success manager",
      "SSO / SAML ready hooks",
      "Audit-friendly exports",
    ],
  },
] as const;

export type PlanSlug = (typeof PLAN_CATALOG)[number]["slug"];

export function priceLabel(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}
