-- =============================================================================
-- iProjectX — Seed sample portfolio into YOUR organization
-- Run in Supabase → SQL Editor (as postgres / service role is fine)
-- =============================================================================
-- Why data "doesn't show" in the app:
--   RLS only returns projects where org_id = your profile's org_id.
--   Sample rows inserted under another org (or the old "Project" table) are invisible.
--
-- This script:
--   1) Finds your Auth user by email
--   2) Ensures org + profile + org_admin role
--   3) Inserts 16 demo projects into THAT org
-- =============================================================================

DO $$
DECLARE
  v_email TEXT := lower(trim('YOUR_EMAIL@example.com')); -- <-- edit me
  v_user  UUID;
  v_org   UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_user
  FROM auth.users
  WHERE lower(email) = v_email
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Auth user % not found. Create the user in Authentication → Users first.', v_email;
  END IF;

  -- Ensure profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (v_user, v_email, split_part(v_email, '@', 1))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Ensure org
  SELECT org_id INTO v_org FROM public.profiles WHERE id = v_user;
  IF v_org IS NULL THEN
    INSERT INTO public.organizations (name, slug, plan)
    VALUES ('Demo Portfolio', 'demo-' || substr(replace(v_user::text, '-', ''), 1, 8), 'free')
    RETURNING id INTO v_org;

    UPDATE public.profiles SET org_id = v_org WHERE id = v_user;
  END IF;

  -- Ensure admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user AND org_id = v_org AND role = 'org_admin'
  ) THEN
    INSERT INTO public.user_roles (user_id, org_id, role)
    VALUES (v_user, v_org, 'org_admin');
  END IF;

  -- Clear prior demo codes for this org (safe re-run)
  DELETE FROM public.projects
  WHERE org_id = v_org AND project_code LIKE 'PRJ-%';

  INSERT INTO public.projects (
    org_id, project_code, name, program, sponsor, priority, status, rag,
    current_phase, delivery_method, start_date, end_date,
    budget, capex_approved, capex_incurred, opex_approved, opex_incurred,
    benefits_target, benefits_realised, description
  ) VALUES
  (v_org,'PRJ-001','ERP Core Upgrade','Business Strategic','CFO','Critical','In Progress','Amber','Build','Waterfall','2025-07-01','2026-12-31',1200000,1200000,740000,0,0,2400000,610000,'Core ERP upgrade for finance operations.'),
  (v_org,'PRJ-002','Omnichannel Portal','Business Strategic','CCO','High','In Progress','Green','Testing','Agile','2025-06-01','2026-10-31',850000,850000,620000,0,0,1500000,900000,'Unified customer portal across channels.'),
  (v_org,'PRJ-003','Data Lakehouse','IT Strategic','CTO','High','In Progress','Red','Design','Hybrid','2025-08-01','2027-03-31',1500000,1500000,580000,0,0,3000000,120000,'Enterprise analytics lakehouse foundation.'),
  (v_org,'PRJ-004','Cyber Hardening','IT Strategic','CISO','Critical','In Progress','Green','Deployment','Waterfall','2025-05-01','2026-06-30',320000,0,0,320000,280000,0,0,'Security baseline hardening programme.'),
  (v_org,'PRJ-005','Store Workforce App','CAPEX','COO','Medium','In Progress','Amber','Build','Agile','2025-09-01','2026-11-30',410000,410000,120000,0,0,780000,40000,'Mobile app for store workforce productivity.'),
  (v_org,'PRJ-006','Supplier Portal Refresh','Unfunded','CPO','Low','On Hold','Amber','Discovery','Waterfall','2026-01-01','2027-06-30',0,0,15000,0,0,520000,0,'Supplier collaboration portal refresh.'),
  (v_org,'PRJ-007','AI Invoice Matching','Business Strategic','CFO','High','In Progress','Green','Build','Agile','2025-10-01','2026-08-31',220000,0,0,220000,90000,650000,50000,'AI-assisted AP invoice matching.'),
  (v_org,'PRJ-008','Field Service Mobile','Business Strategic','COO','High','In Progress','Amber','Build','Agile','2025-07-15','2026-09-30',380000,380000,210000,0,0,920000,180000,'Field technician mobile service pack.'),
  (v_org,'PRJ-009','ESG Reporting Automation','IT Strategic','CFO','Medium','In Progress','Green','Design','Waterfall','2025-11-01','2026-07-31',150000,0,0,150000,40000,300000,0,'Automated ESG metrics and reporting.'),
  (v_org,'PRJ-010','Identity Access Modernisation','IT Strategic','CISO','Critical','In Progress','Amber','Testing','Hybrid','2025-04-01','2026-12-31',690000,690000,480000,0,0,0,0,'SSO, MFA, and privileged access uplift.'),
  (v_org,'PRJ-011','CRM 360 Consolidation','Business Strategic','CCO','High','In Progress','Red','Design','Waterfall','2025-08-15','2027-01-31',980000,980000,310000,0,0,2100000,95000,'Single customer 360 CRM consolidation.'),
  (v_org,'PRJ-012','Cloud Cost Optimisation','IT Strategic','CTO','Medium','In Progress','Green','Testing','Agile','2025-09-01','2026-05-31',180000,0,0,180000,110000,450000,210000,'FinOps tooling and reserved capacity programme.'),
  (v_org,'PRJ-013','Warehouse WMS Upgrade','CAPEX','COO','High','In Progress','Amber','Build','Waterfall','2025-06-01','2026-12-15',1100000,1100000,520000,0,0,1800000,220000,'Warehouse management system upgrade.'),
  (v_org,'PRJ-014','Contact Centre AI Assist','Business Strategic','CCO','Medium','In Progress','Green','Discovery','Agile','2025-12-01','2026-09-30',260000,260000,45000,0,0,700000,0,'Agent assist AI for contact centre.'),
  (v_org,'PRJ-015','API Gateway Platform','IT Strategic','CTO','Critical','In Progress','Amber','Build','Hybrid','2025-05-15','2026-11-30',740000,740000,390000,0,0,1200000,150000,'Enterprise API gateway and developer portal.'),
  (v_org,'PRJ-016','HR Self-Service Portal','Business Strategic','CHRO','Medium','In Progress','Green','Build','Agile','2025-10-15','2026-08-15',195000,0,0,195000,70000,410000,25000,'Employee HR self-service experiences.');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Seeded % projects into org % for user %', v_count, v_org, v_email;
END $$;
