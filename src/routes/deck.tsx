import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { slides } from "@/components/deck-slides";

export const Route = createFileRoute("/deck")({
  head: () => ({
    meta: [
      { title: "Route Efficiency Briefing — Nassau Candy Distributor" },
      {
        name: "description",
        content:
          "Ten-slide logistics briefing on Nassau Candy factory-to-customer route efficiency: regional, factory, ship-mode and bottleneck analysis.",
      },
      { property: "og:title", content: "Route Efficiency Briefing — Nassau Candy Distributor" },
      {
        property: "og:description",
        content:
          "Regional, factory, ship-mode and bottleneck analysis of 10,194 factory-to-customer shipments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    slide: Math.max(1, Number(s["slide"]) || 1),
    print: s["print"] === true || s["print"] === "true" || s["print"] === "",
  }),
  component: DeckPage,
});

function ScaledSlide({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / 1920, r.height / 1080));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} style={style} className={`relative overflow-hidden ${className}`}>
      <div
        className="slide-content absolute left-1/2 top-1/2 -ml-[960px] -mt-[540px] origin-center"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function DeckPage() {
  const { slide, print } = Route.useSearch();
  const navigate = Route.useNavigate();
  const index = Math.min(slide, slides.length);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 1), slides.length);
      navigate({ search: (p) => ({ ...p, slide: clamped }), replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (print) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.();
      if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, print]);

  const current = slides[index - 1]!;

  useEffect(() => {
    document.title = `${index}/${slides.length} — ${current.title} · Nassau Briefing`;
  }, [index, current]);

  if (print) {
    return (
      <div className="bg-background">
        {slides.map((s, i) => (
          <div key={s.title} className="slide-print-page" style={{ width: 1920, height: 1080 }}>
            <div className="slide-content">{s.render()}</div>
            {i < slides.length - 1 ? null : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-3 print:hidden">
        <div className="flex items-center gap-3">
          <span className="h-6 w-2 rounded-full bg-primary" />
          <span className="text-sm font-bold tracking-tight text-card-foreground">
            Route Efficiency Briefing
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {current.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/deck"
            search={{ slide: index, print: true }}
            target="_blank"
            className="rounded-sm border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Print / PDF
          </Link>
          <Link
            to="/"
            className="rounded-sm border border-border px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[190px] shrink-0 space-y-2 overflow-y-auto border-r border-border p-3">
          {slides.map((s, i) => (
            <button
              key={s.title}
              onClick={() => go(i + 1)}
              className={`block w-full cursor-pointer overflow-hidden rounded-sm border text-left transition-colors ${
                i + 1 === index ? "border-primary" : "border-border hover:border-muted-foreground"
              }`}
            >
              <ScaledSlide className="aspect-video w-full">{s.render()}</ScaledSlide>
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">{s.title}</span>
              </div>
            </button>
          ))}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col p-6">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <ScaledSlide
              style={{ aspectRatio: "16 / 9" }}
              className="max-h-full w-full max-w-full rounded-md border border-border"
            >
              {current.render()}
            </ScaledSlide>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => go(index - 1)}
              disabled={index === 1}
              className="cursor-pointer rounded-sm border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-30"
            >
              Prev
            </button>
            <span className="font-mono text-xs text-muted-foreground">
              {String(index).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
            <button
              onClick={() => go(index + 1)}
              disabled={index === slides.length}
              className="cursor-pointer rounded-sm border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
