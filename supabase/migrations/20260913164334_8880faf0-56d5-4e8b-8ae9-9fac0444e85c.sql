CREATE TYPE public.ecosystem_type AS ENUM ('mangrove', 'seagrass', 'salt_marsh');
CREATE TYPE public.project_status AS ENUM ('draft', 'active', 'monitoring', 'verified', 'archived');
CREATE TYPE public.evidence_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ecosystem public.ecosystem_type NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  area_hectares NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'draft',
  health_score INTEGER NOT NULL DEFAULT 75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Field submitters and admins can create projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND (public.has_role(auth.uid(), 'field_submitter') OR public.has_role(auth.uid(), 'admin'))
  );
CREATE POLICY "Owners and admins can update projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners and admins can delete projects" ON public.projects
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.evidence_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL DEFAULT 'photo',
  notes TEXT,
  photo_path TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.evidence_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_submissions TO authenticated;
GRANT ALL ON public.evidence_submissions TO service_role;
ALTER TABLE public.evidence_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view evidence" ON public.evidence_submissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can submit their own evidence" ON public.evidence_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitter_id);
CREATE POLICY "Submitters verifiers and admins can update evidence" ON public.evidence_submissions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = submitter_id
    OR public.has_role(auth.uid(), 'verifier')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = submitter_id
    OR public.has_role(auth.uid(), 'verifier')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Submitters and admins can delete evidence" ON public.evidence_submissions
  FOR DELETE TO authenticated
  USING (auth.uid() = submitter_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_evidence_updated_at
BEFORE UPDATE ON public.evidence_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity public.alert_severity NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts" ON public.alerts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners verifiers and admins can create alerts" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'verifier')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Owners verifiers and admins can update alerts" ON public.alerts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'verifier')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'verifier')
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins can delete alerts" ON public.alerts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_evidence_project ON public.evidence_submissions(project_id);
CREATE INDEX idx_alerts_project ON public.alerts(project_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, organization)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'organization'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'field_submitter')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TYPE public.evidence_status ADD VALUE IF NOT EXISTS 'flagged';

ALTER TABLE public.evidence_submissions
  ADD COLUMN IF NOT EXISTS ai_confidence_score integer,
  ADD COLUMN IF NOT EXISTS ai_vegetation_health integer,
  ADD COLUMN IF NOT EXISTS ai_canopy_density integer,
  ADD COLUMN IF NOT EXISTS ai_ecosystem_match boolean,
  ADD COLUMN IF NOT EXISTS ai_summary text;