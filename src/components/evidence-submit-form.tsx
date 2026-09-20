import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crosshair, FileClock, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { analyzeEvidencePhoto } from "@/lib/evidence.functions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type Draft = { lat: string; lng: string; capturedAt: string; notes: string; savedAt: string };

function draftKey(projectId: string) {
  return `bluechain:evidence-draft:${projectId}`;
}

function loadDraft(projectId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(projectId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function EvidenceSubmitForm({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const analyze = useServerFn(analyzeEvidencePhoto);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [capturedAt, setCapturedAt] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<Draft | null>(null);

  // On mount: offer to restore an autosaved draft for this project.
  useEffect(() => {
    const draft = loadDraft(projectId);
    if (draft && (draft.notes || draft.lat || draft.lng)) setDraftBanner(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Autosave notes/coordinates/date as a local draft — protects field work from
  // spotty connectivity or accidental navigation.
  useEffect(() => {
    if (!notes && !lat && !lng) return;
    const timeout = setTimeout(() => {
      try {
        const draft: Draft = { lat, lng, capturedAt, notes, savedAt: new Date().toISOString() };
        localStorage.setItem(draftKey(projectId), JSON.stringify(draft));
      } catch {
        // Storage may be unavailable (e.g. private browsing) — safe to ignore.
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [projectId, lat, lng, capturedAt, notes]);

  function restoreDraft() {
    if (!draftBanner) return;
    setLat(draftBanner.lat);
    setLng(draftBanner.lng);
    setCapturedAt(draftBanner.capturedAt || todayISO());
    setNotes(draftBanner.notes);
    setDraftBanner(null);
    toast.success("Draft restored");
  }

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey(projectId));
    } catch {
      // ignore
    }
    setDraftBanner(null);
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey(projectId));
    } catch {
      // ignore
    }
  }

  function onPickFile(selected: File | null) {
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  function captureGps() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast.success("GPS position captured");
      },
      () => {
        setLocating(false);
        toast.error("Could not read GPS position — enter coordinates manually");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const latNum = lat.trim() === "" ? null : Number(lat);
  const lngNum = lng.trim() === "" ? null : Number(lng);
  const coordsValid =
    (latNum === null && lngNum === null) ||
    (Number.isFinite(latNum) &&
      Number.isFinite(lngNum) &&
      Math.abs(latNum as number) <= 90 &&
      Math.abs(lngNum as number) <= 180);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error("Please attach a photo");
      return;
    }
    if (!coordsValid) {
      toast.error("Enter both latitude and longitude, or leave both empty");
      return;
    }

    setBusy(true);
    try {
      setStage("Uploading photo…");
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("You must be signed in");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${projectId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("evidence-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;

      setStage("Saving submission…");
      const { data: inserted, error: insertError } = await supabase
        .from("evidence_submissions")
        .insert({
          project_id: projectId,
          submitter_id: userId,
          submission_type: "photo",
          photo_path: path,
          notes: notes.trim() || null,
          latitude: latNum,
          longitude: lngNum,
          captured_at: new Date(`${capturedAt}T12:00:00`).toISOString(),
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      setStage("Running AI vegetation analysis…");
      try {
        const result = await analyze({ data: { evidenceId: inserted.id } });
        if (result.status === "flagged") {
          toast.warning(`Flagged for review — AI confidence ${result.confidence_score}%`);
        } else {
          toast.success(`Evidence submitted — AI confidence ${result.confidence_score}%`);
        }
      } catch (aiError) {
        console.error(aiError);
        toast.warning("Evidence saved, but AI analysis failed. It stays pending review.");
      }

      onPickFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setNotes("");
      setLat("");
      setLng("");
      setCapturedAt(todayISO());
      clearDraft();
      await queryClient.invalidateQueries({ queryKey: ["project-evidence", projectId] });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not submit evidence");
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImagePlus className="size-4 text-primary" />
          Submit evidence
        </CardTitle>
        <CardDescription>
          Upload a field photo — AI scores vegetation health and ecosystem consistency on submit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {draftBanner && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
            <span className="flex items-center gap-2 text-primary">
              <FileClock className="size-4" />
              You have an unsaved draft from {new Date(draftBanner.savedAt).toLocaleString()}.
            </span>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={restoreDraft}>
                Restore
              </Button>
              <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={discardDraft}>
                <X className="size-3.5" /> Discard
              </Button>
            </div>
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="photo-develop space-y-2">
            <Label htmlFor="evidence-photo">Photo</Label>
            <div className="photo-tray">
              <Input
                id="evidence-photo"
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              {!previewUrl && <div className="photo-placeholder"><ImagePlus className="size-7" /><span>Field photograph · ready to develop</span></div>}
            </div>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected evidence preview"
                className="polaroid h-48 w-full object-cover"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="evidence-lat">Latitude</Label>
              <Input
                id="evidence-lat" className="field-mono"
                inputMode="decimal"
                placeholder="11.9416"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evidence-lng">Longitude</Label>
              <Input
                id="evidence-lng" className="field-mono"
                inputMode="decimal"
                placeholder="79.8083"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={captureGps}
            disabled={locating}
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            Auto-capture GPS
          </Button>

          <div className="space-y-2">
            <Label htmlFor="evidence-date">Submission date</Label>
            <Input
              id="evidence-date"
              type="date"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence-notes">Description</Label>
            <Textarea
              id="evidence-notes"
              rows={3}
              placeholder="What does this photo show?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full gap-2" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {stage ?? "Submit & analyze"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
