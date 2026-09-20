export function ProjectMap({
  latitude,
  longitude,
  zoomSpan = 0.05,
  className = "h-64",
  title = "Project location map",
}: {
  latitude: number;
  longitude: number;
  zoomSpan?: number;
  className?: string;
  title?: string;
}) {
  const bbox = [
    longitude - zoomSpan,
    latitude - zoomSpan / 2,
    longitude + zoomSpan,
    latitude + zoomSpan / 2,
  ].join("%2C");

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className={`overflow-hidden rounded-xl border border-border/70 ${className}`}>
      <iframe
        title={title}
        src={src}
        className="size-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
