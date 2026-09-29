ALTER FUNCTION public.record_human_review_action(uuid, text, text, uuid) SECURITY INVOKER;
ALTER FUNCTION public.finalize_bid_decision(uuid, uuid, text, text) SECURITY INVOKER;

GRANT UPDATE ON public.human_review_cases TO authenticated;
CREATE POLICY human_review_officer_update ON public.human_review_cases FOR UPDATE TO authenticated USING (public.is_officer(auth.uid())) WITH CHECK (public.is_officer(auth.uid()));

GRANT INSERT ON public.final_decisions TO authenticated;
CREATE POLICY final_decisions_officer_insert ON public.final_decisions FOR INSERT TO authenticated WITH CHECK (public.is_officer(auth.uid()) AND officer_id = auth.uid());

GRANT INSERT ON public.bid_passports TO authenticated;
CREATE POLICY bid_passports_officer_insert ON public.bid_passports FOR INSERT TO authenticated WITH CHECK (public.is_officer(auth.uid()));

GRANT INSERT ON public.notifications TO authenticated;
CREATE POLICY notifications_officer_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_officer(auth.uid()));