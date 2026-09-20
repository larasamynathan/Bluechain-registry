CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. email on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested TEXT;
  assigned TEXT;
  admin_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, organization, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'organization',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  requested := COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'field_submitter');

  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin'::public.app_role;

  assigned := CASE requested
    WHEN 'verifier' THEN 'verifier'
    WHEN 'admin' THEN CASE WHEN admin_count = 0 THEN 'admin' ELSE 'pending_admin' END
    WHEN 'field_submitter' THEN 'field_submitter'
    ELSE 'field_submitter'
  END;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. issued_by on carbon_credits
ALTER TABLE public.carbon_credits ADD COLUMN IF NOT EXISTS issued_by uuid REFERENCES auth.users(id);
UPDATE public.carbon_credits SET issued_by = calculated_by WHERE issued_by IS NULL;

-- 3. two-person rule + verified-only enforcement
CREATE OR REPLACE FUNCTION public.enforce_credit_issuance_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ev RECORD;
BEGIN
  IF NEW.issued_by IS NULL THEN
    RAISE EXCEPTION 'Carbon credits must record the issuing admin.';
  END IF;

  IF NOT public.has_role(NEW.issued_by, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only approved admins can issue carbon credits.';
  END IF;

  IF NEW.evidence_id IS NULL THEN
    RAISE EXCEPTION 'Carbon credits must reference a verified evidence submission.';
  END IF;

  SELECT id, status, reviewed_by, project_id INTO ev
  FROM public.evidence_submissions WHERE id = NEW.evidence_id;

  IF ev.id IS NULL THEN
    RAISE EXCEPTION 'Evidence submission not found.';
  END IF;

  IF ev.status <> 'verified'::public.evidence_status THEN
    RAISE EXCEPTION 'Carbon credits can only be issued for verified evidence (current status: %).', ev.status;
  END IF;

  IF ev.reviewed_by IS NOT NULL AND ev.reviewed_by = NEW.issued_by THEN
    RAISE EXCEPTION 'Two-person rule: the admin issuing credits must be different from the verifier who approved this evidence.';
  END IF;

  IF ev.project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'Evidence does not belong to the selected project.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_credit_issuance ON public.carbon_credits;
CREATE TRIGGER enforce_credit_issuance
BEFORE INSERT OR UPDATE ON public.carbon_credits
FOR EACH ROW EXECUTE FUNCTION public.enforce_credit_issuance_rules();

-- 4. RLS: admin-only issuance
DROP POLICY IF EXISTS "Verifiers and admins can create carbon credits" ON public.carbon_credits;
DROP POLICY IF EXISTS "Verifiers and admins can update carbon credits" ON public.carbon_credits;
DROP POLICY IF EXISTS "Admins can delete carbon credits" ON public.carbon_credits;

CREATE POLICY "Only admins can issue carbon credits"
ON public.carbon_credits FOR INSERT TO authenticated
WITH CHECK (
  issued_by = auth.uid()
  AND calculated_by = auth.uid()
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Only admins can update carbon credits"
ON public.carbon_credits FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. immutable audit log with hash chain
CREATE TABLE IF NOT EXISTS public.issuance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id uuid,
  admin_id uuid NOT NULL,
  evidence_id uuid,
  project_id uuid NOT NULL,
  tco2e_amount numeric NOT NULL,
  prev_hash text,
  record_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.issuance_audit_log TO authenticated;
GRANT ALL ON public.issuance_audit_log TO service_role;

ALTER TABLE public.issuance_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read the issuance audit log"
ON public.issuance_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.log_credit_issuance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev text;
  payload text;
BEGIN
  SELECT record_hash INTO prev
  FROM public.issuance_audit_log
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  payload := COALESCE(prev, '') || '|' || NEW.id::text || '|' || NEW.issued_by::text || '|'
    || COALESCE(NEW.evidence_id::text, '') || '|' || NEW.project_id::text || '|'
    || NEW.tco2e::text || '|' || now()::text;

  INSERT INTO public.issuance_audit_log
    (credit_id, admin_id, evidence_id, project_id, tco2e_amount, prev_hash, record_hash)
  VALUES (
    NEW.id, NEW.issued_by, NEW.evidence_id, NEW.project_id, NEW.tco2e, prev,
    encode(extensions.digest(payload, 'sha256'), 'hex')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_credit_issuance_trigger ON public.carbon_credits;
CREATE TRIGGER log_credit_issuance_trigger
AFTER INSERT ON public.carbon_credits
FOR EACH ROW EXECUTE FUNCTION public.log_credit_issuance();

-- 6. role scoped reads
DROP POLICY IF EXISTS "Authenticated users can view evidence" ON public.evidence_submissions;
CREATE POLICY "Role scoped evidence reads"
ON public.evidence_submissions FOR SELECT TO authenticated
USING (
  auth.uid() = submitter_id
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = evidence_submissions.project_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'verifier'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Role scoped project reads"
ON public.projects FOR SELECT TO authenticated
USING (
  auth.uid() = owner_id
  OR status <> 'draft'::public.project_status
  OR public.has_role(auth.uid(), 'verifier'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view carbon credits" ON public.carbon_credits;
CREATE POLICY "Role scoped carbon credit reads"
ON public.carbon_credits FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = carbon_credits.project_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'verifier'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
CREATE POLICY "Role scoped alert reads"
ON public.alerts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = alerts.project_id AND p.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'verifier'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Role scoped profile reads"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'verifier'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 7. keep at least one role per user
CREATE OR REPLACE FUNCTION public.prevent_last_role_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = OLD.user_id AND id <> OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot remove the last role for this user; assign another role first.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_role_removal ON public.user_roles;
CREATE TRIGGER prevent_last_role_removal
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_role_removal();

REVOKE ALL ON FUNCTION public.enforce_credit_issuance_rules() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_credit_issuance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_role_removal() FROM public, anon, authenticated;