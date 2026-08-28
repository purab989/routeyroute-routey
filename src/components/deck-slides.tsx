import type { ReactNode } from "react";
import m from "@/assets/deck-metrics.json";

type Stat = {
  key: string;
  shipments: number;
  avg: number;
  median: number;
  p90: number;
  delay: number;
  score?: number;
};
type Route = Stat & { factory: string; state: string; region: string; std: number };

const metrics = m as unknown as {
  total: number;
  networkAvg: number;
  networkMed: number;
  dateRange: { order: string; ship: string };
  totSales: number;
  totGP: number;
  totUnits: number;
  routes: number;
  bottlenecks: Route[];
  efficient: Route[];
  byFactory: Stat[];
  byRegion: Stat[];
  byMode: Stat[];
  topStates: Stat[];
  fastestRoute: Route;
  slowestRoute: Route;
};

const n = (v: number) => v.toLocaleString();
const d0 = (v: number) => Math.round(v).toLocaleString();

function Frame({
  kicker,
  title,
  children,
  index,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  index: number;
}) {
  return (
    <div className="flex h-full w-full flex-col bg-background px-[110px] py-[80px] text-foreground">
      <div className="flex items-end justify-between border-b border-border pb-[28px]">
        <div>
          <div className="slide-kicker text-primary">{kicker}</div>
          <h2 className="slide-title mt-[14px] font-bold text-card-foreground">{title}</h2>
        </div>
        <div className="slide-chrome font-mono text-muted-foreground">
          {String(index).padStart(2, "0")} / 10
        </div>
      </div>
      <div className="mt-[48px] flex-1">{children}</div>
      <div className="slide-chrome mt-[28px] flex justify-between border-t border-border pt-[22px] font-mono text-muted-foreground">
        <span>NASSAU CANDY DISTRIBUTOR — ROUTE EFFICIENCY</span>
        <span>{n(metrics.total)} SHIPMENTS · {metrics.routes} ROUTES</span>
      </div>
    </div>
  );
}

