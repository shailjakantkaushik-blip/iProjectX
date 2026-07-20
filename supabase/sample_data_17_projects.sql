-- ============================================================================
-- iProjectX — Sample data (17 projects)
-- Copy, paste, and run in Supabase SQL Editor AFTER or AFTER schema.sql
-- Prerequisite: run schema.sql first
-- ============================================================================
-- Demo logins (password for both: demo1234)
--   demo@iprojectx.com  → org owner + platform admin
--   exec@iprojectx.com  → executive (read-only)
-- ============================================================================

begin;

-- Stable IDs for idempotent re-runs
-- org:     org_acme_demo
-- users:   11111111-...1111 (owner), 22222222-...2222 (exec)
-- programs: prog_01 .. prog_04
-- projects: prj_01 .. prj_17

-- Clean prior sample tenant (safe re-run)
delete from "ImportJob" where "organizationId" = 'org_acme_demo';
delete from "Update" where "organizationId" = 'org_acme_demo';
delete from "Release" where "organizationId" = 'org_acme_demo';
delete from "Sprint" where "organizationId" = 'org_acme_demo';
delete from "Resource" where "organizationId" = 'org_acme_demo';
delete from "PipelineItem" where "organizationId" = 'org_acme_demo';
delete from "Action" where "organizationId" = 'org_acme_demo';
delete from "Decision" where "organizationId" = 'org_acme_demo';
delete from "Risk" where "organizationId" = 'org_acme_demo';
delete from "FinancialMonth" where "projectId" like 'prj_%';
delete from "Milestone" where "projectId" like 'prj_%';
delete from "StageGate" where "projectId" like 'prj_%';
delete from "ProjectBrief" where "projectId" like 'prj_%';
delete from "Project" where "organizationId" = 'org_acme_demo';
delete from "Program" where "organizationId" = 'org_acme_demo';
delete from "Invitation" where "organizationId" = 'org_acme_demo';
delete from "Membership" where "organizationId" = 'org_acme_demo';
delete from "Organization" where id = 'org_acme_demo';
delete from "User"
where id in (
  'user_demo_owner',
  'user_demo_exec',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
)
or email in ('demo@iprojectx.com', 'exec@iprojectx.com');

delete from auth.identities
where user_id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid
);

delete from auth.users
where id in (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid
)
or email in ('demo@iprojectx.com', 'exec@iprojectx.com');

-- Plans (schema already seeds these; keep upsert-safe)
insert into "Plan" (id, slug, name, description, "monthlyPrice", "annualPrice", "seatLimit", "projectLimit", features, "isEnterprise", "sortOrder")
values
  ('plan_starter', 'starter', 'Starter', 'For small PMO teams getting portfolio visibility.', 4900, 49000, 10, 25,
   '["Executive dashboard","Projects & programs","Risk & RAID tracking","Demand pipeline","Basic reporting","Email support"]', false, 1),
  ('plan_pro', 'professional', 'Professional', 'Full delivery control for growing enterprises.', 14900, 149000, 50, 200,
   '["Everything in Starter","Stage-gate governance","EVM financials","Resource capacity","Agile & releases","White-label branding","Priority support"]', false, 2),
  ('plan_ent', 'enterprise', 'Enterprise', 'Unlimited scale with SSO-ready white-label delivery.', 39900, 399000, 500, 5000,
   '["Everything in Professional","Custom domain","Hide powered-by","Advanced seats","Dedicated success","SSO ready","Audit exports"]', true, 3)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  "monthlyPrice" = excluded."monthlyPrice",
  "annualPrice" = excluded."annualPrice",
  "seatLimit" = excluded."seatLimit",
  "projectLimit" = excluded."projectLimit",
  features = excluded.features,
  "isEnterprise" = excluded."isEnterprise",
  "sortOrder" = excluded."sortOrder";

