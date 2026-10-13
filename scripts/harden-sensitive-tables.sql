-- Apply with the corresponding website release, after deployment approval.
-- The application now accesses these tables through server routes with a service-role key.
-- No data is deleted. Direct browser access to credentials, backups and individual gifts is removed.
BEGIN;
ALTER TABLE public.site_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.site_configs FROM anon, authenticated;
GRANT ALL ON TABLE public.site_configs TO service_role;
DO $$
BEGIN
  IF to_regclass('public.fund_contributions') IS NOT NULL THEN
    ALTER TABLE public.fund_contributions ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.fund_contributions FROM anon, authenticated;
    GRANT ALL ON TABLE public.fund_contributions TO service_role;
  END IF;
END $$;
COMMIT;
