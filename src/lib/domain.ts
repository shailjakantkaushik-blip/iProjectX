/**
 * Domain entities for PMO Spec §3 / Part4.
 * Fetches from Supabase when tables exist; otherwise derives rich sample
 * data from the projects table so every page works before migration apply.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { matchesFyFilter, useFyFilter } from "@/lib/fy-filter";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"] & {
  delivery_lead?: string | null;
  portfolio_category?: string | null;
  governance_channel?: string | null;
  progress_pct?: number | null;
  forecast_at_completion?: number | null;
  approved_funding?: number | null;
  fy_span?: string[] | null;
  theme?: string | null;
  investment_type?: string | null;
  funding_type?: string | null;
};

export type Risk = {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  description?: string | null;
  probability: number;
  impact: number;
  velocity: number;
  score: number;
  owner?: string | null;
  mitigation?: string | null;
  status: string;
  due_date?: string | null;
  project_name?: string;
};

export type ActionItem = {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  owner?: string | null;
  due_date?: string | null;
  status: string;
  priority: string;
  notes?: string | null;
  project_name?: string;
};

export type Decision = {
  id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  type: string;
  decision_maker?: string | null;
  due_date?: string | null;
  status: string;
  rationale?: string | null;
  outcome?: string | null;
  priority?: string | null;
  project_name?: string;
};

export type Benefit = {
  id: string;
  org_id: string;
  project_id: string | null;
  name: string;
  category?: string | null;
  type: string;
  target_value: number;
  realised_value: number;
  target_date?: string | null;
  status: string;
  owner?: string | null;
  project_name?: string;
};

export type StageGate = {
  id: string;
  org_id: string;
  project_id: string;
  stage_name: string;
  gate_owner?: string | null;
  planned_date?: string | null;
  actual_date?: string | null;
  status: string;
  outcome?: string | null;
  checklist_pct: number;
  next_gate?: string | null;
  project_name?: string;
  governance_channel?: string;
};

export type Dependency = {
  id: string;
  org_id: string;
  from_project_id: string;
  to_project_id: string;
  type: string;
  description?: string | null;
  status: string;
  impact?: string | null;
  needed_by?: string | null;
  from_name?: string;
  to_name?: string;
};

export type Release = {
  id: string;
  org_id: string;
  project_id: string | null;
  release_name: string;
  version?: string | null;
  type: string;
  planned_date?: string | null;
  actual_date?: string | null;
  scope?: string | null;
  status: string;
  owner?: string | null;
  environment?: string | null;
  project_name?: string;
};

export type Sprint = {
  id: string;
  org_id: string;
  project_id: string;
  sprint_number: number;
  sprint_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  planned_points: number;
  completed_points: number;
  velocity: number;
  say_do_ratio: number;
  status: string;
  project_name?: string;
};

export type PipelineIdea = {
  id: string;
  org_id: string;
  idea_name: string;
  submitter?: string | null;
  strategic_fit: number;
  value: number;
  risk: number;
  effort: number;
  score: number;
  status: string;
  est_budget: number;
};

export type ResourceAllocation = {
  id: string;
  org_id: string;
  project_id?: string | null;
  resource_name: string;
  skill?: string | null;
  role?: string | null;
  month: string;
  allocation_pct: number;
  capacity_pct: number;
  project_name?: string;
};

export type ActivityLog = {
  id: string;
  org_id: string;
  project_id?: string | null;
  entity_type: string;
  action: string;
  title: string;
  details?: string | null;
  actor_name?: string | null;
  impact?: string | null;
  created_at: string;
  project_name?: string;
};

export type DomainBundle = {
  projects: Project[];
  risks: Risk[];
  actions: ActionItem[];
  decisions: Decision[];
  benefits: Benefit[];
  stageGates: StageGate[];
  dependencies: Dependency[];
  releases: Release[];
  sprints: Sprint[];
  pipeline: PipelineIdea[];
  resources: ResourceAllocation[];
  activity: ActivityLog[];
  fromDb: boolean;
};

const CHANNEL_A = ["Discovery", "Business Case/Full Funding", "Design", "Build", "Testing", "Deployment", "Handover"];
const CHANNEL_B = ["Discovery", "Business Case/Seed Funding", "Design", "Business Case/Full Funding", "Build", "Testing", "Deployment", "Handover"];

export function scorePipeline(s: number, v: number, r: number, e: number) {
  return Math.round((s * 0.3 + v * 0.4 - r * 0.15 - e * 0.15) * 20 * 10) / 10;
}

export function riskBand(score: number): "Red" | "Amber" | "Green" {
  if (score >= 50) return "Red";
  if (score >= 25) return "Amber";
  return "Green";
}

function deriveChannel(p: Project): string {
  if (p.governance_channel) return p.governance_channel.startsWith("Channel A") ? "Channel A" : "Channel B";
  const funding = Number(p.approved_funding || p.capex_approved || p.budget || 0);
  return funding > 0 && funding <= 200_000 ? "Channel A" : "Channel B";
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Build rich demo domain rows from projects when DB tables are empty/missing. */
export function deriveDomainFromProjects(projects: Project[], orgId: string): DomainBundle {
  const risks: Risk[] = [];
  const actions: ActionItem[] = [];
  const decisions: Decision[] = [];
  const benefits: Benefit[] = [];
  const stageGates: StageGate[] = [];
  const dependencies: Dependency[] = [];
  const releases: Release[] = [];
  const sprints: Sprint[] = [];
  const resources: ResourceAllocation[] = [];
  const activity: ActivityLog[] = [];

  const people = ["A. Chen", "B. Patel", "C. Ng", "D. Rivera", "E. Kim", "F. Rossi"];
  const skills = ["PM", "BA", "Dev", "QA", "Architect", "Change"];

  projects.forEach((p, idx) => {
    const h = hash(p.id || p.project_code || p.name);
    const channel = deriveChannel(p);
    const stages = channel === "Channel A" ? CHANNEL_A : CHANNEL_B;
    const phaseIdx = Math.max(0, stages.findIndex((s) => s.toLowerCase().includes((p.current_phase || "build").toLowerCase().slice(0, 4))));
    const curIdx = phaseIdx >= 0 ? phaseIdx : Math.min(3, stages.length - 1);

    stages.forEach((stage, si) => {
      const planned = p.start_date
        ? new Date(new Date(p.start_date).getTime() + si * 45 * 86400000).toISOString().slice(0, 10)
        : null;
      let status = "Not Started";
      if (si < curIdx) status = "Approved";
      else if (si === curIdx) status = p.rag === "Red" ? "Pending Approval" : "In Progress";
      stageGates.push({
        id: `sg-${p.id}-${si}`,
        org_id: orgId,
        project_id: p.id,
        stage_name: stage,
        gate_owner: p.sponsor || "PMO",
        planned_date: planned,
        actual_date: si < curIdx ? planned : null,
        status,
        outcome: si < curIdx ? "Proceed" : null,
        checklist_pct: si < curIdx ? 100 : si === curIdx ? 55 + (h % 40) : 0,
        next_gate: stages[si + 1] || null,
        project_name: p.name,
        governance_channel: channel,
      });
    });

    // Risks for amber/red + a few greens
    const riskCount = p.rag === "Red" ? 3 : p.rag === "Amber" ? 2 : idx % 3 === 0 ? 1 : 0;
    for (let i = 0; i < riskCount; i++) {
      const probability = p.rag === "Red" ? 4 + (i % 2) : 2 + (h % 3);
      const impact = p.rag === "Red" ? 4 : 2 + ((h + i) % 3);
      const velocity = 2 + ((h + i * 3) % 3);
      const score = probability * impact * velocity;
      const due = new Date();
      due.setDate(due.getDate() + (i === 0 && p.rag !== "Green" ? -5 : 14 + i * 7));
      risks.push({
        id: `rk-${p.id}-${i}`,
        org_id: orgId,
        project_id: p.id,
        title: i === 0 ? `${p.name}: delivery slippage` : `${p.name}: dependency risk ${i}`,
        description: `Risk against ${p.current_phase || "delivery"} phase`,
        probability: Math.min(5, probability),
        impact: Math.min(5, impact),
        velocity: Math.min(5, velocity),
        score,
        owner: people[(h + i) % people.length],
        mitigation: "Weekly mitigation review + contingency buffer",
        status: i === 0 && score >= 40 ? "Open" : i === 1 ? "Mitigated" : "Open",
        due_date: due.toISOString().slice(0, 10),
        project_name: p.name,
      });
    }

    if (p.rag !== "Green" || idx % 2 === 0) {
      const overdue = p.rag === "Red" || (p.rag === "Amber" && idx % 2 === 0);
      const due = new Date();
      due.setDate(due.getDate() + (overdue ? -3 - (idx % 10) : 10 + (idx % 20)));
      actions.push({
        id: `ac-${p.id}`,
        org_id: orgId,
        project_id: p.id,
        title: `Follow up: ${p.name} ${p.current_phase || "progress"}`,
        owner: people[h % people.length],
        due_date: due.toISOString().slice(0, 10),
        status: overdue ? "Overdue" : idx % 5 === 0 ? "Complete" : "Open",
        priority: p.priority || "Medium",
        notes: "",
        project_name: p.name,
      });
    }

    if (idx % 2 === 0 || p.rag === "Red") {
      decisions.push({
        id: `dc-${p.id}`,
        org_id: orgId,
        project_id: p.id,
        title: `Funding / scope decision — ${p.name}`,
        type: idx % 3 === 0 ? "Funding" : idx % 3 === 1 ? "SteerCo" : "Architecture",
        decision_maker: p.sponsor || "SteerCo",
        due_date: new Date(Date.now() + (idx % 4 === 0 ? -2 : 12) * 86400000).toISOString().slice(0, 10),
        status: idx % 4 === 0 ? "Open" : idx % 4 === 1 ? "In Review" : "Approved",
        rationale: "Required for next gate",
        priority: p.priority || "Medium",
        project_name: p.name,
      });
    }

    if (Number(p.benefits_target || 0) > 0) {
      benefits.push({
        id: `bf-${p.id}`,
        org_id: orgId,
        project_id: p.id,
        name: `${p.name} benefit realisation`,
        category: idx % 2 === 0 ? "Cost Savings" : "Productivity",
        type: "Financial",
        target_value: Number(p.benefits_target || 0),
        realised_value: Number(p.benefits_realised || 0),
        target_date: p.end_date,
        status: Number(p.benefits_realised || 0) > 0 ? "In Progress" : "Planned",
        owner: p.sponsor || "Sponsor",
        project_name: p.name,
      });
    }

    if (p.target_go_live || p.end_date) {
      releases.push({
        id: `rl-${p.id}`,
        org_id: orgId,
        project_id: p.id,
        release_name: `${p.project_code || "REL"}-1.0`,
        version: "1.0",
        type: "Major",
        planned_date: p.target_go_live || p.end_date,
        actual_date: p.status === "Completed" || p.status === "Complete" ? p.end_date : null,
        scope: p.description || "MVP release",
        status: p.status === "Completed" || p.status === "Complete" ? "Delivered" : "Planned",
        owner: p.delivery_lead || p.sponsor || "PM",
        environment: "Production",
        project_name: p.name,
      });
    }

    if (p.delivery_method === "Agile" || p.delivery_method === "Hybrid") {
      for (let s = 1; s <= 4; s++) {
        const start = p.start_date
          ? new Date(new Date(p.start_date).getTime() + (s - 1) * 14 * 86400000)
          : new Date();
        const end = new Date(start.getTime() + 13 * 86400000);
        const planned = 30 + ((h + s) % 20);
        const completed = Math.round(planned * (0.7 + ((h + s) % 30) / 100));
        sprints.push({
          id: `sp-${p.id}-${s}`,
          org_id: orgId,
          project_id: p.id,
          sprint_number: s,
          sprint_name: `Sprint ${s}`,
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          planned_points: planned,
          completed_points: completed,
          velocity: completed,
          say_do_ratio: planned ? completed / planned : 0,
          status: s <= 2 ? "Complete" : s === 3 ? "Active" : "Planned",
          project_name: p.name,
        });
      }
    }

    // Resources: 2 people per project across 3 months
    for (let m = 0; m < 3; m++) {
      const month = new Date();
      month.setDate(1);
      month.setMonth(month.getMonth() + m);
      const person = people[(h + m) % people.length];
      resources.push({
        id: `rs-${p.id}-${m}`,
        org_id: orgId,
        project_id: p.id,
        resource_name: person,
        skill: skills[(h + m) % skills.length],
        role: skills[(h + m) % skills.length],
        month: month.toISOString().slice(0, 10),
        allocation_pct: 40 + ((h + m * 7) % 80),
        capacity_pct: 100,
        project_name: p.name,
      });
    }

    activity.push({
      id: `al-${p.id}`,
      org_id: orgId,
      project_id: p.id,
      entity_type: "project",
      action: "update",
      title: `${p.name} RAG → ${p.rag}`,
      details: `Phase ${p.current_phase || "—"} · ${p.status}`,
      actor_name: p.sponsor || "PMO",
      impact: p.rag === "Red" ? "High" : p.rag === "Amber" ? "Medium" : "Info",
      created_at: new Date(Date.now() - idx * 3600000 * 6).toISOString(),
      project_name: p.name,
    });
  });

  // Dependencies: chain projects sharing a program
  for (let i = 0; i < projects.length - 1; i++) {
    const a = projects[i];
    const b = projects[i + 1];
    if (a.program && a.program === b.program) {
      dependencies.push({
        id: `dp-${a.id}-${b.id}`,
        org_id: orgId,
        from_project_id: a.id,
        to_project_id: b.id,
        type: "Finish-Start",
        description: `${a.name} unlocks ${b.name}`,
        status: a.rag === "Red" ? "Blocked" : a.rag === "Amber" ? "At Risk" : "Healthy",
        impact: a.rag === "Red" ? "High" : "Med",
        needed_by: a.end_date,
        from_name: a.name,
        to_name: b.name,
      });
    }
  }

  const pipeline: PipelineIdea[] = [
    { id: "pl-1", org_id: orgId, idea_name: "Customer Self-Serve Billing", submitter: "CFO", strategic_fit: 5, value: 4, risk: 2, effort: 3, score: scorePipeline(5, 4, 2, 3), status: "Under Review", est_budget: 180000 },
    { id: "pl-2", org_id: orgId, idea_name: "Store IoT Sensors", submitter: "COO", strategic_fit: 3, value: 4, risk: 3, effort: 4, score: scorePipeline(3, 4, 3, 4), status: "New", est_budget: 420000 },
    { id: "pl-3", org_id: orgId, idea_name: "GenAI Knowledge Desk", submitter: "CHRO", strategic_fit: 4, value: 5, risk: 2, effort: 2, score: scorePipeline(4, 5, 2, 2), status: "Approved", est_budget: 95000 },
    { id: "pl-4", org_id: orgId, idea_name: "Legacy Mainframe Exit", submitter: "CTO", strategic_fit: 5, value: 3, risk: 5, effort: 5, score: scorePipeline(5, 3, 5, 5), status: "Parked", est_budget: 2500000 },
    { id: "pl-5", org_id: orgId, idea_name: "Vendor Risk Scoring", submitter: "CPO", strategic_fit: 4, value: 3, risk: 2, effort: 2, score: scorePipeline(4, 3, 2, 2), status: "Rejected", est_budget: 110000 },
  ];

  return {
    projects,
    risks,
    actions,
    decisions,
    benefits,
    stageGates,
    dependencies,
    releases,
    sprints,
    pipeline,
    resources,
    activity,
    fromDb: false,
  };
}

