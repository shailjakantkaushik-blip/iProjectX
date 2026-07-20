import * as XLSX from "xlsx";
import type { DomainBundle } from "@/lib/portfolio-engine";

export interface ProjectRow {
  project_code?: string | null;
  name: string;
  program?: string | null;
  sponsor?: string | null;
  priority?: string | null;
  status?: string | null;
  rag?: string | null;
  current_phase?: string | null;
  delivery_method?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  target_go_live?: string | null;
  budget?: number;
  capex_approved?: number;
  capex_incurred?: number;
  opex_approved?: number;
  opex_incurred?: number;
  benefits_target?: number;
  benefits_realised?: number;
  roi_percent?: number;
  description?: string | null;
}

export const PROJECT_COLUMNS: (keyof ProjectRow)[] = [
  "project_code", "name", "program", "sponsor", "priority", "status", "rag",
  "current_phase", "delivery_method", "start_date", "end_date", "target_go_live",
  "budget", "capex_approved", "capex_incurred", "opex_approved", "opex_incurred",
  "benefits_target", "benefits_realised", "roi_percent", "description",
];

export type FullWorkbookBundle = {
  projects: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  benefits: Record<string, unknown>[];
  stageGates: Record<string, unknown>[];
  dependencies: Record<string, unknown>[];
  sprints: Record<string, unknown>[];
  releases: Record<string, unknown>[];
  pipeline: Record<string, unknown>[];
};

type SheetSpec = { name: string; headers: string[]; sample: Record<string, unknown>[] };

