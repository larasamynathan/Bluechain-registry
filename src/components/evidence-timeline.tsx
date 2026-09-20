import { useQuery } from "@tanstack/react-query";
import { CircleDashed, ImageOff, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { aiScoreBadgeClass, evidenceBadgeClass, evidenceStatusLabel } from "@/lib/projects";

type Evidence = Database["public"]["Tables"]["evidence_submissions"]["Row"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EvidenceThumb({ path }: { path: string | null }) {
  const { data } = useQuery({
    queryKey: ["evidence-thumb", path],
    enabled: Boolean(path),
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("evidence-photos")
        .createSignedUrl(path as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (!path || !data) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted text-muted-foreground">
        <ImageOff className="size-4" />
      </div>
    );
  }

  return (
    <img
      src={data}
      alt="Evidence submission thumbnail"
      loading="lazy"
      className="size-16 shrink-0 rounded-lg border border-border/60 object-cover"
    />
  );
}

export function EvidenceTimeline({
  items,
  isLoading,
}: {
  items: Evidence[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading evidence…</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence submitted yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-border/70 pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[27px] top-6 flex size-3.5 items-center justify-center rounded-full border-2 border-background bg-primary" />
          <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <EvidenceThumb path={item.photo_path} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{formatDate(item.captured_at)}</span>
                <Badge variant="outline" className={evidenceBadgeClass(item.status)}>
                  {evidenceStatusLabel(item.status)}
                </Badge>
                {item.ai_confidence_score !== null ? (
                  <Badge variant="outline" className={aiScoreBadgeClass(item.ai_confidence_score)}>
                    AI {item.ai_confidence_score}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <CircleDashed className="size-3" /> No AI score
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{item.notes || "No description"}</p>
              {item.ai_summary && (
                <p className="text-xs italic text-muted-foreground">{item.ai_summary}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {item.ai_vegetation_health !== null && (
                  <span>Vegetation health {item.ai_vegetation_health}%</span>
                )}
                {item.ai_canopy_density !== null && <span>Canopy {item.ai_canopy_density}%</span>}
                {item.ai_ecosystem_match !== null && (
                  <span>
                    Ecosystem match: {item.ai_ecosystem_match ? "consistent" : "inconsistent"}
                  </span>
                )}
                {item.latitude !== null && item.longitude !== null && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
                  </span>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
