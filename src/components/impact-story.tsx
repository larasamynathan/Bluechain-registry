import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getImpactStory, getPublicImpactStory } from "@/lib/impact.functions";

export function ImpactStory({
  projectId,
  scope,
  variant = "inline",
}: {
  projectId: string;
  scope: "public" | "authenticated";
  variant?: "inline" | "lead";
}) {
  const fetchStory = useServerFn(scope === "public" ? getPublicImpactStory : getImpactStory);
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ["impact-story", scope, projectId],
    queryFn: () => fetchStory({ data: { projectId } }),
    staleTime: 30_000,
  });

  const story = query.data?.story ?? null;
  const lead = variant === "lead";

  async function copy() {
    if (!story) return;
    try {
      await navigator.clipboard.writeText(story);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Summary copied to your clipboard");
    } catch {
      toast.error("Could not copy — select the text and copy manually");
    }
  }

  return (
    <section
      className={
        lead
          ? "relative overflow-hidden rounded-[1.5rem] rounded-tl-sm border border-primary/30 bg-primary/[0.07] p-7 shadow-depth"
          : "relative overflow-hidden rounded-xl rounded-tl-sm border border-primary/25 bg-primary/[0.05] p-5"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          <Sprout className="size-3.5" />
          Restoration impact story
        </p>
        {story && (
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Copy summary
          </Button>
        )}
      </div>

      {query.isPending ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Writing the latest impact summary…
        </p>
      ) : story ? (
        <p
          className={
            lead
              ? "mt-4 font-display text-xl leading-relaxed text-foreground sm:text-2xl"
              : "mt-3 font-display text-lg leading-relaxed text-foreground"
          }
        >
          {story}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          The impact summary appears once this site has field records to summarise.
        </p>
      )}
    </section>
  );
}
