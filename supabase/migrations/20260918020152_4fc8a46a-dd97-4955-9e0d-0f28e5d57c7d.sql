ALTER TABLE public.evidence_submissions
  ADD COLUMN IF NOT EXISTS species_suggested text,
  ADD COLUMN IF NOT EXISTS species_name text,
  ADD COLUMN IF NOT EXISTS species_confirmed boolean;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS impact_story text,
  ADD COLUMN IF NOT EXISTS impact_story_generated_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.evidence_annotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_id uuid NOT NULL REFERENCES public.evidence_submissions(id) ON DELETE CASCADE,
  verifier_id uuid NOT NULL REFERENCES auth.users(id),
  shape_type text NOT NULL,
  coordinates jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_annotations_evidence_id_idx
  ON public.evidence_annotations (evidence_id);

GRANT SELECT, INSERT ON public.evidence_annotations TO authenticated;
GRANT SELECT ON public.evidence_annotations TO anon;
GRANT ALL ON public.evidence_annotations TO service_role;

ALTER TABLE public.evidence_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verifiers and admins can add annotations"
ON public.evidence_annotations FOR INSERT TO authenticated
WITH CHECK (
  verifier_id = auth.uid()
  AND (public.has_role(auth.uid(), 'verifier'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Role scoped annotation reads"
ON public.evidence_annotations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.evidence_submissions e
    WHERE e.id = evidence_annotations.evidence_id
      AND (
        e.submitter_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = e.project_id AND p.owner_id = auth.uid())
        OR public.has_role(auth.uid(), 'verifier'::public.app_role)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

CREATE POLICY "Public can view annotations on published evidence"
ON public.evidence_annotations FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.evidence_submissions e
    JOIN public.projects p ON p.id = e.project_id
    WHERE e.id = evidence_annotations.evidence_id
      AND e.status IN ('approved'::public.evidence_status, 'verified'::public.evidence_status)
      AND p.status <> 'draft'::public.project_status
  )
);