import ExcelJS from "exceljs";
import { db } from "./db";
import { scorePipeline } from "./utils";

const SHEETS = [
  "Programs",
  "Projects",
  "ProjectBrief",
  "Risks",
  "Pipeline",
  "Decisions",
  "Actions",
  "Resources",
  "Sprints",
  "Releases",
] as const;

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: (string | number | Date | null | undefined)[][]
) {
  const ws = wb.addWorksheet(name);
  ws.addRow(headers);
  styleHeader(ws.getRow(1));
  for (const row of rows) ws.addRow(row);
  ws.columns.forEach((col) => {
    col.width = 18;
  });
  return ws;
}

export async function buildImportTemplate(organizationId: string, filled = true) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "iProjectX";
  wb.created = new Date();

  const instructions = wb.addWorksheet("Instructions");
  instructions.addRow(["iProjectX Excel Import Template"]);
  instructions.addRow([]);
  instructions.addRow(["1. Keep sheet names and column headers unchanged."]);
  instructions.addRow(["2. Use Project Code / Program Name as keys for upserts."]);
  instructions.addRow(["3. Upload this file in App → Data Import to update the database."]);
  instructions.addRow(["4. Empty optional cells are ignored; blank required keys are skipped."]);
  instructions.getRow(1).font = { bold: true, size: 14 };

  if (!filled) {
    addSheet(wb, "Programs", ["Name", "Owner", "Sponsor", "Budget", "Forecast", "Start FY", "End FY", "Status"], []);
    addSheet(
      wb,
      "Projects",
      [
        "Code",
        "Name",
        "Program",
        "Theme",
        "Portfolio Category",
        "Business Unit",
        "Sponsor",
        "Delivery Lead",
        "PM",
        "Priority",
        "Investment Type",
        "Delivery Method",
        "Funding Type",
        "Governance Channel",
        "Financial Year",
        "Progress",
        "Funding",
        "Spend",
        "Forecast",
        "Benefits Target",
        "Benefits Realised",
        "Status",
        "RAG",
        "Stage",
        "Description",
      ],
      []
    );
    addSheet(
      wb,
      "ProjectBrief",
      [
        "Project Code",
        "Strategic Alignment",
        "Problem Statement",
        "Proposed Solution",
        "Scope",
        "Out of Scope",
        "Funding Ask",
        "Expected Benefits",
        "Key Risks",
        "Assumptions",
        "Success Metrics",
        "Options Considered",
        "Recommendation",
        "Stakeholder Summary",
      ],
      []
    );
    addSheet(
      wb,
      "Risks",
      ["Code", "Project Code", "Title", "Description", "Probability", "Impact", "Velocity", "Owner", "Mitigation", "Status", "RAG"],
      []
    );
    addSheet(
      wb,
      "Pipeline",
      [
        "Code",
        "Title",
        "Business Unit",
        "Strategic Alignment",
        "Benefit Value",
        "Risk Reduction",
        "Compliance",
        "Complexity",
        "Est Budget",
        "Decision",
        "Sponsor",
      ],
      []
    );
    addSheet(wb, "Decisions", ["Title", "Project Code", "Description", "Owner", "Outcome", "Status"], []);
    addSheet(wb, "Actions", ["Title", "Project Code", "Owner", "Due Date", "Priority", "Status"], []);
    addSheet(wb, "Resources", ["Name", "Project Code", "Skill", "Role", "Month", "Allocation %", "Capacity %"], []);
    addSheet(wb, "Sprints", ["Name", "Project Code", "Committed Pts", "Completed Pts", "Status"], []);
    addSheet(wb, "Releases", ["Version", "Title", "Project Code", "Release Type", "Environment", "Status"], []);
  } else {
    const [programs, projects, risks, pipeline, decisions, actions, resources, sprints, releases] =
      await Promise.all([
        db.program.findMany({ where: { organizationId } }),
        db.project.findMany({
          where: { organizationId },
          include: { program: true, brief: true },
        }),
        db.risk.findMany({ where: { organizationId }, include: { project: true } }),
        db.pipelineItem.findMany({ where: { organizationId } }),
        db.decision.findMany({ where: { organizationId }, include: { project: true } }),
        db.action.findMany({ where: { organizationId }, include: { project: true } }),
        db.resource.findMany({ where: { organizationId }, include: { project: true } }),
        db.sprint.findMany({ where: { organizationId }, include: { project: true } }),
        db.release.findMany({ where: { organizationId }, include: { project: true } }),
      ]);

    addSheet(
      wb,
      "Programs",
      ["Name", "Owner", "Sponsor", "Budget", "Forecast", "Start FY", "End FY", "Status"],
      programs.map((p) => [p.name, p.owner, p.sponsor, p.budget, p.forecast, p.startFy, p.endFy, p.status])
    );

    addSheet(
      wb,
      "Projects",
      [
        "Code",
        "Name",
        "Program",
        "Theme",
        "Portfolio Category",
        "Business Unit",
        "Sponsor",
        "Delivery Lead",
        "PM",
        "Priority",
        "Investment Type",
        "Delivery Method",
        "Funding Type",
        "Governance Channel",
        "Financial Year",
        "Progress",
        "Funding",
        "Spend",
        "Forecast",
        "Benefits Target",
        "Benefits Realised",
        "Status",
        "RAG",
        "Stage",
        "Description",
      ],
      projects.map((p) => [
        p.code,
        p.name,
        p.program?.name,
        p.theme,
        p.portfolioCategory,
        p.businessUnit,
        p.sponsor,
        p.deliveryLead,
        p.pm,
        p.priority,
        p.investmentType,
        p.deliveryMethod,
        p.fundingType,
        p.governanceChannel,
        p.financialYear,
        p.progress,
        p.funding,
        p.spend,
        p.forecast,
        p.benefitsTarget,
        p.benefitsRealised,
        p.status,
        p.rag,
        p.stage,
        p.description,
      ])
    );

    addSheet(
      wb,
      "ProjectBrief",
      [
        "Project Code",
        "Strategic Alignment",
        "Problem Statement",
        "Proposed Solution",
        "Scope",
        "Out of Scope",
        "Funding Ask",
        "Expected Benefits",
        "Key Risks",
        "Assumptions",
        "Success Metrics",
        "Options Considered",
        "Recommendation",
        "Stakeholder Summary",
      ],
      projects.map((p) => [
        p.code,
        p.brief?.strategicAlignment,
        p.brief?.problemStatement,
        p.brief?.proposedSolution,
        p.brief?.scope,
        p.brief?.outOfScope,
        p.brief?.fundingAsk ?? p.funding,
        p.brief?.expectedBenefits,
        p.brief?.keyRisks,
        p.brief?.assumptions,
        p.brief?.successMetrics,
        p.brief?.optionsConsidered,
        p.brief?.recommendation,
        p.brief?.stakeholderSummary,
      ])
    );

    addSheet(
      wb,
      "Risks",
      ["Code", "Project Code", "Title", "Description", "Probability", "Impact", "Velocity", "Owner", "Mitigation", "Status", "RAG"],
      risks.map((r) => [
        r.code,
        r.project?.code,
        r.title,
        r.description,
        r.probability,
        r.impact,
        r.velocity,
        r.owner,
        r.mitigation,
        r.status,
        r.rag,
      ])
    );

    addSheet(
      wb,
      "Pipeline",
      [
        "Code",
        "Title",
        "Business Unit",
        "Strategic Alignment",
        "Benefit Value",
        "Risk Reduction",
        "Compliance",
        "Complexity",
        "Est Budget",
        "Decision",
        "Sponsor",
      ],
      pipeline.map((i) => [
        i.code,
        i.title,
        i.businessUnit,
        i.strategicAlignment,
        i.benefitValue,
        i.riskReduction,
        i.compliance,
        i.complexity,
        i.estBudget,
        i.decision,
        i.sponsor,
      ])
    );

    addSheet(
      wb,
      "Decisions",
      ["Title", "Project Code", "Description", "Owner", "Outcome", "Status"],
      decisions.map((d) => [d.title, d.project?.code, d.description, d.owner, d.outcome, d.status])
    );

    addSheet(
      wb,
      "Actions",
      ["Title", "Project Code", "Owner", "Due Date", "Priority", "Status"],
      actions.map((a) => [
        a.title,
        a.project?.code,
        a.owner,
        a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "",
        a.priority,
        a.status,
      ])
    );

    addSheet(
      wb,
      "Resources",
      ["Name", "Project Code", "Skill", "Role", "Month", "Allocation %", "Capacity %"],
      resources.map((r) => [r.name, r.project?.code, r.skill, r.role, r.month, r.allocationPct, r.capacityPct])
    );

    addSheet(
      wb,
      "Sprints",
      ["Name", "Project Code", "Committed Pts", "Completed Pts", "Status"],
      sprints.map((s) => [s.name, s.project?.code, s.committedPts, s.completedPts, s.status])
    );

    addSheet(
      wb,
      "Releases",
      ["Version", "Title", "Project Code", "Release Type", "Environment", "Status"],
      releases.map((r) => [r.version, r.title, r.project?.code, r.releaseType, r.environment, r.status])
    );
  }

  void SHEETS;
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function cell(row: ExcelJS.Row, idx: number) {
  const v = row.getCell(idx).value;
  if (v == null) return "";
  if (typeof v === "object" && "text" in v) return String((v as { text: string }).text || "").trim();
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "").trim();
  return String(v).trim();
}

