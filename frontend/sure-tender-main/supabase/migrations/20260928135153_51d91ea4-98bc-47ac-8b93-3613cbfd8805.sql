CREATE TABLE public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text,
  department text,
  location text,
  estimated_value numeric,
  emd_amount numeric,
  eligibility text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed','cancelled')),
  published_at timestamptz,
  closing_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tenders TO authenticated;
GRANT ALL ON public.tenders TO service_role;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenders_read ON public.tenders FOR SELECT TO authenticated USING (status <> 'draft' OR public.is_officer(auth.uid()));
CREATE POLICY tenders_officer_insert ON public.tenders FOR INSERT TO authenticated WITH CHECK (public.is_officer(auth.uid()) AND created_by = auth.uid());
CREATE POLICY tenders_officer_update ON public.tenders FOR UPDATE TO authenticated USING (public.is_officer(auth.uid())) WITH CHECK (public.is_officer(auth.uid()));
CREATE TRIGGER tenders_updated_at BEFORE UPDATE ON public.tenders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  vendor_user_id uuid NOT NULL DEFAULT auth.uid(),
  quoted_amount numeric,
  notes text,
  stage text NOT NULL DEFAULT 'basic' CHECK (stage IN ('basic','documents','bid','review')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','clarification_required','completed')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tender_id, vendor_user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY bids_read ON public.bids FOR SELECT TO authenticated USING (vendor_user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY bids_vendor_insert ON public.bids FOR INSERT TO authenticated WITH CHECK (vendor_user_id = auth.uid() AND status = 'draft');
CREATE POLICY bids_vendor_update ON public.bids FOR UPDATE TO authenticated USING (vendor_user_id = auth.uid() AND status = 'draft') WITH CHECK (vendor_user_id = auth.uid() AND status IN ('draft','submitted'));
CREATE POLICY bids_officer_update ON public.bids FOR UPDATE TO authenticated USING (public.is_officer(auth.uid())) WITH CHECK (public.is_officer(auth.uid()));
CREATE TRIGGER bids_updated_at BEFORE UPDATE ON public.bids FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.saved_tenders (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tender_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_tenders TO authenticated;
GRANT ALL ON public.saved_tenders TO service_role;
ALTER TABLE public.saved_tenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_own ON public.saved_tenders FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());