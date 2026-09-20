import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DropletCheck, EvidenceMark, MangroveMark, TideMark } from "@/components/coastal-icons";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlueChain Registry — Blue Carbon MRV Platform" },
      {
        name: "description",
        content:
          "Transparent, verifiable blue carbon restoration tracking for mangrove, seagrass and salt marsh projects.",
      },
      { property: "og:title", content: "BlueChain Registry — Blue Carbon MRV Platform" },
      {
        property: "og:description",
        content:
          "Transparent, verifiable blue carbon restoration tracking for mangrove, seagrass and salt marsh projects.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: EvidenceMark,
    title: "Monitoring",
    body: "Field surveys, sensors and imagery captured against every restoration site.",
  },
  {
    icon: DropletCheck,
    title: "Verification",
    body: "Independent verifier review with attestations anchored on-chain.",
  },
  {
    icon: MangroveMark,
    title: "Public registry",
    body: "Anyone can audit projects, monitoring reports and issued credits.",
  },
] as const;

function Landing() {
  return (
    <div className="landing-page min-h-screen">
      <header className="landing-nav">
        <nav className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <span className="brand-mark flex size-9 items-center justify-center text-primary">
            <TideMark className="size-5" />
          </span>
          <span className="font-display font-semibold">BlueChain Registry</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/registry">Public Registry</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-sheet mx-auto max-w-6xl px-7 py-12 sm:px-14 sm:py-16">
            <div className="field-meta mb-16 flex items-center justify-between gap-4">
              <span><i /> Coastal field ledger · live registry</span>
              <span className="field-stamp">Edition 01 · MRV</span>
            </div>
            <div className="max-w-3xl">
            <span className="field-label">Monitoring · Reporting · Verification</span>
            <h1 className="mt-5 text-6xl font-medium leading-[0.88] sm:text-8xl">
              BlueChain <em className="text-primary">Registry</em>
            </h1>
            <p className="typewriter-log mt-8 text-lg text-foreground sm:text-xl">
              Transparent, verifiable blue carbon restoration tracking
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Monitoring, reporting and verification for mangrove, seagrass and salt marsh
              restoration — every claim backed by evidence and an immutable audit trail.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/registry">View Public Registry</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div></div>
            <div className="tidal-rule mt-20" aria-hidden="true" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="editorial-pillars grid gap-0 sm:grid-cols-3">
            {pillars.map((p, index) => (
              <article key={p.title} className="pillar-note">
                <div className="flex items-start justify-between">
                  <p.icon className="size-7 text-primary" />
                  <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                </div>
                <h2 className="mt-8 text-2xl">{p.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="tidal-footer py-8">
        <p className="text-center text-xs text-muted-foreground">
          BlueChain Registry — blue carbon MRV for coastal ecosystems.
        </p>
      </footer>
    </div>
  );
}
