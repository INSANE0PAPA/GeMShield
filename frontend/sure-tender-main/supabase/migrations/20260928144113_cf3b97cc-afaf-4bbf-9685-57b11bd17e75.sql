ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS application jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.tender_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.tender_documents TO authenticated;
GRANT ALL ON public.tender_documents TO service_role;
ALTER TABLE public.tender_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tdocs_read ON public.tender_documents FOR SELECT TO authenticated USING (
  public.is_officer(auth.uid()) OR EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.status <> 'draft'));
CREATE POLICY tdocs_officer_insert ON public.tender_documents FOR INSERT TO authenticated WITH CHECK (public.is_officer(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY tdocs_officer_delete ON public.tender_documents FOR DELETE TO authenticated USING (public.is_officer(auth.uid()) AND EXISTS (SELECT 1 FROM public.tenders t WHERE t.id = tender_id AND t.status = 'draft'));

CREATE TABLE public.bid_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  vendor_user_id uuid NOT NULL DEFAULT auth.uid(),
  doc_type text NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bid_id, doc_type)
);
GRANT SELECT, INSERT, DELETE ON public.bid_documents TO authenticated;
GRANT ALL ON public.bid_documents TO service_role;
ALTER TABLE public.bid_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY bdocs_read ON public.bid_documents FOR SELECT TO authenticated USING (vendor_user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY bdocs_insert ON public.bid_documents FOR INSERT TO authenticated WITH CHECK (vendor_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bids b WHERE b.id = bid_id AND b.vendor_user_id = auth.uid() AND b.status = 'draft'));
CREATE POLICY bdocs_delete ON public.bid_documents FOR DELETE TO authenticated USING (vendor_user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bids b WHERE b.id = bid_id AND b.status = 'draft'));

CREATE POLICY "bid docs owner upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bid-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "bid docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bid-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_officer(auth.uid())));
CREATE POLICY "bid docs owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bid-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "tender docs officer upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tender-documents' AND public.is_officer(auth.uid()));
CREATE POLICY "tender docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tender-documents');
CREATE POLICY "tender docs officer delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tender-documents' AND public.is_officer(auth.uid()));