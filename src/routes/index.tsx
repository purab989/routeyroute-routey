import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import nassauAsset from "@/assets/nassau.csv.asset.json";
import {
  aggregateRoutes,
  buildShipments,
  FACTORY_CODE,
  fmt,
  toISO,
  type ParseResult,
  type RouteStat,
  type Shipment,
} from "@/lib/shipping";
import { DrillDown, GeoMap, ShipModeComparison } from "@/components/modules";
import {
  BottleneckAnalysis,
  DataQuality,
  EfficiencyBenchmark,
  ModeTradeoffPanel,
} from "@/components/analysis";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const ALL = "__all__";

function Dashboard() {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [region, setRegion] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [shipMode, setShipMode] = useState(ALL);
  const [threshold, setThreshold] = useState(4);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [board, setBoard] = useState<"fastest" | "slowest">("fastest");
  const [showRegistry, setShowRegistry] = useState(false);
  const [drillState, setDrillState] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const all: Shipment[] = parsed?.shipments ?? [];

  const parseCsv = (input: File | string, name: string) => {
    setError(null);
    Papa.parse<Record<string, unknown>>(input, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const result = buildShipments(res.data);
        if (result.shipments.length === 0) {
          setError(
            "No valid shipments found. Ensure the CSV has Order Date, Ship Date and Product Name columns.",
          );
          setParsed(null);
          return;
        }
        const dates = result.shipments.map((s) => s.orderDate.getTime());
        setFrom(toISO(new Date(Math.min(...dates))));
        setTo(toISO(new Date(Math.max(...dates))));
        setFileName(name);
        setParsed(result);
      },
      error: () => setError("Could not read that file."),
    });
  };

  const handleFile = (file: File) => parseCsv(file, file.name);

  useEffect(() => {
    let cancelled = false;
    fetch(nassauAsset.url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) parseCsv(text, "Nassau_Candy_Distributor.csv");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the bundled dataset — upload a CSV instead.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regions = useMemo(
    () => [...new Set(all.map((s) => s.region))].sort(),
    [all],
  );
  const states = useMemo(
    () =>
      [
        ...new Set(
          all.filter((s) => region === ALL || s.region === region).map((s) => s.state),
        ),
      ].sort(),
    [all, region],
  );
  const modes = useMemo(() => [...new Set(all.map((s) => s.shipMode))].sort(), [all]);

  const filtered = useMemo(() => {
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() : Infinity;
    return all.filter(
      (s) =>
        s.orderDate.getTime() >= fromTs &&
        s.orderDate.getTime() <= toTs &&
        (region === ALL || s.region === region) &&
        (state === ALL || s.state === state) &&
        (shipMode === ALL || s.shipMode === shipMode),
    );
  }, [all, from, to, region, state, shipMode]);

  const routes = useMemo(
    () => aggregateRoutes(filtered, threshold),
    [filtered, threshold],
  );

  const avgLead = filtered.length
    ? filtered.reduce((a, s) => a + s.leadTime, 0) / filtered.length
    : 0;
  const delayRate = filtered.length
    ? (filtered.filter((s) => s.leadTime > threshold).length / filtered.length) * 100
    : 0;

  const factoryBars = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const s of filtered) {
      const key = `${s.factory} → ${s.region}`;
      const arr = map.get(key);
      if (arr) arr.push(s.leadTime);
      else map.set(key, [s.leadTime]);
    }
    return [...map.entries()]
      .map(([label, times]) => ({
        label,
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        count: times.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered]);

  const maxBar = Math.max(1, ...factoryBars.map((b) => b.avg));

  const boardRows: RouteStat[] =
    board === "fastest" ? routes.slice(0, 10) : [...routes].reverse().slice(0, 10);

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <header className="mx-auto mb-8 flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-card-foreground">
            <span className="h-8 w-2 rounded-full bg-primary" />
            Nassau Logistics Engine
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Factory-to-Customer Route Efficiency Dashboard
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Data Sync
            </span>
            <span className="font-mono text-xs text-success">
              {parsed
                ? `${parsed.shipments.length.toLocaleString()}_ROWS_LOADED`
                : "AWAITING_MANIFEST"}
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
          >
            UPLOAD ORDERS CSV
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!parsed ? (
          <UploadZone onPick={() => inputRef.current?.click()} onFile={handleFile} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 shadow-xl md:grid-cols-4">
              <Field label="Date Range">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                  />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </Field>
              <Field label="Region / State">
                <div className="flex gap-2">
                  <Select
                    value={region}
                    onChange={(v) => {
                      setRegion(v);
                      setState(ALL);
                    }}
                    options={regions}
                    allLabel="All Regions"
                  />
                  <Select
                    value={state}
                    onChange={setState}
                    options={states}
                    allLabel="All States"
                  />
                </div>
              </Field>
              <Field label="Ship Mode">
                <Select
                  value={shipMode}
                  onChange={setShipMode}
                  options={modes}
                  allLabel="All Modes"
                />
              </Field>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                    Lead-Time Threshold
                  </span>
                  <span className="font-mono text-[10px] text-primary">{threshold}d</span>
                </div>
                <div className="flex h-9 items-center px-1">
                  <input
                    type="range"
                    min={0}
                    max={14}
                    step={1}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-primary"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Kpi
                label="Avg Lead Time"
                value={fmt(avgLead, 2)}
                unit="days"
                accent="primary"
                note={`${routes.length} active routes`}
              />
              <Kpi
                label="Total Shipments"
                value={filtered.length.toLocaleString()}
                accent="muted"
                note={`${parsed.totalRows.toLocaleString()} rows ingested`}
              />
              <Kpi
                label="Delay Rate"
                value={`${fmt(delayRate)}%`}
                accent="danger"
                note={`shipments over ${threshold}d threshold`}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col rounded-lg border border-border bg-card p-6 lg:col-span-2">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest">
                    Avg Lead Time by Route
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    TOP 10 CORRIDORS BY VOLUME
                  </span>
                </div>
                <div className="flex-1 space-y-4">
                  {factoryBars.length === 0 && (
                    <p className="font-mono text-xs text-muted-foreground">
                      NO SHIPMENTS MATCH CURRENT FILTERS
                    </p>
                  )}
                  {factoryBars.map((b, i) => (
                    <div key={b.label}>
                      <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                        <span>{b.label}</span>
                        <span className="tabular">
                          {fmt(b.avg, 2)}d · n={b.count}
                        </span>
                      </div>
                      <div className="h-5 bg-background">
                        <div
                          className={`animate-bar h-full ${
                            b.avg > threshold ? "bg-warning" : "bg-primary"
                          }`}
                          style={{
                            width: `${(b.avg / maxBar) * 100}%`,
                            animationDelay: `${i * 60}ms`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest">
                    Route Velocity
                  </h3>
                  <div className="flex overflow-hidden rounded-sm border border-surface-2 text-[9px]">
                    {(["fastest", "slowest"] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() => setBoard(b)}
                        className={`cursor-pointer px-2 py-1 uppercase ${
                          board === b
                            ? "bg-surface-2 text-card-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {boardRows.map((r) => (
                    <div
                      key={r.key}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-surface-2/40"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-primary">
                          {FACTORY_CODE[r.factory] ?? "FAC"} → {r.state}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {r.factory} · {r.shipments} shipments
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="tabular font-mono text-sm font-bold">
                          {fmt(r.avgLeadTime, 1)}d
                        </div>
                        <StatusTag score={r.score} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-3 text-center">
                  <button
                    onClick={() => setShowRegistry((v) => !v)}
                    className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    {showRegistry ? "Hide" : "View"} Full Performance Registry
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <GeoMap
                data={filtered}
                threshold={threshold}
                selectedState={drillState}
                onSelectState={setDrillState}
              />
              <ShipModeComparison data={filtered} threshold={threshold} />
            </div>

            <DrillDown
              data={filtered}
              threshold={threshold}
              selectedState={drillState}
              onSelectState={setDrillState}
            />

            <EfficiencyBenchmark data={filtered} threshold={threshold} />

            <BottleneckAnalysis
              data={filtered}
              threshold={threshold}
              onSelectState={setDrillState}
            />

            <ModeTradeoffPanel data={filtered} threshold={threshold} />

            <DataQuality parsed={parsed} fileName={fileName} />





            {showRegistry && (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest">
                    Route Performance Registry
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    n={routes.length} ROUTES · SORTED BY EFFICIENCY
                  </span>
                </div>
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        {[
                          "Route",
                          "Region",
                          "Shipments",
                          "Avg Time",
                          "Variability",
                          "Delay %",
                          "Score",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono text-[13px]">
                      {routes.map((r) => (
                        <tr key={r.key} className="transition-colors hover:bg-surface-2/40">
                          <td className="px-6 py-3">
                            <div className="text-card-foreground">
                              {FACTORY_CODE[r.factory] ?? "FAC"} → {r.state}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {r.factory}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-muted-foreground">{r.region}</td>
                          <td className="tabular px-6 py-3">{r.shipments}</td>
                          <td className="tabular px-6 py-3">{fmt(r.avgLeadTime, 2)}d</td>
                          <td className="tabular px-6 py-3">±{fmt(r.stdDev, 2)}</td>
                          <td
                            className={`tabular px-6 py-3 ${
                              r.delayRate > 20 ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            {fmt(r.delayRate)}%
                          </td>
                          <td className="px-6 py-3">
                            <span className="rounded-sm bg-surface-2 px-2 py-1 text-[10px] font-bold text-card-foreground">
                              {r.score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card px-6 py-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Validation · {fileName} · skipped: {parsed.skipped.missing} missing dates ·{" "}
              {parsed.skipped.invalidDate} invalid dates · {parsed.skipped.negative} negative
              lead times · {parsed.skipped.duplicate} duplicates · {parsed.skipped.noFactory}{" "}
              unmapped products
            </div>

          </>
        )}
      </main>

      <footer className="mx-auto mt-12 flex max-w-7xl items-center justify-between border-t border-card pt-6 font-mono text-[10px] text-muted-foreground">
        <div>NASSAU_DIST_ANALYTICS_V1.0.4</div>
        <div className="flex gap-4">
          <span>LOCAL_PROCESSING_ONLY</span>
          <span className="text-primary">ROUTE: FACTORY → CUSTOMER STATE</span>
        </div>
      </footer>
    </div>
  );
}

function UploadZone({
  onPick,
  onFile,
}: {
  onPick: () => void;
  onFile: (f: File) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`rounded-lg border-2 border-dashed p-16 text-center transition-colors ${
        over ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        No manifest loaded
      </p>
      <h2 className="mt-3 text-lg font-bold uppercase tracking-widest text-card-foreground">
        Drop orders CSV to begin analysis
      </h2>
      <p className="mx-auto mt-2 max-w-[60ch] text-sm text-muted-foreground">
        Expected columns: Order ID, Order Date, Ship Date, Ship Mode, City, State/Province,
        Region, Division, Product Name, Sales, Units, Cost, Gross Profit. Products are mapped
        to their source factory automatically; everything is processed in your browser.
      </p>
      <button
        onClick={onPick}
        className="mt-6 cursor-pointer rounded-sm bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
      >
        SELECT FILE
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-primary"
    >
      <option value={ALL}>{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Kpi({
  label,
  value,
  unit,
  note,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
  accent: "primary" | "muted" | "danger";
}) {
  const border =
    accent === "primary"
      ? "border-primary"
      : accent === "danger"
        ? "border-destructive"
        : "border-surface-2";
  return (
    <div className={`rounded-t-lg border-b-2 bg-card p-6 ${border}`}>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="tabular font-mono text-4xl font-bold text-card-foreground">
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-4 text-[10px] font-bold uppercase text-muted-foreground">{note}</div>
    </div>
  );
}

function StatusTag({ score }: { score: number }) {
  if (score >= 75)
    return <div className="text-[9px] font-bold text-success">OPTIMAL</div>;
  if (score >= 40)
    return <div className="text-[9px] font-bold text-muted-foreground">STEADY</div>;
  return <div className="text-[9px] font-bold text-warning">WARNING</div>;
}
