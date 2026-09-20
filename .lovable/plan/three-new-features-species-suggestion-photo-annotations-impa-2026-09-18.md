# Three new features: species suggestion, photo annotations, impact story

All existing pages, roles, dashboards, sidebars, tables and the two-person credit issuance rule stay exactly as they are. These are additions only.

## 1. Species auto-suggest (Submit Evidence)

- After a photo is attached, the AI analysis step also returns a best-guess species name for the declared ecosystem (mangrove / seagrass / salt marsh) with its own confidence.
- A suggestion chip appears above the description field: "AI suggests: Rhizophora mucronata — is this correct?" with **Confirm** and **Not quite, let me specify**.
- Choosing "not quite" reveals a species text box the submitter fills in themselves.
- The suggestion never blocks submitting: leaving it untouched simply records the suggestion with no confirmation.
- Stored on each submission: the AI's suggested name, the final species name, and whether the human confirmed it.
- The species line and an agreement marker ("confirmed by submitter" / "submitter disagreed: <their value>") appear wherever the AI confidence breakdown is already shown — submission detail, the verifier review panel, and the public registry evidence captions. Disagreement is highlighted as a review signal.

## 2. Split-screen annotation tool (verifier review)

- In the verifier review panel, the full-size photo gets a drawing overlay with three tools — circle, rectangle, freehand pen — plus **Undo** and **Clear**.
- Each drawn shape gets a short note ("dead saplings here"). Shapes are listed beside the photo, numbered, so notes map to marks.
- Annotations are saved when the verifier submits Approve or Reject, together with their existing review notes. Nothing about the decision flow or its rules changes.
- Once a decision is recorded, annotations become read-only and render as a static overlay for anyone who opens that evidence record afterwards — including the field submitter's My Submissions detail view and, for published evidence, the public registry.

## 3. Restoration impact story (project detail + public registry)

- Each project gets a short generated narrative near the top of its detail page, e.g. "Since 12 March 2026, Pichavaram North has grown from 34% to 61% canopy cover across 7 verified submissions, with 42.6 tCO2e in carbon credits issued to date."
- Built from real project data only: start date, verified submission count, first vs latest canopy/health readings, total credits issued, current status. Written by AI for readability, and always regenerated from the current numbers.
- Regenerates automatically when a submission is verified or credits are issued for that project — no manual refresh.
- A **Copy summary** button copies the text for funder reports.
- On the public registry project page it is the lead element: larger type, highlighted card treatment consistent with the tidal-notebook design language.

## Technical notes

- Migration: add `species_suggested`, `species_name`, `species_confirmed` to `evidence_submissions`; add `impact_story` + `impact_story_generated_at` to `projects`; create `evidence_annotations` (evidence_id, verifier_id, shape_type, coordinates jsonb, note, created_at) with grants and RLS — verifiers insert their own rows while the submission is under review; anyone who can already read the evidence record can read its annotations; no updates or deletes after the decision.
- `analyzeEvidencePhoto` server function gains species fields in its tool schema and persists them; the client passes the submitter's confirm/override choice back through a small server function.
- Annotation coordinates are stored normalised (0–1) against the image so the overlay scales correctly at any display size; drawing uses a plain canvas overlay, no new drawing library.
- New server function `generateProjectImpactStory` (Lovable AI, `openai/gpt-6-astra`) recomputes and caches the story; it is called after a verification decision and after credit issuance, and lazily when a project page is opened with stale numbers. Public registry reads the cached text via the existing public project server function, so no key is exposed.
- Public registry read path extends the existing `getPublicProject` selection with the species, annotation and story fields.

## Verification

End-to-end after implementation: submit evidence with both confirm and override paths; review it as a verifier, draw an annotation with a note, approve, and confirm it persists read-only for the submitter; then check the project detail page and public registry entry reflect the updated numbers in the story.