/** Part4-aligned template sheets (14 total including Instructions). */
const TEMPLATE_SHEETS: SheetSpec[] = [
  {
    name: "Instructions",
    headers: ["Sheet", "Purpose", "Notes"],
    sample: [
      { Sheet: "Projects", Purpose: "Master project register", Notes: "Imported by parseWorkbook / parseFullWorkbook." },
      { Sheet: "Business Units", Purpose: "Organisation → BU hierarchy", Notes: "Create BUs in the app under Business Units." },
      { Sheet: "StageGates", Purpose: "Gate approvals per project", Notes: "Link by project_code. Planned/Actual Gate Date." },
      { Sheet: "Risks", Purpose: "Risk register (RAID – R)", Notes: "Probability, Impact, Velocity are 1–5 integers. Score = P×I×V." },
      { Sheet: "Actions", Purpose: "Action log (RAID – A)", Notes: "Owner + due date required." },
      { Sheet: "Decisions", Purpose: "Decision log (RAID – D)", Notes: "Capture rationale + status Open/In Review/Approved." },
      { Sheet: "Dependencies", Purpose: "Cross-project dependencies", Notes: "predecessor → successor." },
      { Sheet: "Benefits", Purpose: "Benefit tracking", Notes: "Target vs realised, cash/non-cash." },
      { Sheet: "Financials", Purpose: "FY-level CAPEX/OPEX split", Notes: "One row per project × FY." },
      { Sheet: "Sprints", Purpose: "Agile sprint metrics", Notes: "Velocity, committed vs completed." },
      { Sheet: "Releases", Purpose: "Release calendar", Notes: "Target date + scope." },
      { Sheet: "Governance", Purpose: "Governance forums", Notes: "Cadence, chair, attendees." },
      {
        Sheet: "Demand Pipeline",
        Purpose: "Idea intake / scoring",
        Notes: "Priority Score = (StrategicFit×0.3 + Value×0.4 − Risk×0.15 − Effort×0.15) × 20. Score dimensions 1–5.",
      },
    ],
  },
  {
    name: "Projects",
    headers: PROJECT_COLUMNS as string[],
    sample: [
      {
        project_code: "PRJ-001", name: "Sample Project", program: "Business Strategic", sponsor: "Jane Doe",
        priority: "High", status: "In Progress", rag: "Green", current_phase: "Build",
        delivery_method: "Agile", start_date: "2026-01-01", end_date: "2026-12-31", target_go_live: "2026-11-30",
        budget: 500000, capex_approved: 300000, capex_incurred: 120000,
        opex_approved: 200000, opex_incurred: 80000,
        benefits_target: 800000, benefits_realised: 100000, roi_percent: 60,
        description: "Example project — replace with your own.",
      },
    ],
  },
  {
    name: "Business Units",
    headers: ["bu_code", "name", "lead", "description"],
    sample: [{ bu_code: "BU-DIG", name: "Digital", lead: "A. Smith", description: "Digital transformation portfolio" }],
  },
  {
    name: "StageGates",
    headers: [
      "project_code", "project_name", "governance_channel", "stage", "next_gate",
      "gate_status", "status", "gate_owner", "planned_gate_date", "actual_gate_date",
      "gate_outcome", "gate_comments", "checklist_complete_pct", "days_late",
    ],
    sample: [{
      project_code: "PRJ-001",
      project_name: "Sample Project",
      governance_channel: "Channel B",
      stage: "Build",
      next_gate: "Testing",
      gate_status: "In Progress",
      status: "In Progress",
      gate_owner: "Jane Doe",
      planned_gate_date: "2026-06-15",
      actual_gate_date: "",
      gate_outcome: "",
      gate_comments: "On track",
      checklist_complete_pct: 60,
      days_late: 0,
    }],
  },
  {
    name: "Risks",
    headers: [
      "risk_id", "project_code", "title", "description", "category",
      "probability", "impact", "velocity", "score", "rag", "owner", "mitigation", "status", "due_date",
    ],
    sample: [{
      risk_id: "R001",
      project_code: "PRJ-001",
      title: "Vendor delay",
      description: "Vendor delay impacting milestone",
      category: "Delivery",
      probability: 3,
      impact: 4,
      velocity: 2,
      score: 24,
      rag: "Amber",
      owner: "PM",
      mitigation: "Weekly vendor review",
      status: "Open",
      due_date: "2026-04-01",
    }],
  },
  {
    name: "Actions",
    headers: ["project_code", "title", "owner", "due_date", "status", "priority", "notes"],
    sample: [{ project_code: "PRJ-001", title: "Confirm cloud region", owner: "Tech Lead", due_date: "2026-03-01", status: "Open", priority: "High", notes: "" }],
  },
  {
    name: "Decisions",
    headers: ["project_code", "title", "type", "decision_maker", "due_date", "status", "rationale", "outcome", "priority"],
    sample: [{
      project_code: "PRJ-001",
      title: "Platform choice",
      type: "Architecture",
      decision_maker: "Steering Co",
      due_date: "2026-02-28",
      status: "In Review",
      rationale: "Best TCO",
      outcome: "",
      priority: "High",
    }],
  },
  {
    name: "Dependencies",
    headers: ["predecessor_code", "successor_code", "type", "description", "status", "impact", "needed_by"],
    sample: [{
      predecessor_code: "PRJ-001",
      successor_code: "PRJ-002",
      type: "Finish-to-Start",
      description: "API must go live first",
      status: "On track",
      impact: "High",
      needed_by: "2026-06-01",
    }],
  },
  {
    name: "Benefits",
    headers: ["project_code", "benefit", "category", "type", "target_value", "realised_value", "measure_date", "owner", "status"],
    sample: [{
      project_code: "PRJ-001",
      benefit: "Revenue uplift",
      category: "Cash",
      type: "Recurring",
      target_value: 800000,
      realised_value: 100000,
      measure_date: "2026-12-31",
      owner: "Sponsor",
      status: "On track",
    }],
  },
  {
    name: "Financials",
    headers: ["project_code", "fiscal_year", "capex_plan", "capex_actual", "opex_plan", "opex_actual", "benefits_plan", "benefits_actual"],
    sample: [{ project_code: "PRJ-001", fiscal_year: "FY27", capex_plan: 300000, capex_actual: 120000, opex_plan: 200000, opex_actual: 80000, benefits_plan: 400000, benefits_actual: 50000 }],
  },
  {
    name: "Sprints",
    headers: ["project_code", "sprint_number", "sprint_name", "start_date", "end_date", "committed_points", "completed_points", "velocity", "say_do_ratio", "status", "notes"],
    sample: [{
      project_code: "PRJ-001",
      sprint_number: 1,
      sprint_name: "Sprint 1",
      start_date: "2026-01-06",
      end_date: "2026-01-19",
      committed_points: 40,
      completed_points: 36,
      velocity: 36,
      say_do_ratio: 0.9,
      status: "Complete",
      notes: "",
    }],
  },
  {
    name: "Releases",
    headers: ["project_code", "release_name", "version", "type", "target_date", "actual_date", "scope", "status", "owner", "environment"],
    sample: [{
      project_code: "PRJ-001",
      release_name: "R1.0",
      version: "1.0.0",
      type: "Major",
      target_date: "2026-06-30",
      actual_date: "",
      scope: "MVP launch",
      status: "Planned",
      owner: "Release Mgr",
      environment: "Prod",
    }],
  },
  {
    name: "Governance",
    headers: ["forum", "cadence", "chair", "attendees", "purpose"],
    sample: [{ forum: "Portfolio Steering Co", cadence: "Monthly", chair: "CIO", attendees: "BU leads, PMO", purpose: "Approve gates, review RAG" }],
  },
  {
    name: "Demand Pipeline",
    headers: [
      "idea_code", "title", "submitter", "bu",
      "strategic_fit", "value", "risk", "effort",
      "priority_score", "status", "estimated_cost", "estimated_benefit",
      "score_formula_note",
    ],
    sample: [{
      idea_code: "IDEA-001",
      title: "Customer portal v2",
      submitter: "Sales",
      bu: "Digital",
      strategic_fit: 4,
      value: 5,
      risk: 2,
      effort: 3,
      priority_score: 78,
      status: "Under Review",
      estimated_cost: 250000,
      estimated_benefit: 600000,
      score_formula_note: "(strategic_fit×0.3 + value×0.4 − risk×0.15 − effort×0.15) × 20",
    }],
  },
];

