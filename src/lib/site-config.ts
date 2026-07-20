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

export async function getSiteConfig() {
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
}
