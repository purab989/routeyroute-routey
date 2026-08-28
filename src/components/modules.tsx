import { useMemo, useState } from "react";
import {
  FACTORY_CODE,
  FACTORY_COORDS,
  fmt,
  groupStats,
  type GroupStat,
  type Shipment,
} from "@/lib/shipping";
import { MAP_H, MAP_W, project, STATE_CENTROIDS } from "@/lib/geo";

function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border border-border bg-card ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
        {meta && (
          <span className="font-mono text-[10px] uppercase text-muted-foreground">{meta}</span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

/** Heat tier -> token-based classes (0 = best, 4 = worst). */
function tier(score: number): { fill: string; text: string; label: string } {
  if (score >= 80) return { fill: "var(--color-success)", text: "text-success", label: "OPTIMAL" };
  if (score >= 60) return { fill: "var(--color-primary)", text: "text-primary", label: "GOOD" };
  if (score >= 40)
    return { fill: "var(--color-muted-foreground)", text: "text-muted-foreground", label: "STEADY" };
  if (score >= 20) return { fill: "var(--color-warning)", text: "text-warning", label: "SLOW" };
  return { fill: "var(--color-destructive)", text: "text-destructive", label: "BOTTLENECK" };
}

/* ---------------- Geographic Shipping Map ---------------- */

export function GeoMap({
  data,
  threshold,
  selectedState,
  onSelectState,
}: {
  data: Shipment[];
  threshold: number;
  selectedState: string | null;
  onSelectState: (s: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const states = useMemo(
    () => groupStats(data, threshold, (s) => s.state),
    [data, threshold],
  );
  const regions = useMemo(
    () => groupStats(data, threshold, (s) => s.region),
    [data, threshold],
  );

  const maxVol = Math.max(1, ...states.map((s) => s.shipments));
  const byKey = new Map(states.map((s) => [s.key, s]));
  const active = hover ?? selectedState;
  const activeStat = active ? byKey.get(active) : undefined;

  return (
    <Panel
      title="Geographic Shipping Map"
      meta={`${states.length} states · bubble = volume · color = efficiency`}
      className="lg:col-span-2"
    >
      <div className="relative">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full">
          <defs>
            <pattern id="grid" width="45" height="45" patternUnits="userSpaceOnUse">
              <path
                d="M 45 0 L 0 0 0 45"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#grid)" opacity="0.5" />

          {/* corridors from factories to states */}
          {states.map((st) => {
            const c = STATE_CENTROIDS[st.key];
            if (!c) return null;
            const dest = project(c.lat, c.lon);
            const source = data.find((d) => d.state === st.key)?.factory;
            const fc = source ? FACTORY_COORDS[source] : undefined;
            if (!fc) return null;
            const orig = project(fc.lat, fc.lon);
            return (
              <line
                key={`l-${st.key}`}
                x1={orig.x}
                y1={orig.y}
                x2={dest.x}
                y2={dest.y}
                stroke="var(--color-primary)"
                strokeWidth={active === st.key ? 1.4 : 0.4}
                opacity={active === st.key ? 0.8 : 0.12}
              />
            );
          })}

          {/* factories */}
          {Object.entries(FACTORY_COORDS).map(([name, c]) => {
            const p = project(c.lat, c.lon);
            return (
              <g key={name}>
                <rect
                  x={p.x - 5}
                  y={p.y - 5}
                  width={10}
                  height={10}
                  fill="var(--color-card)"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                />
                <text
                  x={p.x}
                  y={p.y - 11}
                  textAnchor="middle"
                  className="fill-primary font-mono"
                  fontSize="10"
                >
                  {FACTORY_CODE[name]}
                </text>
              </g>
            );
          })}

          {/* state heat bubbles */}
          {states.map((st) => {
            const c = STATE_CENTROIDS[st.key];
            if (!c) return null;
            const p = project(c.lat, c.lon);
            const r = 5 + Math.sqrt(st.shipments / maxVol) * 20;
            const t = tier(st.score);
            const on = active === st.key;
            return (
              <g
                key={st.key}
                className="cursor-pointer"
                onMouseEnter={() => setHover(st.key)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectState(selectedState === st.key ? null : st.key)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={t.fill}
                  opacity={on ? 0.55 : 0.28}
                  stroke={t.fill}
                  strokeWidth={on ? 2 : 1}
                />
                <text
                  x={p.x}
                  y={p.y + 3}
                  textAnchor="middle"
                  fontSize="9"
                  className="pointer-events-none fill-current font-mono text-foreground"
                >
                  {c.abbr}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute right-2 top-2 w-52 rounded border border-border bg-background/90 p-3 font-mono text-[10px]">
          {activeStat ? (
            <>
              <div className="text-card-foreground">{activeStat.key.toUpperCase()}</div>
              <div className="tabular mt-1 text-muted-foreground">
                avg {fmt(activeStat.avgLeadTime, 2)}d · n={activeStat.shipments}
              </div>
              <div className="tabular text-muted-foreground">
                delay {fmt(activeStat.delayRate)}% · p90 {activeStat.p90LeadTime}d
              </div>
              <div className={`mt-1 font-bold ${tier(activeStat.score).text}`}>
                {tier(activeStat.score).label} · SCORE {activeStat.score}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">HOVER A STATE · CLICK TO DRILL DOWN</div>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Regional Bottlenecks
          </h4>
          <span className="font-mono text-[10px] text-muted-foreground">
            SORTED BY AVG LEAD TIME
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...regions].reverse().map((r) => {
            const t = tier(r.score);
            return (
              <div key={r.key} className="rounded border border-border bg-background p-3">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">
                  {r.key}
                </div>
                <div className="tabular font-mono text-xl font-bold text-card-foreground">
                  {fmt(r.avgLeadTime, 2)}d
                </div>
                <div className={`font-mono text-[10px] font-bold ${t.text}`}>{t.label}</div>
                <div className="tabular mt-1 font-mono text-[10px] text-muted-foreground">
                  n={r.shipments} · delay {fmt(r.delayRate)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ---------------- Ship Mode Comparison ---------------- */

export function ShipModeComparison({
  data,
  threshold,
}: {
  data: Shipment[];
  threshold: number;
}) {
  const modes = useMemo(
    () => groupStats(data, threshold, (s) => s.shipMode),
    [data, threshold],
  );
  const max = Math.max(1, ...modes.map((m) => m.p90LeadTime));

  return (
    <Panel title="Ship Mode Comparison" meta={`${modes.length} methods`}>
      <div className="space-y-5">
        {modes.map((m) => {
          const t = tier(m.score);
          return (
            <div key={m.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-bold text-card-foreground">{m.key}</span>
                <span className="tabular font-mono text-xs text-card-foreground">
                  {fmt(m.avgLeadTime, 2)}d
                </span>
              </div>
              <div className="relative h-4 bg-background">
                <div
                  className="absolute inset-y-0 opacity-25"
                  style={{ width: `${(m.p90LeadTime / max) * 100}%`, background: t.fill }}
                />
                <div
                  className="animate-bar absolute inset-y-0"
                  style={{ width: `${(m.avgLeadTime / max) * 100}%`, background: t.fill }}
                />
              </div>
              <div className="tabular mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>
                  n={m.shipments} · median {m.medianLeadTime}d · p90 {m.p90LeadTime}d
                </span>
                <span>delay {fmt(m.delayRate)}%</span>
              </div>
            </div>
          );
        })}
        {modes.length === 0 && (
          <p className="font-mono text-xs text-muted-foreground">NO DATA IN CURRENT FILTERS</p>
        )}
      </div>
    </Panel>
  );
}

/* ---------------- Route Drill-Down ---------------- */

export function DrillDown({
  data,
  threshold,
  selectedState,
  onSelectState,
}: {
  data: Shipment[];
  threshold: number;
  selectedState: string | null;
  onSelectState: (s: string | null) => void;
}) {
  const stateStats: GroupStat[] = useMemo(
    () => groupStats(data, threshold, (s) => s.state),
    [data, threshold],
  );
  const current = selectedState ?? stateStats[0]?.key ?? null;
  const rows = useMemo(
    () =>
      data
        .filter((s) => s.state === current)
        .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
        .slice(0, 40),
    [data, current],
  );
  const stat = stateStats.find((s) => s.key === current);
  const maxLead = Math.max(1, ...rows.map((r) => r.leadTime));

  const byFactory = useMemo(
    () =>
      groupStats(
        data.filter((s) => s.state === current),
        threshold,
        (s) => s.factory,
      ),
    [data, current, threshold],
  );

  return (
    <Panel
      title="Route Drill-Down"
      meta={current ? `${current.toUpperCase()} · LAST 40 ORDERS` : "NO SELECTION"}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {stateStats.slice(0, 14).map((s) => (
          <button
            key={s.key}
            onClick={() => onSelectState(s.key)}
            className={`cursor-pointer rounded-sm border px-2 py-1 font-mono text-[10px] uppercase transition-colors ${
              s.key === current
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-surface-2/40"
            }`}
          >
            {STATE_CENTROIDS[s.key]?.abbr ?? s.key}
          </button>
        ))}
      </div>

      {stat ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Avg Lead", `${fmt(stat.avgLeadTime, 2)}d`],
              ["Median", `${stat.medianLeadTime}d`],
              ["P90", `${stat.p90LeadTime}d`],
              ["Delay Rate", `${fmt(stat.delayRate)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded border border-border bg-background p-3">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">{k}</div>
                <div className="tabular font-mono text-lg font-bold text-card-foreground">
                  {v}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 font-mono text-[10px] text-muted-foreground">
            {byFactory.map((f) => (
              <span key={f.key}>
                {FACTORY_CODE[f.key] ?? f.key}:{" "}
                <span className={tier(f.score).text}>{fmt(f.avgLeadTime, 2)}d</span> (n=
                {f.shipments})
              </span>
            ))}
          </div>

          <div className="mt-5 max-h-[360px] overflow-auto border-t border-border pt-4">
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={`${r.orderId}-${r.product}-${r.orderDate.getTime()}`}>
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>
                      {r.orderId} · {r.product}
                    </span>
                    <span className="tabular">
                      {r.orderDate.toISOString().slice(0, 10)} →{" "}
                      {r.shipDate.toISOString().slice(0, 10)} · {r.leadTime}d
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-background">
                    <div
                      className={`h-full ${r.leadTime > threshold ? "bg-warning" : "bg-primary"}`}
                      style={{ width: `${(r.leadTime / maxLead) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <p className="font-mono text-xs text-muted-foreground">NO ORDERS FOR SELECTION</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="font-mono text-xs text-muted-foreground">NO DATA IN CURRENT FILTERS</p>
      )}
    </Panel>
  );
}
