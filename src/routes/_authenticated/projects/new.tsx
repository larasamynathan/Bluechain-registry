import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Crosshair, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { ProjectMap } from "@/components/project-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";
import { ECOSYSTEMS, type Ecosystem } from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/projects/new")({
  head: () => ({
    meta: [
      { title: "New Project — BlueChain Registry" },
      {
        name: "description",
        content: "Register a new blue carbon restoration site with ecosystem type, location and area.",
      },
      { property: "og:title", content: "New Project — BlueChain Registry" },
      {
        property: "og:description",
        content: "Register a new blue carbon restoration site with ecosystem type, location and area.",
      },
    ],
  }),
  component: NewProjectPage,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canCreateProjects, isLoading: rolesLoading } = useRoles();

  const [name, setName] = useState("");
  const [ecosystem, setEcosystem] = useState<Ecosystem>("mangrove");
  const [lat, setLat] = useState("11.9416");
  const [lng, setLng] = useState("79.8083");
  const [area, setArea] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const coordsValid =
    Number.isFinite(latNum) && Number.isFinite(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180;

  if (rolesLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking permissions…
      </div>
    );
  }

  if (!canCreateProjects) {
    return (
      <Card className="mx-auto max-w-lg border-destructive/40">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <CardTitle className="text-base">Permission required</CardTitle>
            <CardDescription>
              Only field submitters and admins can register new projects.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        toast.success("Location captured.");
      },
      () => toast.error("Could not read your location."),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coordsValid) {
      toast.error("Enter a valid latitude and longitude.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      toast.error("Session expired. Please sign in again.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: userId,
        name: name.trim(),
        ecosystem,
        latitude: latNum,
        longitude: lngNum,
        area_hectares: Number(area || 0),
        description: description.trim() || null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    toast.success("Project registered.");
    navigate({ to: "/projects/$projectId", params: { projectId: data.id } });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">New Project</h1>
        <p className="text-sm text-muted-foreground">
          Register a restoration site so it can carry evidence, alerts and verification records.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site details</CardTitle>
            <CardDescription>Name, ecosystem and extent of the restoration area.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pichavaram mangrove restoration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ecosystem">Ecosystem type</Label>
              <Select value={ecosystem} onValueChange={(v) => setEcosystem(v as Ecosystem)}>
                <SelectTrigger id="ecosystem">
                  <SelectValue placeholder="Select ecosystem" />
                </SelectTrigger>
                <SelectContent>
                  {ECOSYSTEMS.map((eco) => (
                    <SelectItem key={eco.value} value={eco.value}>
                      {eco.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area (hectares)</Label>
              <Input
                id="area"
                type="number"
                min="0"
                step="0.01"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="120.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Restoration approach, species planted, community partners…"
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Register project
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
            <CardDescription>
              Enter coordinates or capture your current position; the map previews the site.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" value={lat} onChange={(e) => setLat(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" value={lng} onChange={(e) => setLng(e.target.value)} required />
              </div>
            </div>

            <Button type="button" variant="secondary" className="gap-2" onClick={useMyLocation}>
              <Crosshair className="size-4" />
              Use my current location
            </Button>

            {coordsValid ? (
              <ProjectMap latitude={latNum} longitude={lngNum} className="h-72" />
            ) : (
              <p className="text-sm text-destructive">Enter valid coordinates to preview the map.</p>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