function num(row: ExcelJS.Row, idx: number, fallback = 0) {
  const n = Number(cell(row, idx));
  return Number.isFinite(n) ? n : fallback;
}

export async function importWorkbook(
  organizationId: string,
  userId: string | null,
  filename: string,
  data: Buffer
) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as ExcelJS.Buffer);

  let rowsUpserted = 0;
  const errors: string[] = [];
  const programByName = new Map<string, string>();

  const programsSheet = wb.getWorksheet("Programs");
  if (programsSheet) {
    for (let i = 2; i <= programsSheet.rowCount; i++) {
      const row = programsSheet.getRow(i);
      const name = cell(row, 1);
      if (!name) continue;
      try {
        const existing = await db.program.findFirst({
          where: { organizationId, name },
        });
        const payload = {
          owner: cell(row, 2) || null,
          sponsor: cell(row, 3) || null,
          budget: num(row, 4),
          forecast: num(row, 5),
          startFy: cell(row, 6) || null,
          endFy: cell(row, 7) || null,
          status: cell(row, 8) || "Active",
        };
        const program = existing
          ? await db.program.update({ where: { id: existing.id }, data: payload })
          : await db.program.create({
              data: { organizationId, name, ...payload },
            });
        programByName.set(name.toLowerCase(), program.id);
        rowsUpserted++;
      } catch (e) {
        errors.push(`Programs row ${i}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  const existingPrograms = await db.program.findMany({ where: { organizationId } });
  for (const p of existingPrograms) programByName.set(p.name.toLowerCase(), p.id);

  const projectByCode = new Map<string, string>();
  const projectsSheet = wb.getWorksheet("Projects");
  if (projectsSheet) {
    for (let i = 2; i <= projectsSheet.rowCount; i++) {
      const row = projectsSheet.getRow(i);
      const code = cell(row, 1);
      const name = cell(row, 2);
      if (!code || !name) continue;
      try {
        const programName = cell(row, 3);
        const programId = programName ? programByName.get(programName.toLowerCase()) || null : null;
        const payload = {
          name,
          programId,
          theme: cell(row, 4) || null,
          portfolioCategory: cell(row, 5) || "Business Strategic",
          businessUnit: cell(row, 6) || null,
          sponsor: cell(row, 7) || null,
          deliveryLead: cell(row, 8) || null,
          pm: cell(row, 9) || null,
          priority: cell(row, 10) || "Medium",
          investmentType: cell(row, 11) || null,
          deliveryMethod: cell(row, 12) || "Waterfall",
          fundingType: cell(row, 13) || "CAPEX",
          governanceChannel: cell(row, 14) || "Channel A",
          financialYear: cell(row, 15) || null,
          progress: num(row, 16),
          funding: num(row, 17),
          spend: num(row, 18),
          forecast: num(row, 19),
          benefitsTarget: num(row, 20),
          benefitsRealised: num(row, 21),
          status: cell(row, 22) || "Active",
          rag: cell(row, 23) || "Green",
          stage: cell(row, 24) || "Discovery",
          description: cell(row, 25) || null,
        };
        const project = await db.project.upsert({
          where: { organizationId_code: { organizationId, code } },
          update: payload,
          create: { organizationId, code, ...payload },
        });
        projectByCode.set(code.toUpperCase(), project.id);
        rowsUpserted++;
      } catch (e) {
        errors.push(`Projects row ${i}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  const existingProjects = await db.project.findMany({ where: { organizationId } });
  for (const p of existingProjects) projectByCode.set(p.code.toUpperCase(), p.id);

  const briefSheet = wb.getWorksheet("ProjectBrief");
  if (briefSheet) {
    for (let i = 2; i <= briefSheet.rowCount; i++) {
      const row = briefSheet.getRow(i);
      const code = cell(row, 1).toUpperCase();
      const projectId = projectByCode.get(code);
      if (!projectId) continue;
      try {
        const payload = {
          strategicAlignment: cell(row, 2) || null,
          problemStatement: cell(row, 3) || null,
          proposedSolution: cell(row, 4) || null,
          scope: cell(row, 5) || null,
          outOfScope: cell(row, 6) || null,
          fundingAsk: num(row, 7),
          expectedBenefits: cell(row, 8) || null,
          keyRisks: cell(row, 9) || null,
          assumptions: cell(row, 10) || null,
          successMetrics: cell(row, 11) || null,
          optionsConsidered: cell(row, 12) || null,
          recommendation: cell(row, 13) || null,
          stakeholderSummary: cell(row, 14) || null,
        };
        await db.projectBrief.upsert({
          where: { projectId },
          update: payload,
          create: { projectId, ...payload },
        });
        rowsUpserted++;
      } catch (e) {
        errors.push(`ProjectBrief row ${i}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  const risksSheet = wb.getWorksheet("Risks");
  if (risksSheet) {
    for (let i = 2; i <= risksSheet.rowCount; i++) {
      const row = risksSheet.getRow(i);
      const code = cell(row, 1);
      const title = cell(row, 3);
      if (!code || !title) continue;
      try {
        const projectCode = cell(row, 2).toUpperCase();
        const projectId = projectCode ? projectByCode.get(projectCode) || null : null;
        const existing = await db.risk.findFirst({ where: { organizationId, code } });
        const payload = {
          projectId,
          title,
          description: cell(row, 4) || null,
          probability: num(row, 5, 3),
          impact: num(row, 6, 3),
          velocity: num(row, 7, 2),
          owner: cell(row, 8) || null,
          mitigation: cell(row, 9) || null,
          status: cell(row, 10) || "Open",
          rag: cell(row, 11) || "Amber",
        };
        if (existing) await db.risk.update({ where: { id: existing.id }, data: payload });
        else await db.risk.create({ data: { organizationId, code, ...payload } });
        rowsUpserted++;
      } catch (e) {
        errors.push(`Risks row ${i}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  const pipelineSheet = wb.getWorksheet("Pipeline");
  if (pipelineSheet) {
    for (let i = 2; i <= pipelineSheet.rowCount; i++) {
      const row = pipelineSheet.getRow(i);
      const code = cell(row, 1);
      const title = cell(row, 2);
      if (!code || !title) continue;
      try {
        const scores = {
          strategicAlignment: num(row, 4, 3),
          benefitValue: num(row, 5, 3),
          riskReduction: num(row, 6, 2),
          compliance: num(row, 7, 2),
          complexity: num(row, 8, 3),
        };
        const payload = {
          title,
          businessUnit: cell(row, 3) || null,
          ...scores,
          priorityScore: Number(scorePipeline(scores).toFixed(2)),
          estBudget: num(row, 9),
          decision: cell(row, 10) || "Under Review",
          sponsor: cell(row, 11) || null,
        };
        const existing = await db.pipelineItem.findFirst({ where: { organizationId, code } });
        if (existing) await db.pipelineItem.update({ where: { id: existing.id }, data: payload });
        else await db.pipelineItem.create({ data: { organizationId, code, ...payload } });
        rowsUpserted++;
      } catch (e) {
        errors.push(`Pipeline row ${i}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  // Lightweight sheets: replace-by-org for decisions/actions/resources/sprints/releases when present
  async function replaceSimple(
    sheetName: string,
    handler: (row: ExcelJS.Row, i: number) => Promise<void>
  ) {
    const sheet = wb.getWorksheet(sheetName);
    if (!sheet) return;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      try {
        await handler(row, i);
      } catch (e) {
        errors.push(`${sheetName} row ${i}: ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  const decisionsSheet = wb.getWorksheet("Decisions");
  if (decisionsSheet && decisionsSheet.rowCount > 1) {
    await db.decision.deleteMany({ where: { organizationId } });
    await replaceSimple("Decisions", async (row) => {
      const title = cell(row, 1);
      if (!title) return;
      await db.decision.create({
        data: {
          organizationId,
          title,
          projectId: projectByCode.get(cell(row, 2).toUpperCase()) || null,
          description: cell(row, 3) || null,
          owner: cell(row, 4) || null,
          outcome: cell(row, 5) || null,
          status: cell(row, 6) || "Pending",
        },
      });
      rowsUpserted++;
    });
  }

  const actionsSheet = wb.getWorksheet("Actions");
  if (actionsSheet && actionsSheet.rowCount > 1) {
    await db.action.deleteMany({ where: { organizationId } });
    await replaceSimple("Actions", async (row) => {
      const title = cell(row, 1);
      if (!title) return;
      const due = cell(row, 4);
      await db.action.create({
        data: {
          organizationId,
          title,
          projectId: projectByCode.get(cell(row, 2).toUpperCase()) || null,
          owner: cell(row, 3) || null,
          dueDate: due ? new Date(due) : null,
          priority: cell(row, 5) || "Medium",
          status: cell(row, 6) || "Open",
        },
      });
      rowsUpserted++;
    });
  }

  const resourcesSheet = wb.getWorksheet("Resources");
  if (resourcesSheet && resourcesSheet.rowCount > 1) {
    await db.resource.deleteMany({ where: { organizationId } });
    await replaceSimple("Resources", async (row) => {
      const name = cell(row, 1);
      if (!name) return;
      await db.resource.create({
        data: {
          organizationId,
          name,
          projectId: projectByCode.get(cell(row, 2).toUpperCase()) || null,
          skill: cell(row, 3) || null,
          role: cell(row, 4) || null,
          month: cell(row, 5) || null,
          allocationPct: num(row, 6),
          capacityPct: num(row, 7, 100),
        },
      });
      rowsUpserted++;
    });
  }

  const sprintsSheet = wb.getWorksheet("Sprints");
  if (sprintsSheet && sprintsSheet.rowCount > 1) {
    await db.sprint.deleteMany({ where: { organizationId } });
    await replaceSimple("Sprints", async (row) => {
      const name = cell(row, 1);
      if (!name) return;
      await db.sprint.create({
        data: {
          organizationId,
          name,
          projectId: projectByCode.get(cell(row, 2).toUpperCase()) || null,
          committedPts: num(row, 3),
          completedPts: num(row, 4),
          status: cell(row, 5) || "Planned",
        },
      });
      rowsUpserted++;
    });
  }

  const releasesSheet = wb.getWorksheet("Releases");
  if (releasesSheet && releasesSheet.rowCount > 1) {
    await db.release.deleteMany({ where: { organizationId } });
    await replaceSimple("Releases", async (row) => {
      const version = cell(row, 1);
      const title = cell(row, 2);
      if (!version || !title) return;
      await db.release.create({
        data: {
          organizationId,
          version,
          title,
          projectId: projectByCode.get(cell(row, 3).toUpperCase()) || null,
          releaseType: cell(row, 4) || "Minor",
          environment: cell(row, 5) || "Production",
          status: cell(row, 6) || "Planned",
        },
      });
      rowsUpserted++;
    });
  }

  const job = await db.importJob.create({
    data: {
      organizationId,
      userId,
      filename,
      status: errors.length ? "completed_with_errors" : "completed",
      rowsUpserted,
      errorCount: errors.length,
      summary: errors.slice(0, 20).join(" | ") || `Upserted ${rowsUpserted} rows`,
    },
  });

  return { job, rowsUpserted, errors };
}