-- Site config
insert into "SiteConfig" (
  id, "brandName", "heroTitle", "heroSubtitle", "heroCtaLabel", "heroCtaHref",
  "secondaryCtaLabel", "secondaryCtaHref", "primaryColor", "accentColor", "secondaryColor",
  "footerText", "showPricing", "showSignup", "enableExcelImport", "enablePptExport", "enablePdfExport",
  "featureCardsJson"
) values (
  'default',
  'iProjectX',
  'The enterprise platform for portfolio, delivery, and outcomes.',
  'Multi-tenant SaaS for PMO teams — seat billing, white-label workspaces, Excel import, and executive packs.',
  'Start 14-day trial',
  '/signup',
  'View plans',
  '/pricing',
  '#0F766E',
  '#0284C7',
  '#134E4A',
  'Enterprise project management & delivery',
  true, true, true, true, true,
  '[{"title":"Executive cockpit","body":"Live RAG, funding burn, and portfolio health."},{"title":"Stage-gate delivery","body":"Channel A/B governance and release readiness."},{"title":"Financial intelligence","body":"CAPEX/OPEX, forecast, and benefits tracking."},{"title":"Excel + exports","body":"Template import and PPT/PDF steering packs."},{"title":"White-label","body":"Brand each enterprise workspace."},{"title":"Team delivery","body":"Resources, pipeline, decisions, and actions."}]'
)
on conflict (id) do update set
  "brandName" = excluded."brandName",
  "heroTitle" = excluded."heroTitle",
  "heroSubtitle" = excluded."heroSubtitle",
  "featureCardsJson" = excluded."featureCardsJson",
  "enableExcelImport" = true,
  "enablePptExport" = true,
  "enablePdfExport" = true,
  "updatedAt" = now();

-- Supabase Auth users (password: demo1234)
-- Use a precomputed bcrypt ($2a$ cost 10). Raw crypt()/gen_salt often fails GoTrue checks.
-- If login still fails later, run fix_demo_password.sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'demo@iprojectx.com',
  '$2a$10$QnSkGSgN8anboiDyJ7rFCO1nQsM7rtPfyJ1Q4EpKH4yA7HIZDm60O',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Alex Morgan"}',
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'exec@iprojectx.com',
  '$2a$10$QnSkGSgN8anboiDyJ7rFCO1nQsM7rtPfyJ1Q4EpKH4yA7HIZDm60O',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Jordan Lee"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values
(
  gen_random_uuid(),
  '11111111-1111-4111-8111-111111111111',
  jsonb_build_object('sub', '11111111-1111-4111-8111-111111111111', 'email', 'demo@iprojectx.com'),
  'email',
  '11111111-1111-4111-8111-111111111111',
  now(), now(), now()
),
(
  gen_random_uuid(),
  '22222222-2222-4222-8222-222222222222',
  jsonb_build_object('sub', '22222222-2222-4222-8222-222222222222', 'email', 'exec@iprojectx.com'),
  'email',
  '22222222-2222-4222-8222-222222222222',
  now(), now(), now()
);

-- App profile rows (same ids as auth.users)
insert into "User" (id, email, name, "authUserId", "passwordHash", "isPlatformAdmin")
values
  ('11111111-1111-4111-8111-111111111111', 'demo@iprojectx.com', 'Alex Morgan',
   '11111111-1111-4111-8111-111111111111', null, true),
  ('22222222-2222-4222-8222-222222222222', 'exec@iprojectx.com', 'Jordan Lee',
   '22222222-2222-4222-8222-222222222222', null, false);

-- Organization
insert into "Organization" (
  id, name, slug, "planId", "billingEmail", "seatCount", "subscriptionStatus",
  "brandName", "primaryColor", "accentColor", "secondaryColor",
  "loginTagline", "supportEmail", "hidePoweredBy",
  "enableExcelImport", "enablePptExport", "enablePdfExport"
) values (
  'org_acme_demo', 'Acme Digital', 'acme-digital', 'plan_pro', 'demo@iprojectx.com', 25, 'active',
  'Acme Delivery Hub', '#0F766E', '#0284C7', '#115E59',
  'One platform for portfolio, delivery, and outcomes', 'pmo@acme.example', false,
  true, true, true
);

