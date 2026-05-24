-- Migration 022: Admin RBAC privilege matrix
-- Stores per-admin, per-tab access grants.
-- When a row is absent the default is GRANTED (all-access).
-- Safe to re-run (IF NOT EXISTS throughout).

CREATE TABLE IF NOT EXISTS public.admin_privileges (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tab        text        NOT NULL,   -- 'dashboard'|'courses'|'analytics'|'learners'|'assessments'|'live_sessions'|'rbac'
  granted    boolean     NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid        REFERENCES public.profiles(id),

  CONSTRAINT admin_privileges_tab_check CHECK (
    tab IN ('dashboard','courses','analytics','learners','assessments','live_sessions','rbac')
  ),
  CONSTRAINT admin_privileges_user_tab_unique UNIQUE (user_id, tab)
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION public.set_admin_privileges_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_privileges_updated_at ON public.admin_privileges;
CREATE TRIGGER trg_admin_privileges_updated_at
  BEFORE UPDATE ON public.admin_privileges
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_privileges_updated_at();

-- Enable RLS (service_role used by backend bypasses it)
ALTER TABLE public.admin_privileges ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.admin_privileges                IS 'Per-admin, per-CMS-tab access privileges. Absence of a row = granted.';
COMMENT ON COLUMN public.admin_privileges.tab            IS 'CMS tab key: dashboard|courses|analytics|learners|assessments|live_sessions|rbac';
COMMENT ON COLUMN public.admin_privileges.granted        IS 'true = admin can access this tab; false = tab hidden and route blocked';
COMMENT ON COLUMN public.admin_privileges.updated_by     IS 'UUID of the super-admin who last changed this row';
