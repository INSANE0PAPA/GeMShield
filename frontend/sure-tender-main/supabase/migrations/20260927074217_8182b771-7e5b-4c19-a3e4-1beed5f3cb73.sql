
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account_type TEXT := COALESCE(NEW.raw_user_meta_data->>'account_type', 'vendor');
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, organisation)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'organisation'
  )
  ON CONFLICT (id) DO NOTHING;

  v_role := CASE WHEN v_account_type = 'officer' THEN 'procurement_officer'::public.app_role
                 ELSE 'vendor'::public.app_role END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'vendor' THEN
    INSERT INTO public.vendors (owner_id, legal_name, contact_email)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'organisation', ''), COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)),
      NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
