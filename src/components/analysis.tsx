import { useMemo, useState } from "react";
import {
  aggregateRoutesBy,
  detectBottlenecks,
  FACTORY_CODE,
  fmt,
  shipModeTradeoff,
  type ParseResult,
  type RouteLevel,
  type Shipment,
} from "@/lib/shipping";

function Panel({
  title,
  meta,
  children,
  className = "",
  action,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border border-border bg-card ${className}`}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
        <div className="flex items-center gap-3">
          {meta && (
            <span className="font-mono text-[10px] uppercase text-muted-foreground">{meta}</span>
          )}
          {action}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

/* ---------------- Data Cleaning & Validation ---------------- */

export function DataQuality({
  parsed,
  fileName,
}: {
  parsed: ParseResult;
  fileName: string;
}) {
  const { skipped, cleaning, totalRows, shipments } = parsed;
  const rejected =
    skipped.missing + skipped.invalidDate + skipped.negative + skipped.noFactory + skipped.duplicate;
  const pass = totalRows ? (shipments.length / totalRows) * 100 : 0;

  const checks = [
    { label: "Missing shipment records", value: skipped.missing, note: "no order/ship date" },
    { label: "Invalid date formats", value: skipped.invalidDate, note: "unparseable" },
    { label: "Negative lead times", value: skipped.negative, note: "ship before order" },
    { label: "Duplicate shipment rows", value: skipped.duplicate, note: "de-duplicated" },
    { label: "Unmapped products", value: skipped.noFactory, note: "no factory match" },
  ];
  const standardized = [
    { label: "State fields normalized", value: cleaning.standardizedState },
    { label: "Region fields normalized", value: cleaning.standardizedRegion },
    { label: "Ship mode labels normalized", value: cleaning.standardizedShipMode },
    { label: "Unresolved geographies", value: cleaning.unknownState },
  ];

  return (
    <Panel
      title="Data Cleaning & Validation"
      meta={`${fileName || "dataset"} · ${totalRows.toLocaleString()} raw rows`}
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Records retained
          </p>
          <p className="tabular mt-1 font-mono text-3xl text-card-foreground">
            {shipments.length.toLocaleString()}
          </p>
          <div className="mt-3 h-2 bg-background">
            <div
              className="h-full bg-success"
              style={{ width: `${Math.min(100, pass)}%` }}
            />
          </div>
          <p className="tabular mt-2 font-mono text-[10px] text-muted-foreground">
            {fmt(pass, 2)}% PASS RATE · {rejected.toLocaleString()} REJECTED
          </p>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Validation rules
          </p>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-card-foreground">
                  {c.label}
                  <span className="ml-1 text-[10px] text-muted-foreground">({c.note})</span>
                </span>
                <span
                  className={`tabular font-mono text-xs ${
                    c.value > 0 ? "text-warning" : "text-success"
                  }`}
                >
                  {c.value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Geographic standardization
          </p>
          <ul className="space-y-2">
            {standardized.map((c) => (
              <li key={c.label} className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-card-foreground">{c.label}</span>
                <span className="tabular font-mono text-xs text-muted-foreground">{c.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
            State codes expanded, casing and whitespace unified, region and ship-mode aliases
            mapped to canonical labels before aggregation.
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------- Efficiency Benchmarking ---------------- */

export function EfficiencyBenchmark({
  data,
  threshold,
}: {
  data: Shipment[];
  threshold: number;
}) {
  const [level, setLevel] = useState<RouteLevel>("state");
  const routes = useMemo(
    () => aggregateRoutesBy(data, threshold, level),
    [data, threshold, level],
  );
  const top = routes.slice(0, 10);
  const bottom = [...routes].reverse().slice(0, 10);

  const Table = ({ rows, kind }: { rows: typeof routes; kind: "top" | "bottom" }) => (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {kind === "top" ? "Top 10 most efficient" : "Bottom 10 least efficient"}
      </p>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            {["#", "Route", "Ships", "Avg", "±σ", "Score"].map((h) => (
              <th
                key={h}
                className="pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border font-mono text-[12px]">
          {rows.map((r, i) => (
            <tr key={r.key}>
              <td className="tabular py-2 pr-2 text-muted-foreground">
                {kind === "top" ? i + 1 : routes.length - i}
              </td>
              <td className="py-2 pr-2 text-card-foreground">
                {FACTORY_CODE[r.factory] ?? "FAC"} → {r.state}
              </td>
              <td className="tabular py-2 pr-2">{r.shipments}</td>
              <td className="tabular py-2 pr-2">{fmt(r.avgLeadTime, 1)}d</td>
              <td className="tabular py-2 pr-2 text-muted-foreground">±{fmt(r.stdDev, 1)}</td>
              <td
                className={`tabular py-2 ${
                  kind === "top" ? "text-success" : "text-destructive"
                }`}
              >
                {r.score}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-3 text-[11px] text-muted-foreground">
                NO ROUTES IN CURRENT FILTERS
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <Panel
      title="Efficiency Benchmarking"
      meta={`${routes.length} routes ranked`}
      action={
        <div className="flex overflow-hidden rounded-sm border border-border">
          {(["state", "region"] as RouteLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`cursor-pointer px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
                level === l
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              → {l}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Table rows={top} kind="top" />
        <Table rows={bottom} kind="bottom" />
      </div>
    </Panel>
  );
}

