CREATE TABLE public.compliance_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_user_id uuid NOT NULL DEFAULT auth.uid(),
  bid_id uuid REFERENCES public.bids(id) ON DELETE SET NULL,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE SET NULL,
  bid_document_id uuid REFERENCES public.bid_documents(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  sha256 text,
  size_bytes bigint,
  page_count integer,
  status text NOT NULL DEFAULT 'queued',
  score numeric,
  rule_score numeric,
  rag_delta numeric,
  verdict text,
  ai_summary text,
  ai_confidence numeric,
  ai_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules_version text NOT NULL DEFAULT 'rules.json v1',
  error text,
  officer_status text,
  officer_note text,
  officer_id uuid,
  officer_decided_at timestamptz,
  started_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.compliance_runs TO authenticated;
GRANT ALL ON public.compliance_runs TO service_role;
ALTER TABLE public.compliance_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY runs_read ON public.compliance_runs FOR SELECT TO authenticated USING (vendor_user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY runs_insert ON public.compliance_runs FOR INSERT TO authenticated WITH CHECK (started_by = auth.uid() AND (vendor_user_id = auth.uid() OR public.is_officer(auth.uid())));
CREATE POLICY runs_update ON public.compliance_runs FOR UPDATE TO authenticated USING (started_by = auth.uid() OR public.is_officer(auth.uid())) WITH CHECK (started_by = auth.uid() OR public.is_officer(auth.uid()));
CREATE TRIGGER compliance_runs_updated_at BEFORE UPDATE ON public.compliance_runs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.compliance_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.compliance_runs(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  rule_code text NOT NULL,
  rule_name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  severity text NOT NULL,
  source text NOT NULL DEFAULT 'rule_engine',
  passed boolean NOT NULL,
  status text NOT NULL,
  expected text,
  found_value text,
  evidence_text text,
  evidence_page integer,
  suggestion text,
  ai_verdict text,
  ai_reason text,
  ai_confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.compliance_results TO authenticated;
GRANT ALL ON public.compliance_results TO service_role;
ALTER TABLE public.compliance_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY results_read ON public.compliance_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.compliance_runs r WHERE r.id = run_id AND (r.vendor_user_id = auth.uid() OR public.is_officer(auth.uid()))));
CREATE POLICY results_insert ON public.compliance_results FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.compliance_runs r WHERE r.id = run_id AND (r.started_by = auth.uid() OR public.is_officer(auth.uid()))));
CREATE INDEX ON public.compliance_results(run_id);
CREATE INDEX ON public.compliance_runs(vendor_user_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"tender_updates":true,"bid_status":true,"compliance_alerts":true,"system":false,"marketing":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS density text NOT NULL DEFAULT 'default';

-- Automatic audit trail
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_role text;
  v_module text := TG_ARGV[0];
  v_action text;
  v_summary text;
  v_id text;
  v_row jsonb := to_jsonb(NEW);
BEGIN
  v_id := v_row->>'id';
  SELECT email INTO v_email FROM public.profiles WHERE id = v_actor;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = v_actor ORDER BY (role = 'vendor') LIMIT 1;
  IF TG_TABLE_NAME = 'tenders' THEN
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'Created tender'
      WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Tender status → ' || NEW.status ELSE 'Updated tender' END;
    v_summary := NEW.reference_no || ' — ' || NEW.title;
  ELSIF TG_TABLE_NAME = 'bids' THEN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status AND NEW.status = 'draft' THEN RETURN NEW; END IF;
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'Started bid application'
      WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Bid status → ' || NEW.status ELSE 'Updated bid' END;
    v_summary := 'Bid ' || NEW.id;
  ELSIF TG_TABLE_NAME = 'compliance_runs' THEN
    IF TG_OP = 'INSERT' THEN v_action := 'Started compliance check';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed','failed') THEN
      v_action := CASE WHEN NEW.status = 'completed' THEN 'Compliance check completed' ELSE 'Compliance check failed' END;
    ELSIF OLD.officer_status IS DISTINCT FROM NEW.officer_status THEN v_action := 'Officer decision: ' || COALESCE(NEW.officer_status,'cleared');
    ELSE RETURN NEW; END IF;
    v_summary := NEW.file_name || COALESCE(' — score ' || NEW.score::text, '');
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_action := 'Updated profile'; v_summary := COALESCE(NEW.full_name, NEW.email);
  ELSIF TG_TABLE_NAME = 'vendors' THEN
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'Vendor registered' ELSE 'Updated organisation details' END;
    v_summary := NEW.legal_name;
  END IF;
  INSERT INTO public.audit_logs (actor_id, actor_email, actor_role, action, entity_type, entity_id, summary, metadata)
  VALUES (v_actor, v_email, COALESCE(v_role, CASE WHEN v_actor IS NULL THEN 'system' END), v_action, v_module, v_id, v_summary,
    jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'status', v_row->>'status', 'severity',
      CASE WHEN v_row->>'status' IN ('failed','rejected','cancelled') OR v_row->>'verdict' = 'non_compliant' THEN 'warning' ELSE 'info' END));
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER audit_tenders AFTER INSERT OR UPDATE ON public.tenders FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('Tender Management');
CREATE TRIGGER audit_bids AFTER INSERT OR UPDATE ON public.bids FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('Bid Management');
CREATE TRIGGER audit_runs AFTER INSERT OR UPDATE ON public.compliance_runs FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('Compliance Check');
CREATE TRIGGER audit_profiles AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('User Management');
CREATE TRIGGER audit_vendors AFTER INSERT OR UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('Vendor Management');

CREATE OR REPLACE FUNCTION public.notify_run_done()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.notifications (user_id, title, body, category, severity, link)
    VALUES (NEW.vendor_user_id, 'Compliance check completed',
      NEW.file_name || ': score ' || COALESCE(NEW.score::text,'—') || '/100 (' || replace(COALESCE(NEW.verdict,''),'_',' ') || ')',
      'compliance', CASE WHEN NEW.verdict = 'compliant' THEN 'success' WHEN NEW.verdict = 'non_compliant' THEN 'error' ELSE 'warning' END,
      '/vendor/compliance?run=' || NEW.id);
  ELSIF NEW.officer_status IS DISTINCT FROM OLD.officer_status AND NEW.officer_status IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, category, severity, link)
    VALUES (NEW.vendor_user_id, 'Department review updated', NEW.file_name || ': ' || replace(NEW.officer_status,'_',' ') || COALESCE(' — ' || NEW.officer_note, ''),
      'compliance', 'info', '/vendor/compliance?run=' || NEW.id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_run_done() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notify_runs AFTER UPDATE ON public.compliance_runs FOR EACH ROW EXECUTE FUNCTION public.notify_run_done();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_government_access(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_officer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_officer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_government_access(uuid, boolean, text) TO authenticated;