import { PrismaClient } from "@prisma/client";
import { PLAN_CATALOG } from "../src/lib/plans";
import { scorePipeline } from "../src/lib/utils";
import { DEFAULT_FEATURE_CARDS } from "../src/lib/site-config";

const db = new PrismaClient();

async function main() {
  await db.siteConfig.upsert({
    where: { id: "default" },
    update: {
      featureCardsJson: JSON.stringify(DEFAULT_FEATURE_CARDS),
      enableExcelImport: true,
      enablePptExport: true,
      enablePdfExport: true,
    },
    create: {
      id: "default",
      featureCardsJson: JSON.stringify(DEFAULT_FEATURE_CARDS),
    },
  });

  for (const plan of PLAN_CATALOG) {
    await db.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        seatLimit: plan.seatLimit,
        projectLimit: plan.projectLimit,
        features: JSON.stringify(plan.features),
        isEnterprise: plan.isEnterprise,
        sortOrder: plan.sortOrder,
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        seatLimit: plan.seatLimit,
        projectLimit: plan.projectLimit,
        features: JSON.stringify(plan.features),
        isEnterprise: plan.isEnterprise,
        sortOrder: plan.sortOrder,
      },
    });
  }

  const pro = await db.plan.findUniqueOrThrow({ where: { slug: "professional" } });
  // Local SQLite seed profiles. For real login use Supabase Auth
  // (run supabase/sample_data_17_projects.sql which creates auth.users).
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const execId = "22222222-2222-4222-8222-222222222222";

  await db.membership.deleteMany({
    where: { user: { email: { in: ["demo@iprojectx.com", "exec@iprojectx.com"] } } },
  });
  await db.user.deleteMany({
    where: { email: { in: ["demo@iprojectx.com", "exec@iprojectx.com"] } },
  });

  const user = await db.user.create({
    data: {
      id: ownerId,
      authUserId: ownerId,
      email: "demo@iprojectx.com",
      name: "Alex Morgan",
      passwordHash: null,
      isPlatformAdmin: true,
    },
  });

  const exec = await db.user.create({
    data: {
      id: execId,
      authUserId: execId,
      email: "exec@iprojectx.com",
      name: "Jordan Lee",
      passwordHash: null,
      isPlatformAdmin: false,
    },
  });

  let org = await db.organization.findUnique({ where: { slug: "acme-digital" } });
  if (!org) {
    org = await db.organization.create({
      data: {
        name: "Acme Digital",
        slug: "acme-digital",
        planId: pro.id,
        billingEmail: "demo@iprojectx.com",
        seatCount: 12,
        subscriptionStatus: "active",
        trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        brandName: "Acme Delivery Hub",
        primaryColor: "#0F766E",
        accentColor: "#0284C7",
        secondaryColor: "#115E59",
        loginTagline: "One platform for portfolio, delivery, and outcomes",
        supportEmail: "pmo@acme.example",
        hidePoweredBy: false,
      },
    });
  } else {
    org = await db.organization.update({
      where: { id: org.id },
      data: {
        planId: pro.id,
        brandName: "Acme Delivery Hub",
        subscriptionStatus: "active",
      },
    });
  }

  await db.membership.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: user.id },
    },
    update: { role: "owner" },
    create: { organizationId: org.id, userId: user.id, role: "owner" },
  });

  await db.membership.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: exec.id },
    },
    update: { role: "executive" },
    create: { organizationId: org.id, userId: exec.id, role: "executive" },
  });

  // Clear demo portfolio entities for idempotent reseed of sample data
  await db.financialMonth.deleteMany({ where: { project: { organizationId: org.id } } });
  await db.stageGate.deleteMany({ where: { project: { organizationId: org.id } } });
  await db.milestone.deleteMany({ where: { project: { organizationId: org.id } } });
  await db.sprint.deleteMany({ where: { organizationId: org.id } });
  await db.release.deleteMany({ where: { organizationId: org.id } });
  await db.resource.deleteMany({ where: { organizationId: org.id } });
  await db.risk.deleteMany({ where: { organizationId: org.id } });
  await db.decision.deleteMany({ where: { organizationId: org.id } });
  await db.action.deleteMany({ where: { organizationId: org.id } });
  await db.pipelineItem.deleteMany({ where: { organizationId: org.id } });
  await db.update.deleteMany({ where: { organizationId: org.id } });
  await db.project.deleteMany({ where: { organizationId: org.id } });
  await db.program.deleteMany({ where: { organizationId: org.id } });

  const programs = await Promise.all(
    [
      { name: "Digital Transformation", owner: "Alex Morgan", sponsor: "CEO Office", budget: 4_200_000, forecast: 4_050_000, status: "Active" },
      { name: "Customer Experience", owner: "Priya Shah", sponsor: "CCO", budget: 2_100_000, forecast: 2_250_000, status: "Active" },
      { name: "Platform Modernisation", owner: "Chris Wong", sponsor: "CTO", budget: 3_600_000, forecast: 3_400_000, status: "Active" },
    ].map((p) =>
      db.program.create({
        data: { ...p, organizationId: org!.id, startFy: "FY25", endFy: "FY27" },
      })
    )
  );

  const projectDefs = [
    { code: "PRJ-001", name: "ERP Core Upgrade", programId: programs[0].id, theme: "Operations", portfolioCategory: "Business Strategic", businessUnit: "Finance", sponsor: "CFO", deliveryLead: "Sam Rivera", pm: "Alex Morgan", priority: "Critical", investmentType: "Transform", deliveryMethod: "Waterfall", fundingType: "CAPEX", governanceChannel: "Channel B", financialYear: "FY26", progress: 62, funding: 1_200_000, spend: 740_000, forecast: 1_180_000, benefitsTarget: 2_400_000, benefitsRealised: 610_000, status: "Active", rag: "Amber", stage: "Build" },
    { code: "PRJ-002", name: "Omnichannel Portal", programId: programs[1].id, theme: "CX", portfolioCategory: "Business Strategic", businessUnit: "Marketing", sponsor: "CCO", deliveryLead: "Priya Shah", pm: "Jamie Cole", priority: "High", investmentType: "Growth", deliveryMethod: "Agile", fundingType: "Mixed", governanceChannel: "Channel B", financialYear: "FY26", progress: 78, funding: 850_000, spend: 620_000, forecast: 840_000, benefitsTarget: 1_500_000, benefitsRealised: 900_000, status: "Active", rag: "Green", stage: "Testing" },
    { code: "PRJ-003", name: "Data Lakehouse", programId: programs[2].id, theme: "Data", portfolioCategory: "IT Strategic", businessUnit: "Technology", sponsor: "CTO", deliveryLead: "Chris Wong", pm: "Riley Chen", priority: "High", investmentType: "Foundation", deliveryMethod: "Hybrid", fundingType: "CAPEX", governanceChannel: "Channel B", financialYear: "FY26", progress: 45, funding: 1_500_000, spend: 580_000, forecast: 1_620_000, benefitsTarget: 3_000_000, benefitsRealised: 120_000, status: "Active", rag: "Red", stage: "Design" },
    { code: "PRJ-004", name: "Cyber Hardening", programId: programs[2].id, theme: "Security", portfolioCategory: "IT Strategic", businessUnit: "Technology", sponsor: "CISO", deliveryLead: "Morgan Ellis", pm: "Taylor Brooks", priority: "Critical", investmentType: "Compliance", deliveryMethod: "Waterfall", fundingType: "OPEX", governanceChannel: "Channel A", financialYear: "FY26", progress: 88, funding: 320_000, spend: 280_000, forecast: 310_000, benefitsTarget: 0, benefitsRealised: 0, status: "Active", rag: "Green", stage: "Deployment" },
    { code: "PRJ-005", name: "Store Workforce App", programId: programs[1].id, theme: "CX", portfolioCategory: "CAPEX", businessUnit: "Retail", sponsor: "COO", deliveryLead: "Priya Shah", pm: "Casey Nguyen", priority: "Medium", investmentType: "Efficiency", deliveryMethod: "Agile", fundingType: "CAPEX", governanceChannel: "Channel A", financialYear: "FY26", progress: 34, funding: 410_000, spend: 120_000, forecast: 430_000, benefitsTarget: 780_000, benefitsRealised: 40_000, status: "Active", rag: "Amber", stage: "Build" },
    { code: "PRJ-006", name: "Supplier Portal Refresh", programId: programs[0].id, theme: "Operations", portfolioCategory: "Unfunded", businessUnit: "Procurement", sponsor: "CPO", deliveryLead: "Sam Rivera", pm: "Drew Patel", priority: "Low", investmentType: "Growth", deliveryMethod: "Waterfall", fundingType: "Unfunded", governanceChannel: "Channel A", financialYear: "FY27", progress: 12, funding: 0, spend: 15_000, forecast: 275_000, benefitsTarget: 520_000, benefitsRealised: 0, status: "On Hold", rag: "Amber", stage: "Discovery" },
  ];

  const projects = [];
  for (const def of projectDefs) {
    const start = new Date("2025-07-01");
    const end = new Date("2026-12-31");
    const project = await db.project.create({
      data: {
        ...def,
        organizationId: org.id,
        startDate: start,
        endDate: end,
        description: `${def.name} delivery initiative within the ${def.theme} theme.`,
      },
    });
    projects.push(project);

    const stages =
      def.governanceChannel === "Channel B"
        ? ["Discovery", "Business Case / Seed Funding", "Design", "Business Case / Full Funding", "Build", "Testing", "Deployment", "Handover"]
        : ["Discovery", "Business Case / Full Funding", "Design", "Build", "Testing", "Deployment", "Handover"];

    const currentIdx = Math.max(0, stages.indexOf(def.stage));
    for (let i = 0; i < stages.length; i++) {
      await db.stageGate.create({
        data: {
          projectId: project.id,
          channel: def.governanceChannel,
          stage: stages[i],
          nextGate: stages[i + 1] || null,
          gateStatus: i < currentIdx ? "Approved" : i === currentIdx ? "In Review" : "Pending",
          checklistPct: i < currentIdx ? 100 : i === currentIdx ? 55 : 0,
          daysLate: i === currentIdx && def.rag === "Red" ? 12 : 0,
        },
      });
    }

    await db.milestone.createMany({
      data: [
        { projectId: project.id, name: "Charter approved", status: "Complete", plannedDate: new Date("2025-08-15"), actualDate: new Date("2025-08-12"), owner: def.pm },
        { projectId: project.id, name: "Design baseline", status: currentIdx >= 2 ? "Complete" : "Planned", plannedDate: new Date("2025-11-01"), owner: def.deliveryLead },
        { projectId: project.id, name: "Go-live readiness", status: "Planned", plannedDate: new Date("2026-09-30"), owner: def.pm },
      ],
    });

    for (let m = 0; m < 6; m++) {
      const month = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m];
      const actual = Math.round((def.spend / 6) * (0.8 + Math.random() * 0.4));
      const forecast = Math.round((def.forecast / 6) * (0.85 + Math.random() * 0.3));
      const pv = Math.round(forecast * 0.95);
      const ev = Math.round(actual * (def.progress / 100 + 0.4));
      await db.financialMonth.create({
        data: {
          projectId: project.id,
          month,
          year: 2025,
          capex: def.fundingType === "OPEX" ? 0 : forecast * 0.7,
          opex: def.fundingType === "CAPEX" ? forecast * 0.3 : forecast,
          actual,
          forecast,
          variance: forecast - actual,
          pv,
          ev,
        },
      });
    }

    await db.projectBrief.create({
      data: {
        projectId: project.id,
        strategicAlignment: `Supports ${def.theme} outcomes and enterprise ${def.portfolioCategory} priorities.`,
        problemStatement: `Current-state gaps in ${def.name} are limiting delivery speed and measurable business value.`,
        proposedSolution: `Deliver ${def.name} through a ${def.deliveryMethod.toLowerCase()} approach with gated funding and clear benefits tracking.`,
        scope: `In-scope: core delivery for ${def.businessUnit}, integration readiness, and operational handover.`,
        outOfScope: "Non-critical enhancements and unrelated legacy remediation.",
        fundingAsk: def.funding || def.forecast,
        expectedBenefits: `Target benefits ${def.benefitsTarget.toLocaleString()} with staged realisation through FY26/FY27.`,
        keyRisks: "Delivery dependency, vendor performance, and data quality during transition.",
        assumptions: "Sponsors remain engaged; key resources allocated at planned capacity.",
        successMetrics: "On-time stage-gate approvals, benefits realisation %, stakeholder adoption.",
        optionsConsidered: "Do nothing / tactical patch / full strategic investment (recommended).",
        recommendation: "Proceed with staged funding under the assigned governance channel.",
        stakeholderSummary: `Sponsor ${def.sponsor}; Delivery Lead ${def.deliveryLead}; PM ${def.pm}.`,
      },
    });
  }

  await db.risk.createMany({
    data: [
      { organizationId: org.id, projectId: projects[0].id, code: "RSK-001", title: "Vendor API latency", description: "Core integration SLAs at risk during peak.", probability: 3, impact: 4, velocity: 3, owner: "Alex Morgan", mitigation: "Add caching + vendor war room", status: "Open", rag: "Amber" },
      { organizationId: org.id, projectId: projects[2].id, code: "RSK-002", title: "Data migration quality", description: "Legacy source quality below threshold.", probability: 4, impact: 5, velocity: 4, owner: "Riley Chen", mitigation: "Dual-run reconciliation sprints", status: "Open", rag: "Red" },
      { organizationId: org.id, projectId: projects[1].id, code: "RSK-003", title: "UX research delay", probability: 2, impact: 3, velocity: 2, owner: "Jamie Cole", mitigation: "Parallelise remote interviews", status: "Mitigating", rag: "Green" },
      { organizationId: org.id, projectId: projects[4].id, code: "RSK-004", title: "Store Wi-Fi variance", probability: 3, impact: 3, velocity: 2, owner: "Casey Nguyen", mitigation: "Offline-first sync", status: "Open", rag: "Amber" },
    ],
  });

  await db.decision.createMany({
    data: [
      { organizationId: org.id, projectId: projects[0].id, title: "Approve full funding for Wave 2", owner: "CFO", status: "Approved", outcome: "Funded $480k", decidedOn: new Date("2025-10-12") },
      { organizationId: org.id, projectId: projects[2].id, title: "Select lakehouse vendor", owner: "CTO", status: "Pending", description: "Final shortlist: Snowflake vs Databricks" },
    ],
  });

  await db.action.createMany({
    data: [
      { organizationId: org.id, projectId: projects[2].id, title: "Complete source system profiling", owner: "Riley Chen", dueDate: new Date("2026-04-01"), priority: "High", status: "Open" },
      { organizationId: org.id, projectId: projects[0].id, title: "Close security questionnaire", owner: "Sam Rivera", dueDate: new Date("2026-03-20"), priority: "Critical", status: "In Progress" },
      { organizationId: org.id, projectId: projects[1].id, title: "Publish release notes draft", owner: "Jamie Cole", dueDate: new Date("2026-03-25"), priority: "Medium", status: "Open" },
    ],
  });

  const pipeline = [
    { code: "IDEA-01", title: "AI invoice matching", businessUnit: "Finance", strategicAlignment: 5, benefitValue: 4, riskReduction: 3, compliance: 2, complexity: 3, estBudget: 220_000, decision: "Shortlisted", sponsor: "CFO" },
    { code: "IDEA-02", title: "Field service mobile pack", businessUnit: "Operations", strategicAlignment: 4, benefitValue: 5, riskReduction: 2, compliance: 1, complexity: 4, estBudget: 380_000, decision: "Under Review", sponsor: "COO" },
    { code: "IDEA-03", title: "ESG reporting automation", businessUnit: "Finance", strategicAlignment: 4, benefitValue: 3, riskReduction: 4, compliance: 5, complexity: 2, estBudget: 150_000, decision: "Approved", sponsor: "CFO" },
  ];
  for (const item of pipeline) {
    await db.pipelineItem.create({
      data: {
        ...item,
        organizationId: org.id,
        priorityScore: Number(scorePipeline(item).toFixed(2)),
      },
    });
  }

  await db.resource.createMany({
    data: [
      { organizationId: org.id, projectId: projects[0].id, name: "Alex Morgan", skill: "PMO", role: "PM", month: "Mar", allocationPct: 80, capacityPct: 100 },
      { organizationId: org.id, projectId: projects[0].id, name: "Dev Squad A", skill: "Engineering", role: "Build", month: "Mar", allocationPct: 100, capacityPct: 100 },
      { organizationId: org.id, projectId: projects[1].id, name: "UX Guild", skill: "Design", role: "Design", month: "Mar", allocationPct: 60, capacityPct: 80 },
      { organizationId: org.id, projectId: projects[2].id, name: "Data Eng Pod", skill: "Data", role: "Build", month: "Mar", allocationPct: 110, capacityPct: 100 },
      { organizationId: org.id, projectId: projects[4].id, name: "Mobile Guild", skill: "Engineering", role: "Build", month: "Mar", allocationPct: 70, capacityPct: 90 },
    ],
  });

  await db.sprint.createMany({
    data: [
      { organizationId: org.id, projectId: projects[1].id, name: "Sprint 18", committedPts: 42, completedPts: 40, status: "Complete", startDate: new Date("2026-02-01"), endDate: new Date("2026-02-14") },
      { organizationId: org.id, projectId: projects[1].id, name: "Sprint 19", committedPts: 45, completedPts: 28, status: "Active", startDate: new Date("2026-02-15"), endDate: new Date("2026-02-28") },
      { organizationId: org.id, projectId: projects[4].id, name: "Sprint 7", committedPts: 30, completedPts: 18, status: "Active", startDate: new Date("2026-02-15"), endDate: new Date("2026-02-28") },
    ],
  });

  await db.release.createMany({
    data: [
      { organizationId: org.id, projectId: projects[1].id, version: "2.4.0", title: "Portal personalization", releaseType: "Minor", environment: "Production", status: "Planned", plannedDate: new Date("2026-04-15") },
      { organizationId: org.id, projectId: projects[3].id, version: "1.0.0", title: "Hardening baseline", releaseType: "Major", environment: "Production", status: "In Progress", plannedDate: new Date("2026-03-30") },
    ],
  });

  await db.update.createMany({
    data: [
      { organizationId: org.id, title: "Portfolio steering pack published", body: "March steering pack is available with updated RAG and financial variance.", category: "Governance" },
      { organizationId: org.id, title: "Channel B threshold reminder", body: "Investments ≥ $200k continue on Channel B stage-gate path.", category: "Process" },
      { organizationId: org.id, title: "White-label theme live", body: "Acme Delivery Hub branding is active for all workspace users.", category: "Product" },
    ],
  });

  console.log("Seed complete (app data).");
  console.log("For login, use Supabase Auth — run supabase/sample_data_17_projects.sql");
  console.log("Demo: demo@iprojectx.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