/* ---------------- Geographic Bottleneck Analysis ---------------- */

export function BottleneckAnalysis({
  data,
  threshold,
  onSelectState,
}: {
  data: Shipment[];
  threshold: number;
  onSelectState?: (s: string) => void;
}) {
  const [scope, setScope] = useState<"state" | "region">("state");
  const rows = useMemo(
    () =>
      detectBottlenecks(data, threshold, (s) => (scope === "state" ? s.state : s.region)).slice(
        0,
        12,
      ),
    [data, threshold, scope],
  );
  const maxIdx = Math.max(1, ...rows.map((r) => r.congestionIndex));

  return (
    <Panel
      title="Geographic Bottleneck Analysis"
      meta="congestion index = volume share × relative slowness"
      action={
        <div className="flex overflow-hidden rounded-sm border border-border">
          {(["state", "region"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setScope(l)}
              className={`cursor-pointer px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
                scope === l
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-4">
        {rows.map((r) => (
          <div
            key={r.key}
            onClick={() => scope === "state" && onSelectState?.(r.key)}
            className={scope === "state" ? "cursor-pointer" : ""}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold text-card-foreground">{r.key}</span>
              <span className="tabular font-mono text-xs text-card-foreground">
                CI {fmt(r.congestionIndex, 1)}
              </span>
            </div>
            <div className="mt-1 h-3 bg-background">
              <div
                className="animate-bar h-full bg-destructive/70"
                style={{ width: `${(r.congestionIndex / maxIdx) * 100}%` }}
              />
            </div>
            <div className="tabular mt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
              <span>
                n={r.shipments} · {fmt(r.volumeShare, 1)}% volume · avg {fmt(r.avgLeadTime, 1)}d ·
                ±{fmt(r.stdDev, 1)} · delay {fmt(r.delayRate)}%
              </span>
              <span className="flex gap-1">
                {r.flags.map((f) => (
                  <span key={f} className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[9px]">
                    {f}
                  </span>
                ))}
              </span>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="font-mono text-xs text-muted-foreground">NO DATA IN CURRENT FILTERS</p>
        )}
      </div>
    </Panel>
  );
}

/* ---------------- Ship Mode Cost / Time Tradeoff ---------------- */

export function ModeTradeoffPanel({
  data,
  threshold,
}: {
  data: Shipment[];
  threshold: number;
}) {
  const rows = useMemo(() => shipModeTradeoff(data, threshold), [data, threshold]);
  const expedited = rows.filter((r) => r.serviceClass === "Expedited");
  const standard = rows.filter((r) => r.serviceClass === "Standard");
  const avgOf = (arr: typeof rows, f: (r: (typeof rows)[number]) => number) =>
    arr.length ? arr.reduce((a, r) => a + f(r), 0) / arr.length : 0;

  return (
    <Panel title="Ship Mode Performance & Cost–Time Tradeoff" meta={`${rows.length} modes`}>
      <div className="mb-6 grid grid-cols-2 gap-4">
        {[
          { label: "Expedited services", set: expedited },
          { label: "Standard services", set: standard },
        ].map((b) => (
          <div key={b.label} className="rounded-sm border border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {b.label}
            </p>
            <p className="tabular mt-1 font-mono text-2xl text-card-foreground">
              {fmt(avgOf(b.set, (r) => r.avgLeadTime), 1)}d
            </p>
            <p className="tabular mt-1 font-mono text-[10px] text-muted-foreground">
              cost/unit ${fmt(avgOf(b.set, (r) => r.costPerUnit), 2)} · margin{" "}
              {fmt(avgOf(b.set, (r) => r.marginPct), 1)}%
            </p>
          </div>
        ))}
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border">
            {["Mode", "Class", "Ships", "Avg", "Days vs std", "Cost/unit", "Cost premium", "Margin"].map(
              (h) => (
                <th
                  key={h}
                  className="pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border font-mono text-[12px]">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="py-2 pr-2 text-card-foreground">{r.key}</td>
              <td className="py-2 pr-2 text-muted-foreground">{r.serviceClass}</td>
              <td className="tabular py-2 pr-2">{r.shipments}</td>
              <td className="tabular py-2 pr-2">{fmt(r.avgLeadTime, 1)}d</td>
              <td
                className={`tabular py-2 pr-2 ${
                  r.daysSavedVsStandard > 0 ? "text-success" : "text-destructive"
                }`}
              >
                {r.daysSavedVsStandard > 0 ? "-" : "+"}
                {fmt(Math.abs(r.daysSavedVsStandard), 1)}d
              </td>
              <td className="tabular py-2 pr-2">${fmt(r.costPerUnit, 2)}</td>
              <td
                className={`tabular py-2 pr-2 ${
                  r.costPremiumPct > 0 ? "text-warning" : "text-muted-foreground"
                }`}
              >
                {r.costPremiumPct > 0 ? "+" : ""}
                {fmt(r.costPremiumPct, 1)}%
              </td>
              <td className="tabular py-2 text-muted-foreground">{fmt(r.marginPct, 1)}%</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-3 text-[11px] text-muted-foreground">
                NO DATA IN CURRENT FILTERS
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
        Descriptive only: days-vs-standard compares each mode's average lead time against the
        blended standard-service baseline; cost premium compares cost per unit shipped.
      </p>
    </Panel>
  );
}
