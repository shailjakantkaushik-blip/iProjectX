import { Card, PageHeader, Badge } from "@/components/ui";
import {
  LayoutDashboard,
  FolderKanban,
  Workflow,
  CircleDollarSign,
  ShieldAlert,
  CreditCard,
  Palette,
  Users2,
} from "lucide-react";

const MODULES = [
  {
    hub: "HOME",
    icon: LayoutDashboard,
    color: "#0f766e",
    pages: [
      {
        name: "Executive Cockpit",
        href: "/app",
        desc: "Portfolio KPI dashboard: RAG distribution, spend vs forecast, benefit realisation, velocity sparklines. Mirrors the Streamlit Home tab.",
      },
      {
        name: "Latest Updates",
        href: "/app/updates",
        desc: "News-feed of project updates with category and impact tags. Supports markdown body text. Mirrors Streamlit Latest Updates.",
      },
      {
        name: "About This App",
        href: "/app/about",
        desc: "Module guide (this page) covering all PMO hubs and SaaS-only extras.",
      },
    ],
  },
  {
    hub: "PORTFOLIO",
    icon: FolderKanban,
    color: "#0284c7",
    pages: [
      {
        name: "Projects",
        href: "/app/projects",
        desc: "Full project register with inline editing, RAG badges, milestones, and financials. Mirrors Streamlit Portfolio.",
      },
      {
        name: "Programs",
        href: "/app/programs",
        desc: "Program-level aggregation of budget, forecast, and project count.",
      },
      {
        name: "Segmentation",
        href: "/app/segmentation",
        desc: "Portfolio segmentation by category, theme, BU, and funding type — bubble charts + tables. Streamlit Segmentation parity.",
      },
      {
        name: "Prioritisation",
        href: "/app/prioritisation",
        desc: "Weighted priority scoring (strategic alignment, benefit value, risk, compliance, complexity). Streamlit Prioritisation parity.",
      },
      {
        name: "Portfolio Movements",
        href: "/app/movements",
        desc: "Audit log of portfolio category reclassifications. Reclassify projects with from/to and reason. Streamlit Movements parity.",
      },
      {
        name: "Demand Pipeline",
        href: "/app/pipeline",
        desc: "Pre-approval pipeline funnel with scoring. Streamlit Pipeline parity.",
      },
    ],
  },
  {
    hub: "DELIVERY",
    icon: Workflow,
    color: "#7c3aed",
    pages: [
      {
        name: "Timeline",
        href: "/app/timeline",
        desc: "Interactive Gantt chart with group-by: category, theme, BU, program, RAG, priority. Streamlit Timeline parity.",
      },
      {
        name: "Roadmap × Governance",
        href: "/app/delivery",
        desc: "Stage-gate roadmap heat-map cross-referenced with governance channels.",
      },
      {
        name: "Stage Gates",
        href: "/app/stage-gates",
        desc: "Gate-by-gate status, planned vs actual dates, checklist %, and outcome logging.",
      },
      {
        name: "Agile / Sprints",
        href: "/app/agile",
        desc: "Sprint velocity bar chart (committed vs completed points), sprint table, and release register.",
      },
      {
        name: "Governance Channels",
        href: "/app/channels",
        desc: "Governance channel routing logic and project-channel mapping.",
      },
      {
        name: "Dependencies",
        href: "/app/dependencies",
        desc: "Cross-project dependency topology: Gantt-ordered view, topo-sort, status badges. Streamlit Dependencies parity.",
      },
      {
        name: "Resources",
        href: "/app/resources",
        desc: "Resource heatmap by name × month, utilisation bar chart, overallocation alerts.",
      },
      {
        name: "Analytics",
        href: "/app/analytics",
        desc: "Monte Carlo cost outcomes (800 simulations), investment mix donut, risk exposure by theme. Streamlit Analytics parity.",
      },
    ],
  },
  {
    hub: "FINANCIALS",
    icon: CircleDollarSign,
    color: "#d97706",
    pages: [
      {
        name: "Financials",
        href: "/app/financials",
        desc: "EVM table (BAC, AC, PV, EV, CPI, SPI, EAC), spend trend chart, CAPEX vs actuals bar chart.",
      },
      {
        name: "FY Allocation",
        href: "/app/fy-allocation",
        desc: "Per-project × FY budget allocation editor, waterfall, and heatmap. Streamlit FY Allocation parity.",
      },
      {
        name: "Phase Financials",
        href: "/app/phase-financials",
        desc: "Stage-by-stage budget, forecast, and actual tracking with schedule health indicators.",
      },
      {
        name: "Cost vs Benefit",
        href: "/app/cost-benefit",
        desc: "Year-by-year waterfall, bubble scatter (cost vs benefit per project), benefit-type donut.",
      },
      {
        name: "Benefits",
        href: "/app/benefits",
        desc: "Benefits register with CRUD, donut chart by type, realisation tracking.",
      },
    ],
  },
  {
    hub: "GOVERNANCE",
    icon: ShieldAlert,
    color: "#e11d48",
    pages: [
      {
        name: "Risks",
        href: "/app/risks",
        desc: "Bubble scatter P×I (size = velocity), advanced risk scoring, full RAID register.",
      },
      {
        name: "Decisions & Actions",
        href: "/app/governance",
        desc: "Decision log with outcomes, action tracker with due dates and owners.",
      },
      {
        name: "Release Register",
        href: "/app/releases",
        desc: "Planned and actual release dates by project, environment, and release type.",
      },
      {
        name: "Executive Reports",
        href: "/app/reports",
        desc: "In-browser CSV export packs for risks, decisions, actions, stage gates, and benefits. Links to PPT/PDF exports.",
      },
      {
        name: "Data & Exports",
        href: "/app/data",
        desc: "Excel import (Streamlit-format sheets), PowerPoint and PDF report generation.",
      },
      {
        name: "Configuration",
        href: "/app/configuration",
        desc: "Workspace configuration editor: Status, Priority, Theme options, FY start month, thresholds.",
      },
      {
        name: "Workspace Settings",
        href: "/app/settings",
        desc: "Team members, invitations, branding, billing, and subscription management.",
      },
    ],
  },
];

