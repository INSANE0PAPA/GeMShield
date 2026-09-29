CREATE OR REPLACE FUNCTION public.guard_compliance_officer_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.officer_status IS DISTINCT FROM OLD.officer_status
     AND NEW.officer_status IN ('compliant','non_compliant')
     AND NOT EXISTS (
       SELECT 1 FROM public.final_decisions fd
       WHERE fd.run_id = NEW.id
         AND fd.bid_id = NEW.bid_id
         AND fd.decision = NEW.officer_status
     ) THEN
    RAISE EXCEPTION 'Final approval or rejection must use the Final Decisions workflow';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_compliance_officer_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_compliance_officer_status ON public.compliance_runs;
CREATE TRIGGER guard_compliance_officer_status
BEFORE UPDATE OF officer_status ON public.compliance_runs
FOR EACH ROW EXECUTE FUNCTION public.guard_compliance_officer_status();

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
  v_origin text := 'user_action';
BEGIN
  v_id := v_row->>'id';
  SELECT email INTO v_email FROM public.profiles WHERE id = v_actor;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = v_actor ORDER BY (role = 'vendor') LIMIT 1;
  IF TG_TABLE_NAME = 'tenders' THEN
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'Created tender'
      WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Tender status → ' || NEW.status ELSE 'Updated tender' END;
    v_summary := NEW.reference_no || ' — ' || NEW.title;
    v_origin := 'officer_action';
  ELSIF TG_TABLE_NAME = 'bids' THEN
    IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status AND NEW.status = 'draft' THEN RETURN NEW; END IF;
    v_action := CASE WHEN TG_OP = 'INSERT' THEN 'Started bid application'
      WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'Bid status → ' || NEW.status ELSE 'Updated bid' END;
    v_summary := 'Bid ' || NEW.id;
    v_origin := 'vendor_action';
  ELSIF TG_TABLE_NAME = 'compliance_runs' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'Started compliance check';
      v_origin := 'deterministic_rule';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'failed' THEN
      v_action := 'Compliance check failed';
      v_origin := 'system';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      RETURN NEW;
    ELSIF OLD.officer_status IS DISTINCT FROM NEW.officer_status THEN
      IF EXISTS (SELECT 1 FROM public.final_decisions fd WHERE fd.run_id = NEW.id) THEN RETURN NEW; END IF;
      v_action := CASE NEW.officer_status
        WHEN 'needs_review' THEN 'Referred to Human Review'
        WHEN 'clarification' THEN 'Clarification requested'
        ELSE 'Verification status updated'
      END;
      v_origin := 'human_review';
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
    jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP, 'status', v_row->>'status', 'origin', v_origin,
      'severity', CASE WHEN v_row->>'status' IN ('failed','rejected','cancelled') THEN 'warning' ELSE 'info' END,
      'bid_id', v_row->>'bid_id', 'tender_id', v_row->>'tender_id', 'document_sha256', v_row->>'sha256'));
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_run_done()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.notifications (user_id, title, body, category, severity, link)
    VALUES (NEW.vendor_user_id, 'Compliance check completed',
      NEW.file_name || ': score ' || COALESCE(NEW.score::text,'—') || '/100 (' || replace(COALESCE(NEW.verdict,''),'_',' ') || ') — advisory result; officer review may be required',
      'compliance', CASE WHEN NEW.verdict = 'compliant' THEN 'success' ELSE 'warning' END,
      '/vendor/compliance?run=' || NEW.id);
  ELSIF NEW.officer_status IS DISTINCT FROM OLD.officer_status AND NEW.officer_status IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.final_decisions fd WHERE fd.run_id = NEW.id) THEN
    INSERT INTO public.notifications (user_id, title, body, category, severity, link)
    VALUES (NEW.vendor_user_id, 'Department review updated', NEW.file_name || ': ' || replace(NEW.officer_status,'_',' ') || COALESCE(' — ' || NEW.officer_note, ''),
      'human_review', CASE WHEN NEW.officer_status = 'clarification' THEN 'warning' ELSE 'info' END, '/vendor/compliance?run=' || NEW.id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_run_done() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_human_review_action(_case_id uuid, _action text, _justification text DEFAULT NULL, _assignee uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_case public.human_review_cases%ROWTYPE;
  v_run public.compliance_runs%ROWTYPE;
  v_status text;
  v_resolution text;
  v_role text;
  v_email text;
BEGIN
  IF NOT public.is_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO v_case FROM public.human_review_cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review case not found'; END IF;
  SELECT * INTO v_run FROM public.compliance_runs WHERE id = v_case.run_id;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = auth.uid() ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'procurement_officer' THEN 2 ELSE 3 END LIMIT 1;
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  IF v_case.status = 'resolved' THEN RAISE EXCEPTION 'Review case is already resolved'; END IF;
  IF _action NOT IN ('start','confirm','override','clarification','escalate') THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  IF _action IN ('override','clarification','escalate') AND length(trim(COALESCE(_justification,''))) < 10 THEN RAISE EXCEPTION 'A detailed justification is required'; END IF;
  v_status := CASE _action WHEN 'start' THEN 'in_review' WHEN 'clarification' THEN 'clarification' WHEN 'escalate' THEN 'escalated' ELSE 'resolved' END;
  v_resolution := CASE _action WHEN 'confirm' THEN 'confirmed' WHEN 'override' THEN 'overridden' WHEN 'clarification' THEN 'clarification_requested' WHEN 'escalate' THEN 'escalated' ELSE NULL END;
  UPDATE public.human_review_cases SET status=v_status, assigned_to=COALESCE(_assignee,assigned_to,auth.uid()), resolution=v_resolution,
    justification=NULLIF(trim(COALESCE(_justification,'')),''), resolved_by=CASE WHEN v_status='resolved' THEN auth.uid() ELSE NULL END,
    resolved_at=CASE WHEN v_status='resolved' THEN now() ELSE NULL END WHERE id=_case_id;
  IF _action='clarification' AND v_case.bid_id IS NOT NULL THEN UPDATE public.bids SET status='clarification_required' WHERE id=v_case.bid_id;
  ELSIF _action IN ('start','escalate') AND v_case.bid_id IS NOT NULL THEN UPDATE public.bids SET status='under_review' WHERE id=v_case.bid_id AND status<>'completed'; END IF;
  INSERT INTO public.audit_logs(actor_id,actor_email,actor_role,action,entity_type,entity_id,summary,metadata)
  VALUES(auth.uid(),v_email,v_role,'Human review: '||_action,'Human Review',_case_id::text,v_case.trigger_reason,
    jsonb_build_object('origin','human_review','severity',CASE WHEN v_case.priority='high' THEN 'warning' ELSE 'info' END,'trigger_reason',v_case.trigger_reason,
      'priority',v_case.priority,'run_id',v_case.run_id,'bid_id',v_case.bid_id,'tender_id',v_case.tender_id,'score',v_run.score,
      'ai_confidence',v_run.ai_confidence,'ai_verdict',v_run.verdict,'document_sha256',v_run.sha256,'justification',NULLIF(trim(COALESCE(_justification,'')),'')));
  IF _action='clarification' THEN INSERT INTO public.notifications(user_id,title,body,category,severity,link)
    VALUES(v_case.vendor_user_id,'Clarification requested',trim(_justification),'human_review','warning',CASE WHEN v_case.bid_id IS NULL THEN '/vendor/compliance?run='||v_case.run_id ELSE '/vendor/my-bids/'||v_case.bid_id END); END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.record_human_review_action(uuid,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_human_review_action(uuid,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.open_human_review_case()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reason text; v_priority text; v_has_critical boolean; v_has_ambiguous boolean; v_case_id uuid;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  SELECT EXISTS(SELECT 1 FROM public.compliance_results cr WHERE cr.run_id=NEW.id AND cr.passed=false AND cr.severity='critical'),
    EXISTS(SELECT 1 FROM public.compliance_results cr WHERE cr.run_id=NEW.id AND (cr.status IN ('needs_attention','missing') OR cr.ai_verdict IN ('cannot_determine','ambiguous','conflict')))
  INTO v_has_critical,v_has_ambiguous;
  IF NOT (NEW.verdict='needs_review' OR NEW.officer_status='needs_review' OR COALESCE(NEW.ai_confidence,1)<0.75 OR v_has_critical OR v_has_ambiguous) THEN RETURN NEW; END IF;
  v_reason:=concat_ws('; ',CASE WHEN NEW.officer_status='needs_review' THEN 'Officer referral' END,CASE WHEN COALESCE(NEW.ai_confidence,1)<0.75 THEN 'Low AI confidence' END,
    CASE WHEN v_has_critical THEN 'Critical evidence requires manual verification' END,CASE WHEN v_has_ambiguous THEN 'Missing, ambiguous, or conflicting evidence' END,
    CASE WHEN NEW.verdict='needs_review' THEN 'Compliance result requires review' END);
  v_priority:=CASE WHEN v_has_critical OR NEW.verdict='non_compliant' THEN 'high' WHEN COALESCE(NEW.ai_confidence,1)<0.75 THEN 'medium' ELSE 'low' END;
  INSERT INTO public.human_review_cases(run_id,bid_id,tender_id,vendor_user_id,trigger_reason,priority)
  VALUES(NEW.id,NEW.bid_id,NEW.tender_id,NEW.vendor_user_id,v_reason,v_priority) ON CONFLICT(run_id) DO NOTHING RETURNING id INTO v_case_id;
  IF v_case_id IS NOT NULL THEN
    INSERT INTO public.audit_logs(actor_role,action,entity_type,entity_id,summary,metadata)
    VALUES('system','Human review case opened','Human Review',v_case_id::text,v_reason,
      jsonb_build_object('origin',CASE WHEN COALESCE(NEW.ai_confidence,1)<0.75 THEN 'ai_advisory' ELSE 'deterministic_rule' END,'severity',CASE WHEN v_priority='high' THEN 'warning' ELSE 'info' END,
        'run_id',NEW.id,'bid_id',NEW.bid_id,'tender_id',NEW.tender_id,'score',NEW.score,'ai_confidence',NEW.ai_confidence,'ai_verdict',NEW.verdict,'document_sha256',NEW.sha256));
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.open_human_review_case() FROM PUBLIC, anon, authenticated;