const SHEET_ALIASES: Record<keyof FullWorkbookBundle, string[]> = {
  projects: ["projects"],
  risks: ["risks"],
  actions: ["actions"],
  decisions: ["decisions"],
  benefits: ["benefits"],
  stageGates: ["stagegates", "stage gates", "stage_gates"],
  dependencies: ["dependencies"],
  sprints: ["sprints"],
  releases: ["releases"],
  pipeline: ["demand pipeline", "demand_pipeline", "pipeline"],
};

function findSheet(wb: XLSX.WorkBook, aliases: string[]) {
  return wb.SheetNames.find((n) => aliases.includes(n.toLowerCase().trim()));
}

function sheetToRecords(wb: XLSX.WorkBook, aliases: string[]): Record<string, unknown>[] {
  const name = findSheet(wb, aliases);
  if (!name) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], { defval: null });
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (v == null || v === "") continue;
      if (v instanceof Date) {
        out[k] = v.toISOString().slice(0, 10);
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

function toSheet(rows: Record<string, unknown>[], headers?: string[]) {
  if (headers?.length) {
    return XLSX.utils.json_to_sheet(
      rows.length ? rows : [Object.fromEntries(headers.map((h) => [h, ""]))],
      { header: headers },
    );
  }
  return XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  for (const sheet of TEMPLATE_SHEETS) {
    const ws = XLSX.utils.json_to_sheet(sheet.sample, { header: sheet.headers });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, "PMO_Portfolio_Template.xlsx");
}

export async function parseWorkbook(file: File): Promise<ProjectRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "projects") || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  return rows
    .filter((r) => r.name)
    .map((r) => {
      const out: Record<string, unknown> = { name: String(r.name) };
      for (const c of PROJECT_COLUMNS) {
        const v = r[c as string];
        if (v == null || v === "") continue;
        if (["budget","capex_approved","capex_incurred","opex_approved","opex_incurred","benefits_target","benefits_realised","roi_percent"].includes(c)) {
          out[c] = Number(v) || 0;
        } else if (["start_date","end_date","target_go_live"].includes(c)) {
          const d = v instanceof Date ? v : new Date(String(v));
          if (!isNaN(d.getTime())) out[c] = d.toISOString().slice(0, 10);
        } else {
          out[c] = String(v);
        }
      }
      return out as unknown as ProjectRow;
    });
}

