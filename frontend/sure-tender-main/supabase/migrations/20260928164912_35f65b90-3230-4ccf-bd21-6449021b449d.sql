CREATE TABLE public.human_review_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL UNIQUE REFERENCES public.compliance_runs(id) ON DELETE RESTRICT,
  bid_id uuid REFERENCES public.bids(id) ON DELETE RESTRICT,
  tender_id uuid REFERENCES public.tenders(id) ON DELETE RESTRICT,
  vendor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  trigger_reason text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('high','medium','low')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','clarification','escalated','resolved')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text CHECK (resolution IS NULL OR resolution IN ('confirmed','overridden','clarification_requested','escalated')),
  justification text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.human_review_cases TO authenticated;
GRANT ALL ON public.human_review_cases TO service_role;
ALTER TABLE public.human_review_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY human_review_read ON public.human_review_cases FOR SELECT TO authenticated USING (vendor_user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE INDEX human_review_cases_status_idx ON public.human_review_cases(status, priority, created_at DESC);
CREATE INDEX human_review_cases_bid_idx ON public.human_review_cases(bid_id);
CREATE TRIGGER human_review_cases_updated_at BEFORE UPDATE ON public.human_review_cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.final_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL UNIQUE REFERENCES public.bids(id) ON DELETE RESTRICT,
  run_id uuid NOT NULL REFERENCES public.compliance_runs(id) ON DELETE RESTRICT,
  vendor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('compliant','non_compliant')),
  justification text NOT NULL,
  compliance_snapshot jsonb NOT NULL,
  decision_hash text NOT NULL UNIQUE,
  decided_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.final_decisions TO authenticated;
