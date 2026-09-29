CREATE OR REPLACE FUNCTION public.publish_compliance_rule_version(_version_id uuid, _justification text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_version public.compliance_rule_versions;
  v_email text;
  v_role text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'procurement_officer')) THEN
    RAISE EXCEPTION 'Only authorized procurement officers can publish rule versions';
  END IF;
  IF length(trim(coalesce(_justification, ''))) < 10 THEN
    RAISE EXCEPTION 'A publication justification of at least 10 characters is required';
  END IF;
  SELECT * INTO v_version FROM public.compliance_rule_versions WHERE id = _version_id FOR UPDATE;
  IF NOT FOUND OR v_version.status <> 'draft' THEN RAISE EXCEPTION 'Only a draft rule version can be published'; END IF;
  IF jsonb_array_length(v_version.rules) = 0 THEN RAISE EXCEPTION 'A rule version cannot be empty'; END IF;

  UPDATE public.compliance_rule_versions SET status = 'archived' WHERE status = 'published';
  UPDATE public.compliance_rule_versions
    SET status = 'published', change_summary = trim(_justification), published_by = auth.uid(), published_at = now()
    WHERE id = _version_id;

  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','procurement_officer') ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END LIMIT 1;
  INSERT INTO public.audit_logs(actor_id, actor_email, actor_role, action, entity_type, entity_id, summary, metadata)
  VALUES(auth.uid(), v_email, v_role, 'Published compliance rule version', 'Rule Management', _version_id::text,
    v_version.version || ' — ' || trim(_justification),
    jsonb_build_object('origin','officer_action','severity','info','version',v_version.version,'rule_count',jsonb_array_length(v_version.rules)));
END;
$$;
GRANT EXECUTE ON FUNCTION public.publish_compliance_rule_version(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_compliance_rule_version(uuid,text) FROM anon;