/** Parse all domain sheets from a Part4-style workbook. */
export async function parseFullWorkbook(file: File): Promise<FullWorkbookBundle> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "projects") || wb.SheetNames[0];
  const projectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: null });
  const projects = projectRows
    .filter((r) => r.name)
    .map((r) => {
      const out: Record<string, unknown> = { name: String(r.name) };
      for (const c of PROJECT_COLUMNS) {
        const v = r[c as string];
        if (v == null || v === "") continue;
        if (["budget","capex_approved","capex_incurred","opex_approved","opex_incurred","benefits_target","benefits_realised","roi_percent"].includes(c)) {
          out[c] = Number(v) || 0;
        } else if (["start_date","end_date","target_go_live"].includes(c)) {
          const d = v instanceof Date ? v : new Date(String(v));
          if (!isNaN(d.getTime())) out[c] = d.toISOString().slice(0, 10);
        } else {
          out[c] = String(v);
        }
      }
      return out;
    });

  return {
    projects,
    risks: sheetToRecords(wb, SHEET_ALIASES.risks),
    actions: sheetToRecords(wb, SHEET_ALIASES.actions),
    decisions: sheetToRecords(wb, SHEET_ALIASES.decisions),
    benefits: sheetToRecords(wb, SHEET_ALIASES.benefits),
    stageGates: sheetToRecords(wb, SHEET_ALIASES.stageGates),
    dependencies: sheetToRecords(wb, SHEET_ALIASES.dependencies),
    sprints: sheetToRecords(wb, SHEET_ALIASES.sprints),
    releases: sheetToRecords(wb, SHEET_ALIASES.releases),
    pipeline: sheetToRecords(wb, SHEET_ALIASES.pipeline),
  };
}

function mapProjectsForExport(projects: Record<string, unknown>[]) {
  return projects.map((p) => {
    const o: Record<string, unknown> = {};
    for (const c of PROJECT_COLUMNS) o[c] = p[c] ?? "";
    return o;
  });
}

function mapRisks(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    risk_id: r.risk_id ?? r.id ?? "",
    project_code: r.project_code ?? "",
    title: r.title ?? "",
    description: r.description ?? "",
    category: r.category ?? "",
    probability: r.probability ?? "",
    impact: r.impact ?? "",
    velocity: r.velocity ?? "",
    score: r.score ?? "",
    rag: r.rag ?? "",
    owner: r.owner ?? "",
    mitigation: r.mitigation ?? "",
    status: r.status ?? "",
    due_date: r.due_date ?? "",
    project_name: r.project_name ?? "",
  }));
}

function mapStageGates(rows: Record<string, unknown>[]) {
  return rows.map((g) => ({
    project_code: g.project_code ?? "",
    project_name: g.project_name ?? "",
    governance_channel: g.governance_channel ?? "",
    stage: g.stage ?? g.stage_name ?? "",
    next_gate: g.next_gate ?? "",
    gate_status: g.gate_status ?? g.status ?? "",
    status: g.status ?? "",
    gate_owner: g.gate_owner ?? "",
    planned_gate_date: g.planned_gate_date ?? g.planned_date ?? "",
    actual_gate_date: g.actual_gate_date ?? g.actual_date ?? "",
    gate_outcome: g.gate_outcome ?? g.outcome ?? "",
    gate_comments: g.gate_comments ?? "",
    checklist_complete_pct: g.checklist_complete_pct ?? g.checklist_pct ?? "",
    days_late: g.days_late ?? "",
  }));
}

function mapPipeline(rows: Record<string, unknown>[]) {
  return rows.map((p) => ({
    idea_code: p.idea_code ?? p.id ?? "",
    title: p.title ?? p.idea_name ?? "",
    submitter: p.submitter ?? "",
    bu: p.bu ?? "",
    strategic_fit: p.strategic_fit ?? "",
    value: p.value ?? "",
    risk: p.risk ?? "",
    effort: p.effort ?? "",
    priority_score: p.priority_score ?? p.score ?? "",
    status: p.status ?? "",
    estimated_cost: p.estimated_cost ?? p.est_budget ?? "",
    estimated_benefit: p.estimated_benefit ?? "",
    score_formula_note: p.score_formula_note ?? "(strategic_fit×0.3 + value×0.4 − risk×0.15 − effort×0.15) × 20",
  }));
}

