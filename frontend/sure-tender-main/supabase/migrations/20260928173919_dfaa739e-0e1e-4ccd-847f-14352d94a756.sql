CREATE TABLE public.compliance_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rules) = 'array'),
  change_summary text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.compliance_rule_versions TO authenticated;
GRANT ALL ON public.compliance_rule_versions TO service_role;
ALTER TABLE public.compliance_rule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published rulebooks are visible to signed-in users" ON public.compliance_rule_versions FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "Review staff can view all rulebook versions" ON public.compliance_rule_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'procurement_officer') OR public.has_role(auth.uid(), 'reviewer'));
CREATE POLICY "Officers can create rulebook drafts" ON public.compliance_rule_versions FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'procurement_officer')) AND created_by = auth.uid() AND status = 'draft');
CREATE POLICY "Officers can update rulebook versions" ON public.compliance_rule_versions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'procurement_officer')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'procurement_officer'));
CREATE UNIQUE INDEX compliance_rule_versions_one_published ON public.compliance_rule_versions ((status)) WHERE status = 'published';
CREATE OR REPLACE FUNCTION public.guard_rule_version_write() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    IF NEW.status = 'archived' AND NEW.rules = OLD.rules AND NEW.version = OLD.version THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Published rule versions are immutable';
  END IF;
  IF NEW.status = 'published' THEN
    IF NEW.change_summary IS NULL OR length(trim(NEW.change_summary)) < 10 THEN RAISE EXCEPTION 'A publication justification of at least 10 characters is required'; END IF;
    NEW.published_by := auth.uid();
    NEW.published_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_rule_version_write BEFORE UPDATE ON public.compliance_rule_versions FOR EACH ROW EXECUTE FUNCTION public.guard_rule_version_write();

INSERT INTO public.compliance_rule_versions (version,status,rules,change_summary,created_by,published_by,published_at)
VALUES ('rules.json v1','published','[
{"id":"R001","name":"GSTIN Verification","type":"keyword_presence","validator":"gstin","keywords":["GSTIN","GST Number","GST Registration","GST No"],"expected":"Valid 15-character GSTIN must be present and not negated","severity":"critical","suggestion":"Include a valid 15-digit GSTIN (format: 22AAAAA0000A1Z5) in the bid document. Ensure it is not marked as not available or N/A."},
{"id":"R002","name":"PAN Verification","type":"keyword_presence","validator":"pan","keywords":["PAN","Permanent Account Number","PAN No"],"expected":"Valid 10-character PAN must be present and not negated","severity":"critical","suggestion":"Include the bidder 10-character PAN (format: ABCDE1234F) in the bid document."},
{"id":"R003","name":"Bid Validity Period","type":"value_range","extraction_pattern":"(?:bid\\s*)?validity[:\\s]*(\\d[\\d,]*)\\s*days","min_value":90,"expected":"Bid validity must be at least 90 days","severity":"critical","suggestion":"State a bid validity period of at least 90 days."},
{"id":"R004","name":"EMD / Earnest Money Deposit","type":"keyword_presence","validator":"emd","keywords":["EMD","Earnest Money","Bid Security","Earnest Money Deposit"],"expected":"EMD or Bid Security must be mentioned with an actual amount","severity":"critical","suggestion":"Include EMD or Bid Security details with the actual amount enclosed."},
{"id":"R005","name":"Authorised Signatory","type":"keyword_presence","validator":"signatory","keywords":["Authorised Signatory","Authorized Signatory","Authorised Representative","Authorized Representative","Signatory"],"expected":"Document must be signed by an authorised signatory and not negated","severity":"critical","suggestion":"Include the name and designation of the Authorised Signatory."},
{"id":"R006","name":"Annual Turnover","type":"value_range","extraction_pattern":"(?:annual\\s*)?turnover[:\\s]*(?:Rs\\.?|INR|₹)?\\s*(\\d[\\d,]*)","min_value":500000,"expected":"Annual turnover must be at least ₹5,00,000","severity":"warning","suggestion":"Declare annual turnover of at least ₹5,00,000 with supporting documents."},
{"id":"R007","name":"Udyam / MSME Registration","type":"keyword_presence","keywords":["Udyam","MSME","Udyam Registration","MSME Certificate","UDYAM-"],"expected":"Udyam/MSME registration should be mentioned if applicable","severity":"info","suggestion":"If applicable, include the Udyam Registration Number."},
{"id":"R008","name":"Delivery Period","type":"keyword_presence","keywords":["Delivery Period","Delivery Timeline","Delivery Schedule","Delivery Days","Dispatch"],"expected":"Delivery period/timeline must be stated","severity":"warning","suggestion":"Clearly state the delivery period or dispatch timeline."},
{"id":"R009","name":"Make in India Compliance","type":"keyword_presence","keywords":["Make in India","Local Content","Domestic Value Addition","Class I","Class II"],"expected":"Make in India / local content declaration if applicable","severity":"info","suggestion":"Include a Make in India declaration with local content percentage if applicable."},
{"id":"R010","name":"Warranty / Guarantee","type":"keyword_presence","keywords":["Warranty","Guarantee","Warranty Period","Guarantee Period"],"expected":"Warranty or guarantee terms must be specified","severity":"warning","suggestion":"Specify warranty/guarantee period and terms."},
{"id":"R011","name":"OEM Authorisation","type":"keyword_presence","keywords":["OEM","Original Equipment Manufacturer","OEM Authorization","OEM Certificate","OEM Authorisation"],"expected":"OEM authorisation certificate for resellers","severity":"warning","suggestion":"If the bidder is a reseller, include an OEM Authorisation Certificate."},
{"id":"R012","name":"Payment Terms","type":"keyword_presence","keywords":["Payment Terms","Payment Conditions","Payment Schedule","Payment within"],"expected":"Payment terms must be clearly defined","severity":"info","suggestion":"State payment terms clearly."},
{"id":"R013","name":"Technical Specifications","type":"keyword_presence","keywords":["Technical Specification","Technical Specs","Specifications","Tech Spec","Product Specification"],"expected":"Technical specifications must be provided","severity":"warning","suggestion":"Include detailed technical specifications matching the tender."},
{"id":"R014","name":"Past Performance / Experience","type":"keyword_presence","keywords":["Past Performance","Prior Experience","Previous Experience","Work Experience","Track Record","Purchase Order"],"expected":"Evidence of past performance or experience","severity":"info","suggestion":"Include evidence of past performance, purchase orders or client references."},
{"id":"R015","name":"Compliance Certificates","type":"keyword_presence","keywords":["ISO","BIS","ISI","CE Mark","Compliance Certificate","Quality Certificate","Test Report"],"expected":"Relevant compliance/quality certificates must be attached","severity":"warning","suggestion":"Attach relevant compliance certificates required by the tender."}
]'::jsonb,'Initial published GeMShield deterministic rulebook', 'b6b2691e-cb33-46e4-827f-60322ece0c55', 'b6b2691e-cb33-46e4-827f-60322ece0c55', now());