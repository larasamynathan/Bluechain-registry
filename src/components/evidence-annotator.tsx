import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Circle, Eraser, ImageOff, PenLine, Square, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export type ShapeType = "circle" | "rect" | "pen";

export type DraftAnnotation = {
  id: string;
  shape_type: ShapeType;
  /** Normalised 0-1 coordinates so the overlay scales with any display size. */
  coordinates: { points: { x: number; y: number }[] };
  note: string;
};

export type StoredAnnotation = {
  id: string;
  shape_type: string;
  coordinates: unknown;
  note: string | null;
};

function pointsOf(coordinates: unknown): { x: number; y: number }[] {
  const raw = (coordinates as { points?: unknown })?.points;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => ({ x: Number((p as any)?.x), y: Number((p as any)?.y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function ShapeMark({
  shapeType,
  points,
  index,
  active,
}: {
  shapeType: string;
  points: { x: number; y: number }[];
  index: number;
  active?: boolean;
}) {
  if (points.length === 0) return null;
  const stroke = active ? "hsl(var(--primary))" : "hsl(var(--destructive))";
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 2,
    vectorEffect: "non-scaling-stroke" as const,
  };
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const x = Math.min(first.x, last.x) * 100;
  const y = Math.min(first.y, last.y) * 100;
  const w = Math.abs(last.x - first.x) * 100;
  const h = Math.abs(last.y - first.y) * 100;

  return (
    <g>
      {shapeType === "rect" && <rect x={x} y={y} width={w} height={h} {...common} />}
      {shapeType === "circle" && (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />
      )}
      {shapeType === "pen" && (
        <polyline
          points={points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
          strokeLinecap="round"
          {...common}
        />
      )}
      <text
        x={Math.max(2, x)}
        y={Math.max(4, y - 1.5)}
        fill={stroke}
        fontSize="4"
        fontFamily="monospace"
      >
        {index + 1}
      </text>
    </g>
  );
}

/** Read-only overlay: the permanent record of what a verifier marked. */
export function AnnotatedPhoto({
  src,
  alt,
  annotations,
  className = "max-h-[420px] w-full rounded-xl border border-border/60 bg-muted/30 object-contain",
}: {
  src: string;
  alt: string;
  annotations: StoredAnnotation[];
  className?: string;
}) {
  return (
    <div className="relative">
      <img src={src} alt={alt} className={className} />
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {annotations.map((a, i) => (
          <ShapeMark key={a.id} shapeType={a.shape_type} points={pointsOf(a.coordinates)} index={i} />
        ))}
      </svg>
    </div>
  );
}

/** Drawing surface used by verifiers while a submission is still under review. */
export function EvidenceAnnotator({
  src,
  annotations,
  onChange,
}: {
  src: string;
  annotations: DraftAnnotation[];
  onChange: (next: DraftAnnotation[]) => void;
}) {
  const [tool, setTool] = useState<ShapeType>("circle");
  const [drawing, setDrawing] = useState<DraftAnnotation | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  function toLocal(event: React.PointerEvent) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function start(event: React.PointerEvent) {
    const point = toLocal(event);
    if (!point) return;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    setDrawing({
      id: crypto.randomUUID(),
      shape_type: tool,
      coordinates: { points: [point, point] },
      note: "",
    });
  }

  function move(event: React.PointerEvent) {
    if (!drawing) return;
    const point = toLocal(event);
    if (!point) return;
    setDrawing((prev) => {
      if (!prev) return prev;
      const points =
        prev.shape_type === "pen"
          ? [...prev.coordinates.points, point]
          : [prev.coordinates.points[0]!, point];
      return { ...prev, coordinates: { points } };
    });
  }

  function end() {
    if (!drawing) return;
    const pts = drawing.coordinates.points;
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    const tiny = Math.abs(last.x - first.x) < 0.01 && Math.abs(last.y - first.y) < 0.01;
    if (!(tiny && drawing.shape_type !== "pen")) onChange([...annotations, drawing]);
    setDrawing(null);
  }

  const visible = drawing ? [...annotations, drawing] : annotations;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Mark up the photo
        </span>
        {(
          [
            { value: "circle" as ShapeType, label: "Circle", icon: Circle },
            { value: "rect" as ShapeType, label: "Rectangle", icon: Square },
            { value: "pen" as ShapeType, label: "Freehand", icon: PenLine },
          ]
        ).map((t) => (
          <Button
            key={t.value}
            type="button"
            size="sm"
            variant={tool === t.value ? "default" : "secondary"}
            className="gap-1.5"
            onClick={() => setTool(t.value)}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          disabled={annotations.length === 0}
          onClick={() => onChange(annotations.slice(0, -1))}
        >
          <Undo2 className="size-3.5" /> Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          disabled={annotations.length === 0}
          onClick={() => onChange([])}
        >
          <Eraser className="size-3.5" /> Clear
        </Button>
      </div>

      <div
        ref={boxRef}
        className="relative touch-none select-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      >
        <img
          src={src}
          alt="Evidence photo with annotation overlay"
          draggable={false}
          className="max-h-[420px] w-full rounded-xl border border-border/60 bg-muted/30 object-contain"
        />
        <svg
          className="pointer-events-none absolute inset-0 size-full cursor-crosshair"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {visible.map((a, i) => (
            <ShapeMark
              key={a.id}
              shapeType={a.shape_type}
              points={pointsOf(a.coordinates)}
              index={i}
              active={drawing?.id === a.id}
            />
          ))}
        </svg>
      </div>

      {annotations.length > 0 && (
        <ul className="space-y-2">
          {annotations.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-destructive/40 font-mono text-[11px] text-destructive">
                {i + 1}
              </span>
              <Input
                value={a.note}
                maxLength={200}
                placeholder={`Note for mark ${i + 1} — e.g. "dead saplings here"`}
                onChange={(e) =>
                  onChange(
                    annotations.map((item) =>
                      item.id === a.id ? { ...item, note: e.target.value } : item,
                    ),
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Marks and notes are saved with your approve or reject decision and become a permanent,
        read-only part of the record.
      </p>
    </div>
  );
}

export function useEvidenceAnnotations(evidenceId: string | null) {
  return useQuery({
    queryKey: ["evidence-annotations", evidenceId],
    enabled: Boolean(evidenceId),
    queryFn: async (): Promise<StoredAnnotation[]> => {
      const { data, error } = await supabase
        .from("evidence_annotations")
        .select("id, shape_type, coordinates, note")
        .eq("evidence_id", evidenceId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StoredAnnotation[];
    },
  });
}

/** Static viewer used outside the review screen (submitter + registry views). */
export function AnnotationRecord({
  photoPath,
  annotations,
}: {
  photoPath: string | null;
  annotations: StoredAnnotation[];
}) {
  const photo = useQuery({
    queryKey: ["evidence-annotated-photo", photoPath],
    enabled: Boolean(photoPath),
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("evidence-photos")
        .createSignedUrl(photoPath as string, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  return (
    <div className="space-y-3">
      {photo.data ? (
        <AnnotatedPhoto
          src={photo.data}
          alt="Evidence photo with verifier marks"
          annotations={annotations}
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground">
          <ImageOff className="size-5" />
        </div>
      )}
      <ol className="space-y-1.5">
        {annotations.map((a, i) => (
          <li key={a.id} className="flex items-start gap-2 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-destructive/40 font-mono text-[11px] text-destructive">
              {i + 1}
            </span>
            <span className="text-muted-foreground">
              {a.note?.trim() || `${a.shape_type} mark (no note)`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