/** Write all 14 template sheets from a DomainBundle-like object. */
export function exportFullWorkbook(bundle: Partial<DomainBundle> | FullWorkbookBundle | Record<string, unknown>) {
  const b = bundle as Partial<DomainBundle> & Partial<FullWorkbookBundle>;
  const projects = mapProjectsForExport((b.projects ?? []) as Record<string, unknown>[]);
  const risks = mapRisks((b.risks ?? []) as Record<string, unknown>[]);
  const actions = ((b.actions ?? []) as Record<string, unknown>[]).map((a) => ({
    project_code: a.project_code ?? "",
    title: a.title ?? "",
    owner: a.owner ?? "",
    due_date: a.due_date ?? "",
    status: a.status ?? "",
    priority: a.priority ?? "",
    notes: a.notes ?? "",
    project_name: a.project_name ?? "",
  }));
  const decisions = ((b.decisions ?? []) as Record<string, unknown>[]).map((d) => ({
    project_code: d.project_code ?? "",
    title: d.title ?? "",
    type: d.type ?? "",
    decision_maker: d.decision_maker ?? d.decided_by ?? "",
    due_date: d.due_date ?? d.decided_on ?? "",
    status: d.status ?? "",
    rationale: d.rationale ?? "",
    outcome: d.outcome ?? d.decision ?? "",
    priority: d.priority ?? "",
    project_name: d.project_name ?? "",
  }));
  const benefits = ((b.benefits ?? []) as Record<string, unknown>[]).map((x) => ({
    project_code: x.project_code ?? "",
    benefit: x.benefit ?? x.name ?? "",
    category: x.category ?? "",
    type: x.type ?? "",
    target_value: x.target_value ?? "",
    realised_value: x.realised_value ?? "",
    measure_date: x.measure_date ?? x.target_date ?? "",
    owner: x.owner ?? "",
    status: x.status ?? "",
    project_name: x.project_name ?? "",
  }));
  const stageGates = mapStageGates((b.stageGates ?? []) as Record<string, unknown>[]);
  const dependencies = ((b.dependencies ?? []) as Record<string, unknown>[]).map((d) => ({
    predecessor_code: d.predecessor_code ?? d.from_name ?? d.from_project_id ?? "",
    successor_code: d.successor_code ?? d.to_name ?? d.to_project_id ?? "",
    type: d.type ?? "",
    description: d.description ?? "",
    status: d.status ?? "",
    impact: d.impact ?? "",
    needed_by: d.needed_by ?? "",
  }));
  const sprints = ((b.sprints ?? []) as Record<string, unknown>[]).map((s) => ({
    project_code: s.project_code ?? "",
    sprint_number: s.sprint_number ?? "",
    sprint_name: s.sprint_name ?? "",
    start_date: s.start_date ?? "",
    end_date: s.end_date ?? "",
    committed_points: s.committed_points ?? s.planned_points ?? "",
    completed_points: s.completed_points ?? "",
    velocity: s.velocity ?? "",
    say_do_ratio: s.say_do_ratio ?? "",
    status: s.status ?? "",
    notes: s.notes ?? "",
    project_name: s.project_name ?? "",
  }));
  const releases = ((b.releases ?? []) as Record<string, unknown>[]).map((r) => ({
    project_code: r.project_code ?? "",
    release_name: r.release_name ?? "",
    version: r.version ?? "",
    type: r.type ?? "",
    target_date: r.target_date ?? r.planned_date ?? "",
    actual_date: r.actual_date ?? "",
    scope: r.scope ?? "",
    status: r.status ?? "",
    owner: r.owner ?? "",
    environment: r.environment ?? "",
    project_name: r.project_name ?? "",
  }));
  const pipeline = mapPipeline((b.pipeline ?? []) as Record<string, unknown>[]);

  const instructions = TEMPLATE_SHEETS[0].sample;
  const businessUnits: Record<string, unknown>[] = [];
  const financials: Record<string, unknown>[] = [];
  const governance: Record<string, unknown>[] = [];

  const wb = XLSX.utils.book_new();
  const sheets: [string, Record<string, unknown>[], string[]?][] = [
    ["Instructions", instructions, TEMPLATE_SHEETS[0].headers],
    ["Projects", projects, PROJECT_COLUMNS as string[]],
    ["Business Units", businessUnits, TEMPLATE_SHEETS.find((s) => s.name === "Business Units")!.headers],
    ["StageGates", stageGates, TEMPLATE_SHEETS.find((s) => s.name === "StageGates")!.headers],
    ["Risks", risks, TEMPLATE_SHEETS.find((s) => s.name === "Risks")!.headers],
    ["Actions", actions, TEMPLATE_SHEETS.find((s) => s.name === "Actions")!.headers],
    ["Decisions", decisions, TEMPLATE_SHEETS.find((s) => s.name === "Decisions")!.headers],
    ["Dependencies", dependencies, TEMPLATE_SHEETS.find((s) => s.name === "Dependencies")!.headers],
    ["Benefits", benefits, TEMPLATE_SHEETS.find((s) => s.name === "Benefits")!.headers],
    ["Financials", financials, TEMPLATE_SHEETS.find((s) => s.name === "Financials")!.headers],
    ["Sprints", sprints, TEMPLATE_SHEETS.find((s) => s.name === "Sprints")!.headers],
    ["Releases", releases, TEMPLATE_SHEETS.find((s) => s.name === "Releases")!.headers],
    ["Governance", governance, TEMPLATE_SHEETS.find((s) => s.name === "Governance")!.headers],
    ["Demand Pipeline", pipeline, TEMPLATE_SHEETS.find((s) => s.name === "Demand Pipeline")!.headers],
  ];

  for (const [name, rows, headers] of sheets) {
    XLSX.utils.book_append_sheet(wb, toSheet(rows, headers), name);
  }
  XLSX.writeFile(wb, `PMO_Full_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportProjects(projects: Record<string, unknown>[]) {
  const rows = mapProjectsForExport(projects);
  const ws = XLSX.utils.json_to_sheet(rows, { header: PROJECT_COLUMNS as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Projects");
  XLSX.writeFile(wb, `PMO_Projects_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/* ========== PPT / CSV export (was ppt-export.ts) ========== */
import { toast } from "sonner";
import { fmtMoney } from "@/lib/portfolio-engine";

/** Build a lightweight HTML→downloadable "PPT-like" briefing (HTML slides)
 *  plus a true PPTX when pptxgenjs is available. */
export async function exportPortfolioBriefing(bundle: DomainBundle) {
  try {
    const pptxgen = await import("pptxgenjs").catch(() => null);
    if (pptxgen?.default) {
      await buildPptx(pptxgen.default, bundle);
      return;
    }
  } catch {
    // fall through to HTML deck
  }
  downloadHtmlDeck(bundle);
}

async function buildPptx(
  PptxGenJS: new () => {
    author: string;
    title: string;
    addSlide: () => {
      addText: (t: string, o: Record<string, unknown>) => void;
      addShape: (t: unknown, o: Record<string, unknown>) => void;
      background: { color: string };
    };
    ShapeType: { rect: unknown };
    writeFile: (o: { fileName: string }) => Promise<void>;
  },
  bundle: DomainBundle,
) {
  const pptx = new PptxGenJS();
  pptx.author = "PMO Portfolio";
  pptx.title = "Portfolio Briefing";

  const dark = "0F172A";
  const accent = "60A5FA";
  const white = "F8FAFC";

  const slides: { title: string; lines: string[] }[] = [
    {
      title: "Executive Cockpit",
      lines: [
        `Projects: ${bundle.projects.length}`,
        `Risks (open): ${bundle.risks.filter((r) => r.status === "Open").length}`,
        `Actions overdue: ${bundle.actions.filter((a) => a.status === "Overdue").length}`,
        `Pipeline ideas: ${bundle.pipeline.length}`,
      ],
    },
    {
      title: "Financial Snapshot",
      lines: [
        `CAPEX approved: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.capex_approved || 0), 0))}`,
        `OPEX approved: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.opex_approved || 0), 0))}`,
        `Benefits target: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.benefits_target || 0), 0))}`,
        `Benefits realised: ${fmtMoney(bundle.projects.reduce((s, p) => s + Number(p.benefits_realised || 0), 0))}`,
      ],
    },
    {
      title: "Top Risks",
      lines: [...bundle.risks].sort((a, b) => b.score - a.score).slice(0, 8).map((r) => `${r.score} · ${r.title}`),
    },
    {
      title: "Decisions Awaiting",
      lines: bundle.decisions
        .filter((d) => d.status === "Open" || d.status === "In Review")
        .slice(0, 8)
        .map((d) => `${d.type}: ${d.title}`),
    },
    {
      title: "Upcoming Releases",
      lines: bundle.releases.slice(0, 8).map((r) => `${r.planned_date || "TBC"} · ${r.release_name} (${r.status})`),
    },
    {
      title: "Demand Pipeline",
      lines: [...bundle.pipeline]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((i) => `${i.score.toFixed(1)} · ${i.idea_name} (${i.status})`),
    },
    {
      title: "Governance Gates",
      lines: [
        `Total gates: ${bundle.stageGates.length}`,
        `Approved: ${bundle.stageGates.filter((g) => g.status === "Approved").length}`,
        `Pending: ${bundle.stageGates.filter((g) => g.status.includes("Pending")).length}`,
      ],
    },
    {
      title: "Agile Delivery",
      lines: [
        `Active sprints: ${bundle.sprints.filter((s) => s.status === "Active").length}`,
        `Avg velocity: ${(
          bundle.sprints.filter((s) => s.status === "Complete").reduce((a, s) => a + s.velocity, 0) /
          Math.max(1, bundle.sprints.filter((s) => s.status === "Complete").length)
        ).toFixed(1)}`,
      ],
    },
    {
      title: "Dependencies",
      lines: bundle.dependencies.slice(0, 8).map((d) => `${d.from_name} → ${d.to_name} (${d.status})`),
    },
    {
      title: "Resources",
      lines: [
        `People: ${new Set(bundle.resources.map((r) => r.resource_name)).size}`,
        `Allocations: ${bundle.resources.length}`,
        `Over-allocated: ${bundle.resources.filter((r) => r.allocation_pct > 100).length}`,
      ],
    },
    {
      title: "Portfolio Health",
      lines: [
        `Green: ${bundle.projects.filter((p) => p.rag === "Green").length}`,
        `Amber: ${bundle.projects.filter((p) => p.rag === "Amber").length}`,
        `Red: ${bundle.projects.filter((p) => p.rag === "Red").length}`,
      ],
    },
    {
      title: "Next Steps",
      lines: [
        "Review overdue actions & pending gates",
        "Re-score demand pipeline",
        "Confirm FY allocations",
        "Export board pack from Executive Reports",
      ],
    },
  ];

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: dark };
    slide.addText(s.title, { x: 0.5, y: 0.4, w: 9, h: 0.6, color: accent, fontSize: 28, bold: true });
    slide.addText(s.lines.join("\n") || "—", {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 4.5,
      color: white,
      fontSize: 16,
      valign: "top",
    });
  }

  await pptx.writeFile({ fileName: `Portfolio_Briefing_${new Date().toISOString().slice(0, 10)}.pptx` });
  toast.success("PowerPoint briefing downloaded");
}