GRANT ALL ON public.final_decisions TO service_role;
ALTER TABLE public.final_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY final_decisions_read ON public.final_decisions FOR SELECT TO authenticated USING (vendor_user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE INDEX final_decisions_decided_idx ON public.final_decisions(decided_at DESC);

CREATE TABLE public.bid_passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL UNIQUE REFERENCES public.final_decisions(id) ON DELETE RESTRICT,
  bid_id uuid NOT NULL UNIQUE REFERENCES public.bids(id) ON DELETE RESTRICT,
  vendor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  passport_snapshot jsonb NOT NULL,
  passport_hash text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bid_passports TO authenticated;
GRANT ALL ON public.bid_passports TO service_role;
ALTER TABLE public.bid_passports ENABLE ROW LEVEL SECURITY;
CREATE POLICY bid_passports_read ON public.bid_passports FOR SELECT TO authenticated USING (vendor_user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE INDEX bid_passports_issued_idx ON public.bid_passports(issued_at DESC);

CREATE OR REPLACE FUNCTION public.open_human_review_case()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reason text;
  v_priority text;
  v_has_critical boolean;
  v_has_ambiguous boolean;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;

  SELECT
    EXISTS (SELECT 1 FROM public.compliance_results cr WHERE cr.run_id = NEW.id AND cr.passed = false AND cr.severity = 'critical'),
    EXISTS (SELECT 1 FROM public.compliance_results cr WHERE cr.run_id = NEW.id AND (cr.status IN ('needs_attention','missing') OR cr.ai_verdict IN ('cannot_determine','ambiguous','conflict')))
  INTO v_has_critical, v_has_ambiguous;

  IF NOT (NEW.verdict = 'needs_review' OR NEW.officer_status = 'needs_review' OR COALESCE(NEW.ai_confidence, 1) < 0.75 OR v_has_critical OR v_has_ambiguous) THEN
    RETURN NEW;
  END IF;

  v_reason := concat_ws('; ',
    CASE WHEN NEW.officer_status = 'needs_review' THEN 'Officer referral' END,
    CASE WHEN COALESCE(NEW.ai_confidence, 1) < 0.75 THEN 'Low AI confidence' END,
    CASE WHEN v_has_critical THEN 'Critical evidence requires manual verification' END,
    CASE WHEN v_has_ambiguous THEN 'Missing, ambiguous, or conflicting evidence' END,
    CASE WHEN NEW.verdict = 'needs_review' THEN 'Compliance result requires review' END
  );
  v_priority := CASE WHEN v_has_critical OR NEW.verdict = 'non_compliant' THEN 'high' WHEN COALESCE(NEW.ai_confidence, 1) < 0.75 THEN 'medium' ELSE 'low' END;

  INSERT INTO public.human_review_cases (run_id, bid_id, tender_id, vendor_user_id, trigger_reason, priority)
  VALUES (NEW.id, NEW.bid_id, NEW.tender_id, NEW.vendor_user_id, v_reason, v_priority)
  ON CONFLICT (run_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.open_human_review_case() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_human_review_case AFTER INSERT OR UPDATE OF status, verdict, ai_confidence, officer_status ON public.compliance_runs FOR EACH ROW EXECUTE FUNCTION public.open_human_review_case();

CREATE OR REPLACE FUNCTION public.record_human_review_action(_case_id uuid, _action text, _justification text DEFAULT NULL, _assignee uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_case public.human_review_cases%ROWTYPE;
  v_status text;
  v_resolution text;
BEGIN
  IF NOT public.is_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v_case FROM public.human_review_cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review case not found'; END IF;
  IF v_case.status = 'resolved' THEN RAISE EXCEPTION 'Review case is already resolved'; END IF;
  IF _action NOT IN ('start','confirm','override','clarification','escalate') THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  IF _action IN ('override','clarification','escalate') AND length(trim(COALESCE(_justification,''))) < 10 THEN RAISE EXCEPTION 'A detailed justification is required'; END IF;

  v_status := CASE _action WHEN 'start' THEN 'in_review' WHEN 'clarification' THEN 'clarification' WHEN 'escalate' THEN 'escalated' ELSE 'resolved' END;
  v_resolution := CASE _action WHEN 'confirm' THEN 'confirmed' WHEN 'override' THEN 'overridden' WHEN 'clarification' THEN 'clarification_requested' WHEN 'escalate' THEN 'escalated' ELSE NULL END;

  UPDATE public.human_review_cases SET
    status = v_status,
    assigned_to = COALESCE(_assignee, assigned_to, auth.uid()),
    resolution = v_resolution,
    justification = NULLIF(trim(COALESCE(_justification,'')),''),
    resolved_by = CASE WHEN v_status = 'resolved' THEN auth.uid() ELSE NULL END,
    resolved_at = CASE WHEN v_status = 'resolved' THEN now() ELSE NULL END
  WHERE id = _case_id;

  IF _action = 'clarification' AND v_case.bid_id IS NOT NULL THEN
    UPDATE public.bids SET status = 'clarification_required' WHERE id = v_case.bid_id;
  ELSIF _action IN ('start','escalate') AND v_case.bid_id IS NOT NULL THEN
    UPDATE public.bids SET status = 'under_review' WHERE id = v_case.bid_id AND status <> 'completed';
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, summary, metadata)
  VALUES (auth.uid(), 'procurement_officer', 'Human review: ' || _action, 'Human Review', _case_id::text, v_case.trigger_reason,
    jsonb_build_object('severity', CASE WHEN v_case.priority = 'high' THEN 'warning' ELSE 'info' END, 'run_id', v_case.run_id, 'bid_id', v_case.bid_id, 'justification', NULLIF(trim(COALESCE(_justification,'')),'')));

  IF _action = 'clarification' THEN
    INSERT INTO public.notifications (user_id, title, body, category, severity, link)
    VALUES (v_case.vendor_user_id, 'Clarification requested', trim(_justification), 'human_review', 'warning', CASE WHEN v_case.bid_id IS NULL THEN '/vendor/compliance?run=' || v_case.run_id ELSE '/vendor/my-bids/' || v_case.bid_id END);
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_human_review_action(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_human_review_action(uuid, text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_bid_decision(_bid_id uuid, _run_id uuid, _decision text, _justification text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_run public.compliance_runs%ROWTYPE;
  v_tender public.tenders%ROWTYPE;
  v_decision_id uuid;
  v_passport_id uuid;
  v_snapshot jsonb;
  v_passport jsonb;
  v_hash text;
BEGIN
  IF NOT public.is_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _decision NOT IN ('compliant','non_compliant') THEN RAISE EXCEPTION 'Final decision must be compliant or non-compliant'; END IF;
  IF length(trim(COALESCE(_justification,''))) < 10 THEN RAISE EXCEPTION 'A detailed officer justification is required'; END IF;

  SELECT * INTO v_bid FROM public.bids WHERE id = _bid_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found'; END IF;
  IF v_bid.status = 'draft' THEN RAISE EXCEPTION 'Draft bids cannot receive a final decision'; END IF;
  SELECT * INTO v_run FROM public.compliance_runs WHERE id = _run_id AND bid_id = _bid_id AND status = 'completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'A completed compliance run linked to this bid is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.human_review_cases WHERE run_id = _run_id AND status <> 'resolved') THEN RAISE EXCEPTION 'Required Human Review must be resolved first'; END IF;
  IF EXISTS (SELECT 1 FROM public.final_decisions WHERE bid_id = _bid_id) THEN RAISE EXCEPTION 'A final decision already exists for this bid'; END IF;
  SELECT * INTO v_tender FROM public.tenders WHERE id = v_bid.tender_id;

  v_snapshot := jsonb_build_object(
    'bid', jsonb_build_object('id', v_bid.id, 'status', v_bid.status, 'quoted_amount', v_bid.quoted_amount, 'submitted_at', v_bid.submitted_at, 'application', v_bid.application),
    'tender', jsonb_build_object('id', v_tender.id, 'reference_no', v_tender.reference_no, 'title', v_tender.title, 'department', v_tender.department, 'source_url', v_tender.source_url, 'source_resource_id', v_tender.source_resource_id, 'source_sha256', v_tender.source_sha256),
    'compliance', jsonb_build_object('run_id', v_run.id, 'score', v_run.score, 'rule_score', v_run.rule_score, 'rag_delta', v_run.rag_delta, 'verdict', v_run.verdict, 'rules_version', v_run.rules_version, 'ai_confidence', v_run.ai_confidence, 'document_name', v_run.file_name, 'document_sha256', v_run.sha256, 'completed_at', v_run.completed_at),
    'documents', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'doc_type', d.doc_type, 'sha256', d.sha256, 'size_bytes', d.size_bytes) ORDER BY d.created_at) FROM public.bid_documents d WHERE d.bid_id = v_bid.id), '[]'::jsonb),
    'evidence', COALESCE((SELECT jsonb_agg(jsonb_build_object('rule_code', r.rule_code, 'rule_name', r.rule_name, 'status', r.status, 'severity', r.severity, 'page', r.evidence_page, 'evidence', r.evidence_text, 'found_value', r.found_value, 'ai_verdict', r.ai_verdict, 'ai_reason', r.ai_reason) ORDER BY r.position) FROM public.compliance_results r WHERE r.run_id = v_run.id), '[]'::jsonb),
    'human_review', COALESCE((SELECT jsonb_build_object('case_id', h.id, 'trigger_reason', h.trigger_reason, 'priority', h.priority, 'resolution', h.resolution, 'justification', h.justification, 'resolved_by', h.resolved_by, 'resolved_at', h.resolved_at) FROM public.human_review_cases h WHERE h.run_id = v_run.id), 'null'::jsonb)
  );
  v_hash := encode(extensions.digest(convert_to(v_snapshot::text || _decision || trim(_justification) || auth.uid()::text || now()::text, 'UTF8'), 'sha256'), 'hex');

  INSERT INTO public.final_decisions (bid_id, run_id, vendor_user_id, officer_id, decision, justification, compliance_snapshot, decision_hash)
  VALUES (v_bid.id, v_run.id, v_bid.vendor_user_id, auth.uid(), _decision, trim(_justification), v_snapshot, v_hash)
  RETURNING id INTO v_decision_id;

  v_passport := jsonb_build_object('version', '1.0', 'decision_id', v_decision_id, 'decision', _decision, 'justification', trim(_justification), 'officer_id', auth.uid(), 'decision_hash', v_hash, 'snapshot', v_snapshot);
  INSERT INTO public.bid_passports (decision_id, bid_id, vendor_user_id, passport_snapshot, passport_hash)
  VALUES (v_decision_id, v_bid.id, v_bid.vendor_user_id, v_passport, encode(extensions.digest(convert_to(v_passport::text, 'UTF8'), 'sha256'), 'hex'))
  RETURNING id INTO v_passport_id;

  UPDATE public.compliance_runs SET officer_status = _decision, officer_note = trim(_justification), officer_id = auth.uid(), officer_decided_at = now() WHERE id = v_run.id;
  UPDATE public.bids SET status = 'completed' WHERE id = v_bid.id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, summary, metadata)
  VALUES (auth.uid(), 'procurement_officer', 'Final decision: ' || _decision, 'Final Decision', v_decision_id::text, v_tender.reference_no || ' — ' || v_tender.title,
    jsonb_build_object('severity', CASE WHEN _decision = 'non_compliant' THEN 'warning' ELSE 'info' END, 'bid_id', v_bid.id, 'run_id', v_run.id, 'decision_hash', v_hash, 'passport_id', v_passport_id));
  INSERT INTO public.notifications (user_id, title, body, category, severity, link)
  VALUES (v_bid.vendor_user_id, 'Final bid decision recorded', replace(_decision, '_', ' ') || ' — ' || trim(_justification), 'final_decision', CASE WHEN _decision = 'compliant' THEN 'success' ELSE 'error' END, '/vendor/bid-passport/' || v_bid.id);
  RETURN v_decision_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.finalize_bid_decision(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_bid_decision(uuid, uuid, text, text) TO authenticated;