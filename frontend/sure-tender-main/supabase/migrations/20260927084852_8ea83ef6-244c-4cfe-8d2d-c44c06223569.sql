ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_official_id text,
  ADD COLUMN IF NOT EXISTS ministry_department text,
  ADD COLUMN IF NOT EXISTS office_location text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'vendor',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS mobile_number text;

CREATE TABLE public.government_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  official_email text NOT NULL,
  employee_official_id text NOT NULL,
  ministry_department text NOT NULL,
  designation text NOT NULL,
  office_location text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.government_access_requests TO authenticated;
GRANT ALL ON public.government_access_requests TO service_role;
ALTER TABLE public.government_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY government_requests_own_read ON public.government_access_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_officer(auth.uid()));
CREATE POLICY government_requests_own_create ON public.government_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE POLICY government_requests_own_pending_update ON public.government_access_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE POLICY government_requests_officer_update ON public.government_access_requests
  FOR UPDATE TO authenticated
  USING (public.is_officer(auth.uid()))
  WITH CHECK (public.is_officer(auth.uid()));
CREATE TRIGGER government_access_requests_updated_at
  BEFORE UPDATE ON public.government_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text := CASE WHEN NEW.raw_user_meta_data->>'account_type' = 'officer' THEN 'officer' ELSE 'vendor' END;
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, phone, designation, organisation,
    employee_official_id, ministry_department, office_location,
    account_type, approval_status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'designation',
    NEW.raw_user_meta_data->>'organisation',
    NEW.raw_user_meta_data->>'employee_official_id',
    NEW.raw_user_meta_data->>'ministry_department',
    NEW.raw_user_meta_data->>'office_location',
    v_account_type,
    CASE WHEN v_account_type = 'officer' THEN 'pending' ELSE 'active' END
  ) ON CONFLICT (id) DO NOTHING;

  IF v_account_type = 'vendor' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendor'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.vendors (
      owner_id, legal_name, gstin, pan, contact_email, contact_phone, mobile_number
    ) VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'organisation', ''), COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)),
      NULLIF(NEW.raw_user_meta_data->>'gstin', ''),
      NULLIF(NEW.raw_user_meta_data->>'pan', ''),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'phone'
    );
  ELSE
    INSERT INTO public.government_access_requests (
      user_id, official_email, employee_official_id, ministry_department, designation, office_location
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'employee_official_id', ''),
      COALESCE(NEW.raw_user_meta_data->>'ministry_department', ''),
      COALESCE(NEW.raw_user_meta_data->>'designation', ''),
      COALESCE(NEW.raw_user_meta_data->>'office_location', '')
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_government_access(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.government_access_requests%ROWTYPE;
BEGIN
  IF NOT public.is_officer(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_request
  FROM public.government_access_requests
  WHERE id = _request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending request not found';
  END IF;

  UPDATE public.government_access_requests
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(), reviewed_at = now(), review_notes = _notes
  WHERE id = _request_id;

  UPDATE public.profiles
  SET approval_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END
  WHERE id = v_request.user_id;

  IF _approve THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_request.user_id, 'procurement_officer'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_government_access(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_government_access(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_government_access(uuid, boolean, text) TO service_role;