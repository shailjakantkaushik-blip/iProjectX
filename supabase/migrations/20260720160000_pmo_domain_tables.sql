-- PMO Spec §3: remaining domain tables + project column expansions + activity_log
-- Keeps existing app_role values (admin/pm/executive) for backward compatibility;
-- aliases platform_admin→admin, project_manager→pm, executive_viewer→executive at the app layer.

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.governance_channel AS ENUM ('Channel A', 'Channel B');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Planning';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Complete';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============ PROJECT COLUMNS (Part4 alignment) ============
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS delivery_lead TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_category TEXT,
  ADD COLUMN IF NOT EXISTS governance_channel TEXT,
  ADD COLUMN IF NOT EXISTS progress_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forecast_at_completion NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_funding NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fy_span TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS investment_type TEXT,
  ADD COLUMN IF NOT EXISTS funding_type TEXT,
  ADD COLUMN IF NOT EXISTS contingency NUMERIC(14,2) DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

ALTER TABLE public.business_units
  ADD COLUMN IF NOT EXISTS head_name TEXT,
  ADD COLUMN IF NOT EXISTS budget_cap NUMERIC(14,2) DEFAULT 0;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS fy_start_month INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============ GOVERNANCE CHANNELS ============
CREATE TABLE IF NOT EXISTS public.governance_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  stage_order INT[] NOT NULL DEFAULT '{}',
  stage_names TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.governance_channels TO authenticated;
GRANT ALL ON public.governance_channels TO service_role;
ALTER TABLE public.governance_channels ENABLE ROW LEVEL SECURITY;

-- ============ STAGE GATES ============
CREATE TABLE IF NOT EXISTS public.stage_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  gate_owner TEXT,
  planned_date DATE,
  actual_date DATE,
  status TEXT DEFAULT 'Not Started',
  outcome TEXT,
  checklist_pct NUMERIC(5,2) DEFAULT 0,
  next_gate TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_gates TO authenticated;
GRANT ALL ON public.stage_gates TO service_role;
ALTER TABLE public.stage_gates ENABLE ROW LEVEL SECURITY;

-- ============ RISKS ============
CREATE TABLE IF NOT EXISTS public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  probability INT NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
  impact INT NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  velocity INT NOT NULL DEFAULT 3 CHECK (velocity BETWEEN 1 AND 5),
  score INT GENERATED ALWAYS AS (probability * impact * velocity) STORED,
  owner TEXT,
  mitigation TEXT,
  status TEXT DEFAULT 'Open',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

-- ============ ACTIONS ============
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner TEXT,
  due_date DATE,
  status TEXT DEFAULT 'Open',
  priority TEXT DEFAULT 'Medium',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO authenticated;
GRANT ALL ON public.actions TO service_role;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- ============ DECISIONS ============
CREATE TABLE IF NOT EXISTS public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'Project',
  decision_maker TEXT,
  due_date DATE,
  status TEXT DEFAULT 'Open',
  rationale TEXT,
  outcome TEXT,
  priority TEXT DEFAULT 'Medium',
  approval_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated;
GRANT ALL ON public.decisions TO service_role;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- ============ BENEFITS ============
CREATE TABLE IF NOT EXISTS public.benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  type TEXT DEFAULT 'Financial',
  target_value NUMERIC(14,2) DEFAULT 0,
  realised_value NUMERIC(14,2) DEFAULT 0,
  target_date DATE,
  status TEXT DEFAULT 'Planned',
  owner TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits TO authenticated;
GRANT ALL ON public.benefits TO service_role;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;

-- ============ SPRINTS ============
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sprint_number INT NOT NULL DEFAULT 1,
  sprint_name TEXT,
  start_date DATE,
  end_date DATE,
  planned_points NUMERIC(8,2) DEFAULT 0,
  completed_points NUMERIC(8,2) DEFAULT 0,
  velocity NUMERIC(8,2) DEFAULT 0,
  say_do_ratio NUMERIC(8,4) DEFAULT 0,
  status TEXT DEFAULT 'Planned',
  team TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- ============ DEPENDENCIES ============
CREATE TABLE IF NOT EXISTS public.dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  to_project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'Finish-Start',
  description TEXT,
  status TEXT DEFAULT 'Healthy',
  impact TEXT DEFAULT 'Med',
  needed_by DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependencies TO authenticated;
GRANT ALL ON public.dependencies TO service_role;
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;

-- ============ RELEASES ============
CREATE TABLE IF NOT EXISTS public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  release_name TEXT NOT NULL,
  version TEXT,
  type TEXT DEFAULT 'Minor',
  planned_date DATE,
  actual_date DATE,
  scope TEXT,
  status TEXT DEFAULT 'Planned',
  owner TEXT,
  environment TEXT DEFAULT 'Production',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