function Bars({ rows, max }: { rows: { label: string; value: number; note: string }[]; max: number }) {
  return (
    <div className="space-y-[26px]">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-[28px]">
          <div className="slide-body w-[420px] shrink-0 truncate font-semibold text-card-foreground">
            {r.label}
          </div>
          <div className="h-[46px] flex-1 rounded-sm bg-surface">
            <div
              className={`h-full rounded-sm ${i === 0 ? "bg-success" : i === rows.length - 1 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <div className="slide-body w-[330px] shrink-0 text-right font-mono text-muted-foreground">
            {r.note}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-[36px] py-[34px]">
      <div className="slide-kicker text-muted-foreground">{label}</div>
      <div className="mt-[16px] font-mono text-[76px] font-bold leading-none text-primary">
        {value}
      </div>
      <div className="slide-caption mt-[16px] text-muted-foreground">{note}</div>
    </div>
  );
}

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border">
          {head.map((h, i) => (
            <th
              key={h}
              className={`slide-caption pb-[16px] font-bold uppercase tracking-widest text-muted-foreground ${i === 0 ? "text-left" : "text-right"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-b border-border/50">
            {r.map((c, ci) => (
              <td
                key={ci}
                className={`slide-body py-[18px] ${ci === 0 ? "text-left font-semibold text-card-foreground" : "text-right font-mono text-foreground"}`}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const regionMax = Math.max(...metrics.byRegion.map((r) => r.avg));
const factoryMax = Math.max(...metrics.byFactory.map((r) => r.avg));
const modeMax = Math.max(...metrics.byMode.map((r) => r.avg));

export const slides: { title: string; render: () => ReactNode }[] = [
  {
    title: "Title",
    render: () => (
      <div className="relative flex h-full w-full flex-col justify-center bg-background px-[130px] text-foreground">
        <div className="absolute left-0 top-0 h-full w-[16px] bg-primary" />
        <div className="slide-kicker text-primary">Logistics Intelligence Briefing</div>
        <h1 className="slide-title-lg mt-[34px] max-w-[1400px] font-bold text-card-foreground">
          Factory-to-Customer Shipping Route Efficiency
        </h1>
        <p className="slide-subtitle mt-[30px] text-muted-foreground">
          Nassau Candy Distributor · National Distribution Network
        </p>
        <div className="mt-[70px] grid max-w-[1450px] grid-cols-4 gap-[26px]">
          {[
            [n(metrics.total), "SHIPMENTS"],
            [String(metrics.routes), "ROUTES"],
            [String(metrics.byFactory.length), "FACTORIES"],
            [String(metrics.byMode.length), "SHIP MODES"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-md border border-border bg-surface px-[30px] py-[28px]">
              <div className="font-mono text-[54px] font-bold leading-none text-primary">{v}</div>
              <div className="slide-caption mt-[12px] uppercase tracking-widest text-muted-foreground">
                {l}
              </div>
            </div>
          ))}
        </div>
        <div className="slide-caption absolute bottom-[70px] left-[130px] font-mono text-muted-foreground">
          ORDER WINDOW {metrics.dateRange.order.toUpperCase()}
        </div>
      </div>
    ),
  },
  {
    title: "Background & Problem",
    render: () => (
      <Frame kicker="Context" title="Why route intelligence matters" index={2}>
        <div className="grid h-full grid-cols-2 gap-[46px]">
          <div className="space-y-[22px]">
            <div className="slide-kicker text-muted-foreground">Operating reality</div>
            {[
              "Shipping efficiency directly drives customer satisfaction.",
              "Delays increase operational cost on every lane.",
              "Inefficient routes cap national scalability.",
            ].map((t) => (
              <div key={t} className="flex gap-[18px] rounded-md border border-border bg-surface px-[28px] py-[24px]">
                <span className="mt-[10px] h-[14px] w-[14px] shrink-0 rounded-full bg-primary" />
                <span className="slide-body text-foreground">{t}</span>
              </div>
            ))}
          </div>
          <div className="space-y-[22px]">
            <div className="slide-kicker text-destructive">Visibility gaps today</div>
            {[
              "Which routes are consistently efficient",
              "Which routes experience frequent delays",
              "How performance varies by region, state and ship mode",
              "Where bottlenecks concentrate geographically",
            ].map((t) => (
              <div key={t} className="rounded-md border-l-[8px] border-destructive bg-surface px-[28px] py-[20px]">
                <span className="slide-body text-foreground">{t}</span>
              </div>
            ))}
            <p className="slide-caption text-muted-foreground">
              Without this visibility, logistics optimisation stays reactive rather than data-driven.
            </p>
          </div>
        </div>
      </Frame>
    ),
  },
  {
    title: "Methodology",
    render: () => (
      <Frame kicker="Approach" title="From raw orders to route intelligence" index={3}>
        <div className="grid grid-cols-3 gap-[26px]">
          {[
            ["01", "Cleaning & validation", "Validate date formats, drop negative lead times, remove exact duplicates, standardise state / region / ship-mode fields."],
            ["02", "Feature engineering", "Lead time in days, factory assignment by product line, factory → state and factory → region route keys."],
            ["03", "Aggregation", "Shipment count, average lead time and variability (σ) per route."],
            ["04", "Benchmarking", "Rank routes fastest to slowest; surface top 10 and bottom 10."],
            ["05", "Bottleneck detection", "Congestion index = volume share × relative slowness, flagged SLOW / HIGH VOLUME / VOLATILE."],
            ["06", "Ship-mode analysis", "Expedited vs standard lead time, cost per unit and margin tradeoff."],
          ].map(([num, h, b]) => (
            <div key={num} className="rounded-md border border-border bg-surface px-[30px] py-[28px]">
              <div className="font-mono text-[40px] font-bold leading-none text-primary">{num}</div>
              <div className="slide-body-lg mt-[14px] font-bold text-card-foreground">{h}</div>
              <p className="slide-caption mt-[14px] leading-relaxed text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </Frame>
    ),
  },
  {
    title: "Baseline KPIs",
    render: () => (
      <Frame kicker="Baseline" title="Network performance snapshot" index={4}>
        <div className="grid grid-cols-3 gap-[26px]">
          <StatCard label="Avg lead time" value={`${d0(metrics.networkAvg)}d`} note={`Median ${d0(metrics.networkMed)}d across all shipments`} />
          <StatCard label="Active routes" value={String(metrics.routes)} note={`${metrics.byFactory.length} factories → customer states`} />
          <StatCard label="Units shipped" value={n(metrics.totUnits)} note={`Across ${n(metrics.total)} shipment records`} />
          <StatCard label="Total sales" value={`$${n(metrics.totSales)}`} note="Revenue represented in the dataset" />
          <StatCard label="Gross profit" value={`$${n(metrics.totGP)}`} note={`${Math.round((metrics.totGP / metrics.totSales) * 100)}% blended margin`} />
          <div className="rounded-md border border-warning/50 bg-warning/10 px-[36px] py-[34px]">
            <div className="slide-kicker text-warning">Data quality flag</div>
            <p className="slide-body mt-[18px] leading-relaxed text-foreground">
              Ship dates ({metrics.dateRange.ship}) fall after order dates ({metrics.dateRange.order}), inflating absolute lead times. All findings here are
              <span className="font-bold text-warning"> relative comparisons</span>, valid for ranking routes.
            </p>
          </div>
        </div>
      </Frame>
    ),
  },
  {
    title: "Regional performance",
    render: () => (
      <Frame kicker="Geography" title="Lead time by customer region" index={5}>
        <Bars
          max={regionMax}
          rows={[...metrics.byRegion]
            .sort((a, b) => a.avg - b.avg)
            .map((r) => ({
              label: r.key,
              value: r.avg,
              note: `${d0(r.avg)}d · ${n(r.shipments)} shp`,
            }))}
        />
        <p className="slide-body mt-[46px] max-w-[1450px] text-muted-foreground">
          <span className="font-bold text-success">Gulf</span> is the fastest region at {d0(metrics.byRegion.find((r) => r.key === "Gulf")!.avg)}d, while
          <span className="font-bold text-destructive"> Atlantic</span> trails at {d0(metrics.byRegion.find((r) => r.key === "Atlantic")!.avg)}d — a
          {" "}{d0(metrics.byRegion.find((r) => r.key === "Atlantic")!.avg - metrics.byRegion.find((r) => r.key === "Gulf")!.avg)}-day spread on comparable volume.
        </p>
      </Frame>
    ),
  },
  {
    title: "Factory performance",
    render: () => (
      <Frame kicker="Origin" title="Lead time by factory of origin" index={6}>
        <Bars
          max={factoryMax}
          rows={[...metrics.byFactory]
            .sort((a, b) => a.avg - b.avg)
            .map((f) => ({
              label: f.key,
              value: f.avg,
              note: `${d0(f.avg)}d · ${n(f.shipments)} shp`,
            }))}
        />
        <p className="slide-body mt-[46px] max-w-[1450px] text-muted-foreground">
          Origin explains little on its own — the spread between the best and worst factory is under 50 days, versus a
          <span className="font-bold text-card-foreground"> 1,270-day</span> spread across individual routes. Destination, not origin, drives performance.
        </p>
      </Frame>
    ),
  },
  {
    title: "Ship mode",
    render: () => (
      <Frame kicker="Service level" title="Ship mode comparison" index={7}>
        <Bars
          max={modeMax}
          rows={[...metrics.byMode]
            .sort((a, b) => a.avg - b.avg)
            .map((s) => ({
              label: s.key,
              value: s.avg,
              note: `${d0(s.avg)}d · ${n(s.shipments)} shp`,
            }))}
        />
        <div className="mt-[46px] rounded-md border-l-[8px] border-warning bg-surface px-[32px] py-[26px]">
          <p className="slide-body text-foreground">
            Expedited classes (First Class, Same Day) do <span className="font-bold text-warning">not</span> outperform Standard Class in this dataset — premium
            service is being paid for without a measurable time benefit.
          </p>
        </div>
      </Frame>
    ),
  },
  {
    title: "Bottlenecks",
    render: () => (
      <Frame kicker="Congestion" title="Highest-impact bottleneck routes" index={8}>
        <div className="grid grid-cols-2 gap-[46px]">
          <Table
            head={["Route", "Shp", "Avg", "σ"]}
            rows={metrics.bottlenecks.slice(0, 8).map((b) => [
              `${b.factory} → ${b.state}`,
              n(b.shipments),
              `${d0(b.avg)}d`,
              d0(b.std),
            ])}
          />
          <div>
            <div className="slide-kicker text-muted-foreground">High-volume states</div>
            <div className="mt-[20px]">
              <Table
                head={["State", "Shp", "Avg"]}
                rows={metrics.topStates.slice(0, 6).map((s) => [s.key, n(s.shipments), `${d0(s.avg)}d`])}
              />
            </div>
            <p className="slide-caption mt-[28px] leading-relaxed text-muted-foreground">
              Congestion concentrates where volume and slowness overlap: New Mexico, Iowa and Tennessee lanes combine above-average lead time with meaningful
              shipment counts.
            </p>
          </div>
        </div>
      </Frame>
    ),
  },
  {
    title: "Route benchmark",
    render: () => (
      <Frame kicker="Benchmark" title="Fastest and slowest routes" index={9}>
        <div className="grid grid-cols-2 gap-[46px]">
          <div>
            <div className="slide-kicker text-success">Most efficient</div>
            <div className="mt-[20px]">
              <Table
                head={["Route", "Shp", "Avg"]}
                rows={metrics.efficient.slice(0, 7).map((r) => [
                  `${r.factory} → ${r.state}`,
                  n(r.shipments),
                  `${d0(r.avg)}d`,
                ])}
              />
            </div>
          </div>
          <div>
            <div className="slide-kicker text-destructive">Least efficient</div>
            <div className="mt-[20px]">
              <Table
                head={["Route", "Shp", "Avg"]}
                rows={metrics.bottlenecks.slice(0, 7).map((r) => [
                  `${r.factory} → ${r.state}`,
                  n(r.shipments),
                  `${d0(r.avg)}d`,
                ])}
              />
            </div>
          </div>
        </div>
        <p className="slide-caption mt-[36px] text-muted-foreground">
          Extremes: {metrics.fastestRoute.factory} → {metrics.fastestRoute.state} at {d0(metrics.fastestRoute.avg)}d ({metrics.fastestRoute.shipments} shipment)
          vs {metrics.slowestRoute.factory} → {metrics.slowestRoute.state} at {d0(metrics.slowestRoute.avg)}d ({metrics.slowestRoute.shipments} shipments) —
          low-volume lanes are directional, not conclusive.
        </p>
      </Frame>
    ),
  },
  {
    title: "Recommendations",
    render: () => (
      <Frame kicker="Action" title="Recommended next steps" index={10}>
        <div className="grid grid-cols-2 gap-[26px]">
          {[
            ["Fix the date mapping", "Validate order-to-ship date sourcing before any operational decision is taken on absolute lead times."],
            ["Attack the top 10 bottlenecks", "New Mexico, Iowa, Missouri and Tennessee lanes carry both volume and slowness — highest recovery per fix."],
            ["Re-price expedited service", "Expedited modes show no time advantage; renegotiate or retire the premium tier."],
            ["Rebalance origin assignment", "Route high-volume states to the origin with the best observed lane, not the default product mapping."],
            ["Track variability, not just averages", "σ above 280 days marks unstable lanes where customer promises break first."],
            ["Operationalise the dashboard", "Weekly review of route scores, congestion index and delay rate against the agreed threshold."],
          ].map(([h, b], i) => (
            <div key={h} className="flex gap-[24px] rounded-md border border-border bg-surface px-[30px] py-[26px]">
              <div className="font-mono text-[36px] font-bold leading-none text-primary">{i + 1}</div>
              <div>
                <div className="slide-body-lg font-bold text-card-foreground">{h}</div>
                <p className="slide-caption mt-[10px] leading-relaxed text-muted-foreground">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </Frame>
    ),
  },
];
