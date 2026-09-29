ALTER TABLE public.tenders
  ADD COLUMN source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','data_gov_in')),
  ADD COLUMN source_resource_id text,
  ADD COLUMN source_title text,
  ADD COLUMN source_org text,
  ADD COLUMN source_url text,
  ADD COLUMN source_record jsonb,
  ADD COLUMN source_sha256 text,
  ADD COLUMN source_fetched_at timestamptz;

CREATE TABLE public.data_gov_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id text NOT NULL,
  title text,
  org text,
  source_url text NOT NULL,
  record_count integer NOT NULL DEFAULT 0,
  fields jsonb,
  records jsonb NOT NULL DEFAULT '[]'::jsonb,
  sha256 text NOT NULL,
  imported_by uuid NOT NULL DEFAULT auth.uid(),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.data_gov_imports TO authenticated;
GRANT ALL ON public.data_gov_imports TO service_role;
ALTER TABLE public.data_gov_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers read imports" ON public.data_gov_imports FOR SELECT TO authenticated USING (public.is_officer(auth.uid()));
CREATE POLICY "Officers create imports" ON public.data_gov_imports FOR INSERT TO authenticated WITH CHECK (public.is_officer(auth.uid()) AND imported_by = auth.uid());