const SAAS_EXTRAS = [
  {
    icon: CreditCard,
    name: "Subscription billing",
    desc: "Stripe-powered plans with per-seat pricing, trial periods, invoice history, and usage limits.",
  },
  {
    icon: Palette,
    name: "White-label branding",
    desc: "Custom brand name, logo, primary/accent/secondary colours, login tagline, and custom domain support.",
  },
  {
    icon: Users2,
    name: "Multi-tenant workspace",
    desc: "Isolated organisation data with role-based access (Owner, Admin, BU Lead, PM, Executive). Invitation workflow.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        title="About This App"
        description="iProjectX is a full-stack PMO portfolio management platform with Streamlit parity, SaaS billing, multi-tenant isolation, and white-label branding."
      />

      <div className="mb-8 space-y-8">
        {MODULES.map((hub) => {
          const Icon = hub.icon;
          return (
            <div key={hub.hub}>
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ background: hub.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">{hub.hub}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {hub.pages.map((page) => (
                  <a key={page.href} href={page.href} className="block no-underline">
                    <Card interactive>
                      <h3 className="font-semibold text-[var(--ink)]">{page.name}</h3>
                      <p className="mt-1 text-xs text-[var(--ink-soft)]">{page.desc}</p>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">
          SaaS extras (beyond Streamlit)
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SAAS_EXTRAS.map((extra) => {
            const Icon = extra.icon;
            return (
              <Card key={extra.name}>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{extra.name}</h3>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">{extra.desc}</p>
                    <div className="mt-2">
                      <Badge tone="brand">SaaS only</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="mt-8">
        <h3 className="font-[family-name:var(--font-display)] text-xl">Streamlit parity scope</h3>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          This application replicates all{" "}
          <strong>
            Home, Portfolio, Delivery, Financials, and Governance
          </strong>{" "}
          modules from the reference Streamlit PMO tool — including the same KPI engines,
          chart types (Gantt, heatmap, waterfall, bubble scatter, Monte Carlo histogram), and
          data models (Risk, Decision, Action, StageGate, Sprint, Release, Dependency,
          Benefit, CostBenefitYear, FyAllocation, PhaseFinancial, PortfolioMovement,
          OrgConfigItem, PrioritisationScore). All models are scoped per-organisation for
          full multi-tenant isolation.
        </p>
      </Card>
    </div>
  );
}