-- ============ DEMAND PIPELINE ============
CREATE TABLE IF NOT EXISTS public.demand_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bu_id UUID REFERENCES public.business_units(id) ON DELETE SET NULL,
  idea_name TEXT NOT NULL,
  submitter TEXT,
  strategic_fit INT NOT NULL DEFAULT 3 CHECK (strategic_fit BETWEEN 1 AND 5),
  value INT NOT NULL DEFAULT 3 CHECK (value BETWEEN 1 AND 5),
  risk INT NOT NULL DEFAULT 3 CHECK (risk BETWEEN 1 AND 5),
  effort INT NOT NULL DEFAULT 3 CHECK (effort BETWEEN 1 AND 5),
  score NUMERIC(8,2) GENERATED ALWAYS AS (
    (strategic_fit * 0.30 + value * 0.40 - risk * 0.15 - effort * 0.15) * 20
  ) STORED,
  status TEXT DEFAULT 'New',
  est_budget NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_pipeline TO authenticated;
GRANT ALL ON public.demand_pipeline TO service_role;
ALTER TABLE public.demand_pipeline ENABLE ROW LEVEL SECURITY;

-- ============ RESOURCES (person × month) ============
CREATE TABLE IF NOT EXISTS public.resource_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  skill TEXT,
  role TEXT,
  month DATE NOT NULL,
  allocation_pct NUMERIC(6,2) DEFAULT 100,
  capacity_pct NUMERIC(6,2) DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_allocations TO authenticated;
GRANT ALL ON public.resource_allocations TO service_role;
ALTER TABLE public.resource_allocations ENABLE ROW LEVEL SECURITY;

-- ============ ACTIVITY LOG / LATEST UPDATES ============
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL DEFAULT 'update',
  title TEXT NOT NULL,
  details TEXT,
  actor_name TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  impact TEXT DEFAULT 'Info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============ CONFIG (dropdown values) ============
CREATE TABLE IF NOT EXISTS public.config_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  UNIQUE (org_id, category, value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_values TO authenticated;
GRANT ALL ON public.config_values TO service_role;
ALTER TABLE public.config_values ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.config_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE (org_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_rules TO authenticated;
GRANT ALL ON public.config_rules TO service_role;
ALTER TABLE public.config_rules ENABLE ROW LEVEL SECURITY;

-- ============ PORTFOLIO MOVEMENTS ============
CREATE TABLE IF NOT EXISTS public.portfolio_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT,
  from_category TEXT,
  to_category TEXT,
  moved_by TEXT,
  moved_on DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_movements TO authenticated;
GRANT ALL ON public.portfolio_movements TO service_role;
ALTER TABLE public.portfolio_movements ENABLE ROW LEVEL SECURITY;

-- ============ FY ALLOCATION ============
CREATE TABLE IF NOT EXISTS public.fy_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  fy TEXT NOT NULL,
  budget_pct NUMERIC(6,2) DEFAULT 0,
  forecast_pct NUMERIC(6,2) DEFAULT 0,
  budget_amount NUMERIC(14,2) DEFAULT 0,
  forecast_amount NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  UNIQUE (project_id, fy)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fy_allocations TO authenticated;
GRANT ALL ON public.fy_allocations TO service_role;
ALTER TABLE public.fy_allocations ENABLE ROW LEVEL SECURITY;

-- ============ RLS: org-scoped read/write for all new tables ============
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'governance_channels','stage_gates','risks','actions','decisions','benefits',
    'sprints','dependencies','releases','demand_pipeline','resource_allocations',
    'activity_log','config_values','config_rules','portfolio_movements','fy_allocations'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_read_org', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_write_org', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (org_id = public.get_user_org(auth.uid()))',
      t||'_read_org', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (org_id = public.get_user_org(auth.uid()) AND (
           public.has_any_admin(auth.uid())
           OR public.has_role(auth.uid(), ''bu_lead'')
           OR public.has_role(auth.uid(), ''pm'')
         ))
         WITH CHECK (org_id = public.get_user_org(auth.uid()))',
      t||'_write_org', t
    );
  END LOOP;
END $$;

-- Executive / all authenticated can insert activity_log
DROP POLICY IF EXISTS activity_log_insert_any ON public.activity_log;
CREATE POLICY activity_log_insert_any ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.get_user_org(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_stage_gates_updated BEFORE UPDATE ON public.stage_gates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_actions_updated BEFORE UPDATE ON public.actions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_decisions_updated BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_benefits_updated BEFORE UPDATE ON public.benefits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_sprints_updated BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_dependencies_updated BEFORE UPDATE ON public.dependencies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_releases_updated BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_demand_pipeline_updated BEFORE UPDATE ON public.demand_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