async function trySelect<T>(table: string): Promise<T[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).select("*");
    if (error) return null;
    return (data ?? []) as T[];
  } catch {
    return null;
  }
}

export async function fetchDomainBundle(orgId: string): Promise<DomainBundle> {
  const { data: projects, error } = await supabase.from("projects").select("*");
  if (error) throw error;
  const list = (projects ?? []) as Project[];

  const [risks, actions, decisions, benefits, stageGates, dependencies, releases, sprints, pipeline, resources, activity] =
    await Promise.all([
      trySelect<Risk>("risks"),
      trySelect<ActionItem>("actions"),
      trySelect<Decision>("decisions"),
      trySelect<Benefit>("benefits"),
      trySelect<StageGate>("stage_gates"),
      trySelect<Dependency>("dependencies"),
      trySelect<Release>("releases"),
      trySelect<Sprint>("sprints"),
      trySelect<PipelineIdea>("demand_pipeline"),
      trySelect<ResourceAllocation>("resource_allocations"),
      trySelect<ActivityLog>("activity_log"),
    ]);

  const dbReady =
    risks !== null &&
    actions !== null &&
    decisions !== null &&
    (risks.length > 0 || actions.length > 0 || stageGates === null || (stageGates?.length ?? 0) > 0);

  // Prefer DB when domain tables exist AND have data; else derive
  if (risks && risks.length > 0) {
    const byId = new Map(list.map((p) => [p.id, p]));
    const enrich = <T extends { project_id?: string | null }>(rows: T[], nameKey = "project_name") =>
      rows.map((r) => ({
        ...r,
        [nameKey]: r.project_id ? byId.get(r.project_id)?.name : undefined,
      }));

    return {
      projects: list,
      risks: enrich(risks) as Risk[],
      actions: enrich(actions ?? []) as ActionItem[],
      decisions: enrich(decisions ?? []) as Decision[],
      benefits: enrich(benefits ?? []) as Benefit[],
      stageGates: enrich(stageGates ?? []) as StageGate[],
      dependencies: (dependencies ?? []).map((d) => ({
        ...d,
        from_name: byId.get(d.from_project_id)?.name,
        to_name: byId.get(d.to_project_id)?.name,
      })),
      releases: enrich(releases ?? []) as Release[],
      sprints: enrich(sprints ?? []) as Sprint[],
      pipeline: pipeline ?? [],
      resources: enrich(resources ?? []) as ResourceAllocation[],
      activity: enrich(activity ?? []) as ActivityLog[],
      fromDb: true,
    };
  }

  void dbReady;
  return deriveDomainFromProjects(list, orgId);
}

