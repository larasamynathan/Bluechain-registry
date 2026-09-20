import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PagePlaceholder({
  title,
  description,
  icon,
  note,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  note?: string;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center gap-3">
          {icon && (
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
              {icon}
            </span>
          )}
          <div>
            <CardTitle className="text-base">Coming next</CardTitle>
            <CardDescription>
              {note ?? "This section is scaffolded and ready for data and workflows."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-border/60 bg-muted/40" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