function downloadHtmlDeck(bundle: DomainBundle) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Portfolio Briefing</title>
<style>
body{margin:0;font-family:Inter,Segoe UI,sans-serif;background:#0f172a;color:#f8fafc}
.slide{min-height:100vh;padding:48px;box-sizing:border-box;page-break-after:always;border-bottom:1px solid #334155}
h1{color:#60a5fa;font-size:32px;margin:0 0 24px}
li{margin:8px 0;font-size:18px}
@media print{.slide{min-height:auto}}
</style></head><body>
${[
  ["Executive Cockpit", `${bundle.projects.length} projects · ${bundle.risks.length} risks · ${bundle.actions.length} actions`],
  ["Top Risks", [...bundle.risks].sort((a, b) => b.score - a.score).slice(0, 10).map((r) => `${r.score} — ${r.title}`).join("</li><li>")],
  ["Pipeline", bundle.pipeline.map((p) => `${p.score} — ${p.idea_name}`).join("</li><li>")],
  ["Releases", bundle.releases.map((r) => `${r.planned_date || "TBC"} — ${r.release_name}`).join("</li><li>")],
]
  .map(
    ([t, body]) =>
      `<section class="slide"><h1>${t}</h1><ul><li>${body || "—"}</li></ul></section>`,
  )
  .join("")}
</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Portfolio_Briefing_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Briefing deck downloaded (open in browser → Print to PDF/PPT)");
}

export function exportPageCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.error("No rows to export");
    return;
  }
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