insert into "Membership" (id, "organizationId", "userId", role)
values
  ('mem_owner', 'org_acme_demo', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('mem_exec', 'org_acme_demo', '22222222-2222-4222-8222-222222222222', 'executive');

-- Programs
insert into "Program" (id, "organizationId", name, owner, sponsor, budget, forecast, "startFy", "endFy", status)
values
  ('prog_01', 'org_acme_demo', 'Digital Transformation', 'Alex Morgan', 'CEO Office', 8200000, 7900000, 'FY25', 'FY27', 'Active'),
  ('prog_02', 'org_acme_demo', 'Customer Experience', 'Priya Shah', 'CCO', 4100000, 4350000, 'FY25', 'FY27', 'Active'),
  ('prog_03', 'org_acme_demo', 'Platform Modernisation', 'Chris Wong', 'CTO', 6700000, 6900000, 'FY25', 'FY28', 'Active'),
  ('prog_04', 'org_acme_demo', 'Risk & Compliance', 'Morgan Ellis', 'CISO', 2400000, 2250000, 'FY26', 'FY27', 'Active');

-- 17 Projects
insert into "Project" (
  id, "organizationId", code, name, "programId", theme, "portfolioCategory", "businessUnit",
  sponsor, "deliveryLead", pm, priority, "investmentType", "deliveryMethod", "fundingType",
  "governanceChannel", "financialYear", "startDate", "endDate", progress, funding, spend, forecast,
  "benefitsTarget", "benefitsRealised", status, rag, stage, description
) values
('prj_01','org_acme_demo','PRJ-001','ERP Core Upgrade','prog_01','Operations','Business Strategic','Finance','CFO','Sam Rivera','Alex Morgan','Critical','Transform','Waterfall','CAPEX','Channel B','FY26','2025-07-01','2026-12-31',62,1200000,740000,1180000,2400000,610000,'Active','Amber','Build','Core ERP upgrade for finance operations.'),
('prj_02','org_acme_demo','PRJ-002','Omnichannel Portal','prog_02','CX','Business Strategic','Marketing','CCO','Priya Shah','Jamie Cole','High','Growth','Agile','Mixed','Channel B','FY26','2025-06-01','2026-10-31',78,850000,620000,840000,1500000,900000,'Active','Green','Testing','Unified customer portal across channels.'),
('prj_03','org_acme_demo','PRJ-003','Data Lakehouse','prog_03','Data','IT Strategic','Technology','CTO','Chris Wong','Riley Chen','High','Foundation','Hybrid','CAPEX','Channel B','FY26','2025-08-01','2027-03-31',45,1500000,580000,1620000,3000000,120000,'Active','Red','Design','Enterprise analytics lakehouse foundation.'),
('prj_04','org_acme_demo','PRJ-004','Cyber Hardening','prog_04','Security','IT Strategic','Technology','CISO','Morgan Ellis','Taylor Brooks','Critical','Compliance','Waterfall','OPEX','Channel A','FY26','2025-05-01','2026-06-30',88,320000,280000,310000,0,0,'Active','Green','Deployment','Security baseline hardening programme.'),
('prj_05','org_acme_demo','PRJ-005','Store Workforce App','prog_02','CX','CAPEX','Retail','COO','Priya Shah','Casey Nguyen','Medium','Efficiency','Agile','CAPEX','Channel A','FY26','2025-09-01','2026-11-30',34,410000,120000,430000,780000,40000,'Active','Amber','Build','Mobile app for store workforce productivity.'),
('prj_06','org_acme_demo','PRJ-006','Supplier Portal Refresh','prog_01','Operations','Unfunded','Procurement','CPO','Sam Rivera','Drew Patel','Low','Growth','Waterfall','Unfunded','Channel A','FY27','2026-01-01','2027-06-30',12,0,15000,275000,520000,0,'On Hold','Amber','Discovery','Supplier collaboration portal refresh.'),
('prj_07','org_acme_demo','PRJ-007','AI Invoice Matching','prog_01','Operations','Business Strategic','Finance','CFO','Sam Rivera','Nina Park','High','Efficiency','Agile','OPEX','Channel A','FY26','2025-10-01','2026-08-31',41,220000,90000,230000,650000,50000,'Active','Green','Build','AI-assisted AP invoice matching.'),
('prj_08','org_acme_demo','PRJ-008','Field Service Mobile','prog_02','CX','Business Strategic','Operations','COO','Priya Shah','Evan Moss','High','Growth','Agile','CAPEX','Channel B','FY26','2025-07-15','2026-09-30',55,380000,210000,395000,920000,180000,'Active','Amber','Build','Field technician mobile service pack.'),
('prj_09','org_acme_demo','PRJ-009','ESG Reporting Automation','prog_01','Operations','IT Strategic','Finance','CFO','Sam Rivera','Quinn Avery','Medium','Compliance','Waterfall','OPEX','Channel A','FY26','2025-11-01','2026-07-31',28,150000,40000,160000,300000,0,'Active','Green','Design','Automated ESG metrics and reporting.'),
('prj_10','org_acme_demo','PRJ-010','Identity Access Modernisation','prog_04','Security','IT Strategic','Technology','CISO','Morgan Ellis','Blake Horton','Critical','Foundation','Hybrid','CAPEX','Channel B','FY26','2025-04-01','2026-12-31',70,690000,480000,710000,0,0,'Active','Amber','Testing','SSO, MFA, and privileged access uplift.'),
('prj_11','org_acme_demo','PRJ-011','CRM 360 Consolidation','prog_02','CX','Business Strategic','Sales','CCO','Priya Shah','Avery Kim','High','Transform','Waterfall','CAPEX','Channel B','FY26','2025-08-15','2027-01-31',38,980000,310000,1020000,2100000,95000,'Active','Red','Design','Single customer 360 CRM consolidation.'),
('prj_12','org_acme_demo','PRJ-012','Cloud Cost Optimisation','prog_03','Platform','IT Strategic','Technology','CTO','Chris Wong','Logan Reed','Medium','Efficiency','Agile','OPEX','Channel A','FY26','2025-09-01','2026-05-31',66,180000,110000,175000,450000,210000,'Active','Green','Testing','FinOps tooling and reserved capacity programme.'),
('prj_13','org_acme_demo','PRJ-013','Warehouse WMS Upgrade','prog_01','Operations','CAPEX','Logistics','COO','Sam Rivera','Harper Diaz','High','Transform','Waterfall','CAPEX','Channel B','FY26','2025-06-01','2026-12-15',49,1100000,520000,1150000,1800000,220000,'Active','Amber','Build','Warehouse management system upgrade.'),
('prj_14','org_acme_demo','PRJ-014','Contact Centre AI Assist','prog_02','CX','Business Strategic','Service','CCO','Priya Shah','Jamie Cole','Medium','Growth','Agile','Mixed','Channel A','FY26','2025-12-01','2026-09-30',22,260000,45000,275000,700000,0,'Active','Green','Discovery','Agent assist AI for contact centre.'),
('prj_15','org_acme_demo','PRJ-015','API Gateway Platform','prog_03','Platform','IT Strategic','Technology','CTO','Chris Wong','Riley Chen','Critical','Foundation','Hybrid','CAPEX','Channel B','FY26','2025-05-15','2026-11-30',58,740000,390000,760000,1200000,150000,'Active','Amber','Build','Enterprise API gateway and developer portal.'),
('prj_16','org_acme_demo','PRJ-016','HR Self-Service Portal','prog_01','Operations','Business Strategic','People','CHRO','Sam Rivera','Casey Nguyen','Medium','Efficiency','Agile','OPEX','Channel A','FY26','2025-10-15','2026-08-15',33,195000,70000,205000,410000,25000,'Active','Green','Build','Employee HR self-service experiences.'),
('prj_17','org_acme_demo','PRJ-017','Disaster Recovery Drill Automation','prog_04','Security','IT Strategic','Technology','CISO','Morgan Ellis','Taylor Brooks','High','Compliance','Waterfall','OPEX','Channel A','FY26','2025-11-15','2026-06-30',19,125000,22000,140000,0,0,'Active','Amber','Discovery','Automated DR testing and evidence capture.');

-- Business cases for all 17
insert into "ProjectBrief" (
  id, "projectId", "strategicAlignment", "problemStatement", "proposedSolution", scope, "outOfScope",
  "fundingAsk", "expectedBenefits", "keyRisks", assumptions, "successMetrics",
  "optionsConsidered", recommendation, "stakeholderSummary"
)
select
  'brief_' || right(p.id, 2),
  p.id,
  'Supports ' || p.theme || ' outcomes under ' || p."portfolioCategory" || '.',
  'Current-state gaps in ' || p.name || ' constrain value delivery for ' || coalesce(p."businessUnit", 'the enterprise') || '.',
  'Deliver ' || p.name || ' via ' || p."deliveryMethod" || ' with gated funding and measurable benefits.',
  'In-scope: core delivery for ' || coalesce(p."businessUnit", 'enterprise') || ', integration readiness, and handover.',
  'Non-critical enhancements and unrelated legacy remediation.',
  case when p.funding > 0 then p.funding else p.forecast end,
  'Target benefits ' || to_char(p."benefitsTarget", 'FM999,999,999') || ' with staged realisation.',
  'Delivery dependency, vendor performance, and transition data quality.',
  'Sponsors remain engaged; key resources allocated at planned capacity.',
  'On-time gate approvals, benefits realisation %, stakeholder adoption.',
  'Do nothing / tactical patch / full strategic investment (recommended).',
  'Proceed with staged funding under ' || p."governanceChannel" || '.',
  'Sponsor ' || coalesce(p.sponsor, 'TBD') || '; Lead ' || coalesce(p."deliveryLead", 'TBD') || '; PM ' || coalesce(p.pm, 'TBD') || '.'
from "Project" p
where p."organizationId" = 'org_acme_demo';

-- Stage gates (simplified Channel A / Channel B paths)
with stage_map as (
  select * from (values
    ('Discovery', 1),
    ('Business Case / Seed Funding', 2),
    ('Business Case / Full Funding', 2),
    ('Design', 3),
    ('Build', 4),
    ('Testing', 5),
    ('Deployment', 6),
    ('Handover', 7)
  ) as t(stage_name, stage_ord)
),
channel_a as (
  select * from (values
    (1, 'Discovery', 'Business Case / Full Funding'),
    (2, 'Business Case / Full Funding', 'Design'),
    (3, 'Design', 'Build'),
    (4, 'Build', 'Testing'),
    (5, 'Testing', 'Deployment'),
    (6, 'Deployment', 'Handover'),
    (7, 'Handover', null)
  ) as t(ord, stage, next_stage)
),
channel_b as (
  select * from (values
    (1, 'Discovery', 'Business Case / Seed Funding'),
    (2, 'Business Case / Seed Funding', 'Design'),
    (3, 'Design', 'Business Case / Full Funding'),
    (4, 'Business Case / Full Funding', 'Build'),
    (5, 'Build', 'Testing'),
    (6, 'Testing', 'Deployment'),
    (7, 'Deployment', 'Handover'),
    (8, 'Handover', null)
  ) as t(ord, stage, next_stage)
)
insert into "StageGate" (id, "projectId", channel, stage, "nextGate", "gateStatus", "checklistPct", "daysLate")
select
  p.id || '_sg_' || s.ord,
  p.id,
  p."governanceChannel",
  s.stage,
  s.next_stage,
  case
    when s.ord < coalesce(sm.stage_ord, 1) then 'Approved'
    when s.ord = coalesce(sm.stage_ord, 1) then 'In Review'
    else 'Pending'
  end,
  case
    when s.ord < coalesce(sm.stage_ord, 1) then 100
    when s.ord = coalesce(sm.stage_ord, 1) then 55
    else 0
  end,
  case when s.ord = coalesce(sm.stage_ord, 1) and p.rag = 'Red' then 12 else 0 end
from "Project" p
left join stage_map sm on sm.stage_name = p.stage
join lateral (
  select ord, stage, next_stage from channel_a where p."governanceChannel" = 'Channel A'
  union all
  select ord, stage, next_stage from channel_b where p."governanceChannel" = 'Channel B'
) s on true
where p."organizationId" = 'org_acme_demo';

-- Milestones
insert into "Milestone" (id, "projectId", name, "plannedDate", status, owner)
select p.id || '_ms1', p.id, 'Charter approved', '2025-08-15'::timestamptz, 'Complete', p.pm
from "Project" p where p."organizationId" = 'org_acme_demo'
union all
select p.id || '_ms2', p.id, 'Design baseline', '2025-11-01'::timestamptz,
  case when p.progress >= 40 then 'Complete' else 'Planned' end, p."deliveryLead"
from "Project" p where p."organizationId" = 'org_acme_demo'
union all
select p.id || '_ms3', p.id, 'Go-live readiness', '2026-09-30'::timestamptz, 'Planned', p.pm
from "Project" p where p."organizationId" = 'org_acme_demo';

-- Monthly financials (Jul–Dec 2025)
insert into "FinancialMonth" (id, "projectId", month, year, capex, opex, actual, forecast, variance, pv, ev)
select
  p.id || '_' || m.month,
  p.id,
  m.month,
  2025,
  case when p."fundingType" = 'OPEX' then 0 else (p.forecast / 6.0) * 0.7 end,
  case when p."fundingType" = 'CAPEX' then (p.forecast / 6.0) * 0.3 else p.forecast / 6.0 end,
  p.spend / 6.0,
  p.forecast / 6.0,
  (p.forecast - p.spend) / 6.0,
  (p.forecast / 6.0) * 0.95,
  (p.spend / 6.0) * (p.progress / 100.0 + 0.4)
from "Project" p
cross join (values ('Jul'),('Aug'),('Sep'),('Oct'),('Nov'),('Dec')) as m(month)
where p."organizationId" = 'org_acme_demo';

-- Risks
insert into "Risk" (id, "organizationId", "projectId", code, title, description, probability, impact, velocity, owner, mitigation, status, rag)
values
('rsk_01','org_acme_demo','prj_01','RSK-001','Vendor API latency','Core integration SLAs at risk during peak.',3,4,3,'Alex Morgan','Add caching + vendor war room','Open','Amber'),
('rsk_02','org_acme_demo','prj_03','RSK-002','Data migration quality','Legacy source quality below threshold.',4,5,4,'Riley Chen','Dual-run reconciliation sprints','Open','Red'),
('rsk_03','org_acme_demo','prj_02','RSK-003','UX research delay','Customer research calendar slip.',2,3,2,'Jamie Cole','Parallelise remote interviews','Mitigating','Green'),
('rsk_04','org_acme_demo','prj_05','RSK-004','Store Wi-Fi variance','Inconsistent store connectivity.',3,3,2,'Casey Nguyen','Offline-first sync','Open','Amber'),
('rsk_05','org_acme_demo','prj_11','RSK-005','CRM data duplication','Duplicate golden records across systems.',4,4,3,'Avery Kim','Master data stewardship cell','Open','Red'),
('rsk_06','org_acme_demo','prj_10','RSK-006','Identity cutover risk','Legacy IAM decommission timing.',3,5,3,'Blake Horton','Phased cutover with rollback','Open','Amber'),
('rsk_07','org_acme_demo','prj_13','RSK-007','Peak season freeze','Warehouse freeze windows constrain go-live.',3,4,2,'Harper Diaz','Align to off-peak windows','Open','Amber'),
('rsk_08','org_acme_demo','prj_15','RSK-008','API consumer readiness','Downstream teams not integration-ready.',3,3,3,'Riley Chen','Developer portal enablement','Open','Amber');

-- Pipeline
insert into "PipelineItem" (
  id, "organizationId", code, title, "businessUnit",
  "strategicAlignment", "benefitValue", "riskReduction", compliance, complexity,
  "priorityScore", "estBudget", decision, sponsor
) values
('pipe_01','org_acme_demo','IDEA-01','AI contract review','Legal',5,4,3,4,3,3.55,180000,'Shortlisted','CLO'),
('pipe_02','org_acme_demo','IDEA-02','Store planogram AI','Retail',4,5,2,1,4,2.85,320000,'Under Review','COO'),
('pipe_03','org_acme_demo','IDEA-03','Treasury cash forecasting','Finance',5,4,2,3,2,3.60,140000,'Approved','CFO'),
('pipe_04','org_acme_demo','IDEA-04','Customer loyalty redesign','Marketing',4,5,1,1,3,3.05,410000,'Under Review','CCO'),
('pipe_05','org_acme_demo','IDEA-05','OT security monitoring','Technology',5,3,5,5,3,3.85,260000,'Shortlisted','CISO');

-- Decisions / Actions
insert into "Decision" (id, "organizationId", "projectId", title, description, owner, "decidedOn", outcome, status)
values
('dec_01','org_acme_demo','prj_01','Approve full funding for Wave 2','Wave 2 ERP modules funding decision','CFO','2025-10-12'::timestamptz,'Funded $480k','Approved'),
('dec_02','org_acme_demo','prj_03','Select lakehouse vendor','Final shortlist Snowflake vs Databricks','CTO',null,null,'Pending'),
('dec_03','org_acme_demo','prj_11','CRM platform downselect','Salesforce vs Dynamics decision','CCO','2025-12-01'::timestamptz,'Selected Salesforce','Approved'),
('dec_04','org_acme_demo','prj_10','MFA enforcement date','Enterprise MFA mandate timing','CISO','2026-01-15'::timestamptz,'Enforce from Apr 2026','Approved');

insert into "Action" (id, "organizationId", "projectId", title, owner, "dueDate", priority, status)
values
('act_01','org_acme_demo','prj_03','Complete source system profiling','Riley Chen','2026-04-01'::timestamptz,'High','Open'),
('act_02','org_acme_demo','prj_01','Close security questionnaire','Sam Rivera','2026-03-20'::timestamptz,'Critical','In Progress'),
('act_03','org_acme_demo','prj_02','Publish release notes draft','Jamie Cole','2026-03-25'::timestamptz,'Medium','Open'),
('act_04','org_acme_demo','prj_11','Confirm migration wave plan','Avery Kim','2026-04-10'::timestamptz,'High','Open'),
('act_05','org_acme_demo','prj_13','Validate peak freeze calendar','Harper Diaz','2026-03-28'::timestamptz,'High','Open'),
('act_06','org_acme_demo','prj_15','Publish API standards pack','Riley Chen','2026-04-05'::timestamptz,'Medium','In Progress');

-- Resources
insert into "Resource" (id, "organizationId", "projectId", name, skill, role, month, "allocationPct", "capacityPct")
values
('res_01','org_acme_demo','prj_01','Alex Morgan','PMO','PM','Mar',80,100),
('res_02','org_acme_demo','prj_01','Dev Squad A','Engineering','Build','Mar',100,100),
('res_03','org_acme_demo','prj_02','UX Guild','Design','Design','Mar',60,80),
('res_04','org_acme_demo','prj_03','Data Eng Pod','Data','Build','Mar',110,100),
('res_05','org_acme_demo','prj_05','Mobile Guild','Engineering','Build','Mar',70,90),
('res_06','org_acme_demo','prj_11','CRM Squad','Engineering','Build','Mar',95,100),
('res_07','org_acme_demo','prj_10','IAM Team','Security','Build','Mar',85,100),
('res_08','org_acme_demo','prj_13','WMS Integrators','Engineering','Build','Mar',100,90),
('res_09','org_acme_demo','prj_15','API Platform Team','Engineering','Build','Mar',90,100);

-- Sprints / Releases
insert into "Sprint" (id, "organizationId", "projectId", name, "startDate", "endDate", "committedPts", "completedPts", status)
values
('sp_01','org_acme_demo','prj_02','Sprint 18','2026-02-01'::timestamptz,'2026-02-14'::timestamptz,42,40,'Complete'),
('sp_02','org_acme_demo','prj_02','Sprint 19','2026-02-15'::timestamptz,'2026-02-28'::timestamptz,45,28,'Active'),
('sp_03','org_acme_demo','prj_05','Sprint 7','2026-02-15'::timestamptz,'2026-02-28'::timestamptz,30,18,'Active'),
('sp_04','org_acme_demo','prj_07','Sprint 4','2026-02-15'::timestamptz,'2026-02-28'::timestamptz,26,20,'Active'),
('sp_05','org_acme_demo','prj_08','Sprint 9','2026-02-01'::timestamptz,'2026-02-14'::timestamptz,34,33,'Complete'),
('sp_06','org_acme_demo','prj_14','Sprint 2','2026-02-15'::timestamptz,'2026-02-28'::timestamptz,22,10,'Active');

insert into "Release" (id, "organizationId", "projectId", version, title, "releaseType", environment, "plannedDate", status)
values
('rel_01','org_acme_demo','prj_02','2.4.0','Portal personalization','Minor','Production','2026-04-15'::timestamptz,'Planned'),
('rel_02','org_acme_demo','prj_04','1.0.0','Hardening baseline','Major','Production','2026-03-30'::timestamptz,'In Progress'),
('rel_03','org_acme_demo','prj_10','1.2.0','MFA enforcement wave','Minor','Production','2026-04-30'::timestamptz,'Planned'),
('rel_04','org_acme_demo','prj_12','0.9.0','FinOps dashboard beta','Minor','Staging','2026-03-20'::timestamptz,'In Progress'),
('rel_05','org_acme_demo','prj_15','1.0.0','API gateway GA','Major','Production','2026-06-01'::timestamptz,'Planned');

-- Updates
insert into "Update" (id, "organizationId", title, body, category)
values
('upd_01','org_acme_demo','Portfolio steering pack published','March steering pack includes 17-project sample portfolio with updated RAG.','Governance'),
('upd_02','org_acme_demo','Channel B threshold reminder','Investments ≥ $200k continue on Channel B stage-gate path.','Process'),
('upd_03','org_acme_demo','Excel import ready','Download template, fill, and upload from Data & Exports to update Supabase.','Product'),
('upd_04','org_acme_demo','White-label theme live','Acme Delivery Hub branding is active for all workspace users.','Product');

commit;

-- Quick verification
select count(*) as project_count from "Project" where "organizationId" = 'org_acme_demo';
select code, name, rag, stage, funding from "Project" where "organizationId" = 'org_acme_demo' order by code;