export function useDomainData(orgId: string | null | undefined) {
  const [fys] = useFyFilter();
  const query = useQuery({
    queryKey: ["domain-bundle", orgId],
    queryFn: () => fetchDomainBundle(orgId!),
    enabled: !!orgId,
  });

  const filteredProjects = (query.data?.projects ?? []).filter((p) => matchesFyFilter(p, fys));
  const projectIds = new Set(filteredProjects.map((p) => p.id));

  const filterByProject = <T extends { project_id?: string | null }>(rows: T[]) =>
    fys.length === 0 ? rows : rows.filter((r) => !r.project_id || projectIds.has(r.project_id));

  return {
    ...query,
    fys,
    projects: filteredProjects,
    risks: filterByProject(query.data?.risks ?? []),
    actions: filterByProject(query.data?.actions ?? []),
    decisions: filterByProject(query.data?.decisions ?? []),
    benefits: filterByProject(query.data?.benefits ?? []),
    stageGates: filterByProject(query.data?.stageGates ?? []),
    dependencies: (query.data?.dependencies ?? []).filter(
      (d) => fys.length === 0 || projectIds.has(d.from_project_id) || projectIds.has(d.to_project_id),
    ),
    releases: filterByProject(query.data?.releases ?? []),
    sprints: filterByProject(query.data?.sprints ?? []),
    pipeline: query.data?.pipeline ?? [],
    resources: filterByProject(query.data?.resources ?? []),
    activity: filterByProject(query.data?.activity ?? []),
    fromDb: query.data?.fromDb ?? false,
    allProjects: query.data?.projects ?? [],
  };
}

export const CHANNEL_A_STAGES = CHANNEL_A;
export const CHANNEL_B_STAGES = CHANNEL_B;
