import { db } from "./db";

export const DEFAULT_FEATURE_CARDS = [
  {
    title: "Executive cockpit",
    body: "Live RAG, funding burn, and portfolio health in one interactive command view.",
  },
  {
    title: "Stage-gate delivery",
    body: "Channel A/B governance, milestones, agile sprints, and release registers.",
  },
  {
    title: "Financial intelligence",
    body: "CAPEX/OPEX, EVM signals, FY allocation, and benefit realisation tracking.",
  },
  {
    title: "Enterprise controls",
    body: "Role-based access, seat-based subscriptions, and audit-friendly operations.",
  },
  {
    title: "White-label workspaces",
    body: "Brand colors, logos, taglines, and custom domains per enterprise customer.",
  },
  {
    title: "Team delivery fabric",
    body: "Resources, demand pipeline, decisions, actions, and program rollups.",
  },
];

const DEFAULT_SITE_CONFIG = {
  id: "default",
  brandName: "iProjectX",
  heroTitle: "The enterprise platform for portfolio, delivery, and outcomes.",
  heroSubtitle:
    "Move from spreadsheet PMO tooling to a multi-tenant SaaS workspace with subscription seats, interactive delivery intelligence, and full white-label branding.",
  heroCtaLabel: "Start 14-day trial",
  heroCtaHref: "/signup",
  secondaryCtaLabel: "View plans",
  secondaryCtaHref: "/pricing",
  primaryColor: "#0F766E",
  accentColor: "#0284C7",
  secondaryColor: "#134E4A",
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  supportEmail: null as string | null,
  footerText: "Enterprise project management & delivery",
  showPricing: true,
  showSignup: true,
  enableExcelImport: true,
  enablePptExport: true,
  enablePdfExport: true,
  featureCardsJson: JSON.stringify(DEFAULT_FEATURE_CARDS),
  updatedAt: new Date(),
};

export async function getSiteConfig() {
  try {
    let config = await db.siteConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await db.siteConfig.create({
        data: {
          id: "default",
          featureCardsJson: JSON.stringify(DEFAULT_FEATURE_CARDS),
        },
      });
    }
    let featureCards = DEFAULT_FEATURE_CARDS;
    try {
      const parsed = JSON.parse(config.featureCardsJson || "[]");
      if (Array.isArray(parsed) && parsed.length) featureCards = parsed;
    } catch {
      /* keep defaults */
    }
    return { ...config, featureCards };
  } catch {
    return { ...DEFAULT_SITE_CONFIG, featureCards: DEFAULT_FEATURE_CARDS };
  }
}
