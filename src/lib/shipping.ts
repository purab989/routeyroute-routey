import { STATE_CENTROIDS } from "@/lib/geo";

export const FACTORY_COORDS: Record<string, { lat: number; lon: number }> = {
  "Lot's O' Nuts": { lat: 32.881893, lon: -111.768036 },
  "Wicked Choccy's": { lat: 32.076176, lon: -81.088371 },
  "Sugar Shack": { lat: 48.11914, lon: -96.18115 },
  "Secret Factory": { lat: 41.446333, lon: -90.565487 },
  "The Other Factory": { lat: 35.1175, lon: -89.971107 },
};

export const PRODUCT_FACTORY: Record<string, string> = {
  "wonka bar - nutty crunch surprise": "Lot's O' Nuts",
  "wonka bar - fudge mallows": "Lot's O' Nuts",
  "wonka bar -scrumdiddlyumptious": "Lot's O' Nuts",
  "wonka bar - scrumdiddlyumptious": "Lot's O' Nuts",
  "wonka bar - milk chocolate": "Wicked Choccy's",
  "wonka bar - triple dazzle caramel": "Wicked Choccy's",
  "laffy taffy": "Sugar Shack",
  sweetarts: "Sugar Shack",
  nerds: "Sugar Shack",
  "fun dip": "Sugar Shack",
  "fizzy lifting drinks": "Sugar Shack",
  "everlasting gobstopper": "Secret Factory",
  "hair toffee": "The Other Factory",
  "lickable wallpaper": "Secret Factory",
  "wonka gum": "Secret Factory",
  kazookles: "The Other Factory",
};

export const FACTORY_CODE: Record<string, string> = {
  "Lot's O' Nuts": "LON",
  "Wicked Choccy's": "WCH",
  "Sugar Shack": "SGS",
  "Secret Factory": "SEC",
  "The Other Factory": "TOF",
};

export function factoryFor(productName: string): string | null {
  const key = String(productName ?? "").trim().toLowerCase();
  if (PRODUCT_FACTORY[key]) return PRODUCT_FACTORY[key];
  const hit = Object.keys(PRODUCT_FACTORY).find(
    (k) => key.includes(k) || k.includes(key),
  );
  return hit ? (PRODUCT_FACTORY[hit] ?? null) : null;
}

export type Shipment = {
  orderId: string;
  orderDate: Date;
  shipDate: Date;
  leadTime: number;
  shipMode: string;
  state: string;
  region: string;
  city: string;
  factory: string;
  product: string;
  sales: number;
  units: number;
  cost: number;
  grossProfit: number;
};

export type ParseResult = {
  shipments: Shipment[];
  skipped: {
    missing: number;
    invalidDate: number;
    negative: number;
    noFactory: number;
    duplicate: number;
  };
  cleaning: {
    standardizedState: number;
    standardizedRegion: number;
    standardizedShipMode: number;
    unknownState: number;
  };
  totalRows: number;
};

/* ---------------- Geographic / categorical standardization ---------------- */

const ABBR_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CENTROIDS).map(([name, v]) => [v.abbr, name]),
);

const titleCase = (v: string) =>
  v
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/** Trim, collapse whitespace, expand 2-letter codes, title-case state names. */
export function standardizeState(raw: string): string {
  const v = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!v) return "Unknown";
  const upper = v.toUpperCase();
  if (upper.length === 2 && ABBR_TO_STATE[upper]) return ABBR_TO_STATE[upper]!;
  const t = titleCase(v);
  const match = Object.keys(STATE_CENTROIDS).find(
    (s) => s.toLowerCase() === t.toLowerCase(),
  );
  return match ?? t;
}

const REGION_ALIASES: Record<string, string> = {
  w: "West",
  west: "West",
  e: "East",
  east: "East",
  c: "Central",
  central: "Central",
  s: "South",
  south: "South",
  n: "North",
  north: "North",
  ne: "Northeast",
  northeast: "Northeast",
  nw: "Northwest",
  northwest: "Northwest",
  se: "Southeast",
  southeast: "Southeast",
  sw: "Southwest",
  southwest: "Southwest",
  midwest: "Midwest",
  "mid-west": "Midwest",
};

export function standardizeRegion(raw: string): string {
  const v = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!v) return "Unknown";
  return REGION_ALIASES[v.toLowerCase()] ?? titleCase(v);
}

const MODE_ALIASES: Record<string, string> = {
  "standard class": "Standard Class",
  standard: "Standard Class",
  "second class": "Second Class",
  "first class": "First Class",
  "same day": "Same Day",
  sameday: "Same Day",
};

export function standardizeShipMode(raw: string): string {
  const v = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!v) return "Unknown";
  return MODE_ALIASES[v.toLowerCase()] ?? titleCase(v);
}

/** Descriptive service class used in the cost/time tradeoff analysis. */
export function shipModeClass(mode: string): "Expedited" | "Standard" {
  return /same day|first class|second class|express|expedit/i.test(mode)
    ? "Expedited"
    : "Standard";
}


const pick = (row: Record<string, unknown>, names: string[]): string => {
  const keys = Object.keys(row);
  for (const n of names) {
    const k = keys.find(
      (key) => key.trim().toLowerCase().replace(/[\s_/-]/g, "") === n.toLowerCase().replace(/[\s_/-]/g, ""),
    );
    if (k != null && row[k] != null) return String(row[k]).trim();
  }
  return "";
};

const num = (v: string): number => {
  const n = Number(String(v).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function parseDate(value: string): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const slash = raw.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (slash) {
    const a = slash[1] ?? "", b = slash[2] ?? "", c = slash[3] ?? "";
    let y: number, m: number, d: number;
    if (a.length === 4) {
      y = +a; m = +b; d = +c;
    } else {
      m = +a; d = +b; y = +c;
      if (m > 12 && d <= 12) [m, d] = [d, m];
      if (y < 100) y += 2000;
    }
    const dt = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function buildShipments(rows: Record<string, unknown>[]): ParseResult {
  const skipped = { missing: 0, invalidDate: 0, negative: 0, noFactory: 0, duplicate: 0 };
  const cleaning = {
    standardizedState: 0,
    standardizedRegion: 0,
    standardizedShipMode: 0,
    unknownState: 0,
  };
  const shipments: Shipment[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const orderRaw = pick(row, ["Order Date", "OrderDate"]);
    const shipRaw = pick(row, ["Ship Date", "ShipDate"]);
    const product = pick(row, ["Product Name", "ProductName", "Product"]);
    if (!orderRaw || !shipRaw) {
      skipped.missing++;
      continue;
    }
    const orderDate = parseDate(orderRaw);
    const shipDate = parseDate(shipRaw);
    if (!orderDate || !shipDate) {
      skipped.invalidDate++;
      continue;
    }
    const leadTime = Math.round((shipDate.getTime() - orderDate.getTime()) / 86400000);
    if (leadTime < 0) {
      skipped.negative++;
      continue;
    }
    const factory = factoryFor(product);
    if (!factory) {
      skipped.noFactory++;
      continue;
    }

    const rawState = pick(row, ["State/Province", "State", "Province"]);
    const rawRegion = pick(row, ["Region"]);
    const rawMode = pick(row, ["Ship Mode", "ShipMode"]);
    const state = standardizeState(rawState);
    const region = standardizeRegion(rawRegion);
    const shipMode = standardizeShipMode(rawMode);
    if (rawState && state !== rawState) cleaning.standardizedState++;
    if (rawRegion && region !== rawRegion) cleaning.standardizedRegion++;
    if (rawMode && shipMode !== rawMode) cleaning.standardizedShipMode++;
    if (state === "Unknown") cleaning.unknownState++;

    const orderId = pick(row, ["Order ID", "OrderID"]) || `${shipments.length}`;
    const dedupeKey = `${orderId}|${product}|${toISO(orderDate)}|${toISO(shipDate)}|${state}`;
    if (seen.has(dedupeKey)) {
      skipped.duplicate++;
      continue;
    }
    seen.add(dedupeKey);

    shipments.push({
      orderId,
      orderDate,
      shipDate,
      leadTime,
      shipMode,
      state,
      region,
      city: pick(row, ["City"]).replace(/\s+/g, " ").trim(),
      factory,
      product,
      sales: num(pick(row, ["Sales"])),
      units: num(pick(row, ["Units"])),
      cost: num(pick(row, ["Cost"])),
      grossProfit: num(pick(row, ["Gross Profit", "GrossProfit"])),
    });
  }

  return { shipments, skipped, cleaning, totalRows: rows.length };
}


export type RouteStat = {
  key: string;
  factory: string;
  state: string;
  region: string;
  shipments: number;
  avgLeadTime: number;
  stdDev: number;
  delayRate: number;
  score: number;
};

export function aggregateRoutes(data: Shipment[], threshold: number): RouteStat[] {
  const groups = new Map<string, Shipment[]>();
  for (const s of data) {
    const key = `${s.factory}→${s.state}`;
    const arr = groups.get(key);
    if (arr) arr.push(s);
    else groups.set(key, [s]);
  }

  const stats: RouteStat[] = [...groups.entries()].map(([key, items]) => {
    const times = items.map((i) => i.leadTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((a, b) => a + (b - avg) ** 2, 0) / times.length;
    return {
      key,
      factory: items[0]!.factory,
      state: items[0]!.state,
      region: items[0]!.region,
      shipments: items.length,
      avgLeadTime: avg,
      stdDev: Math.sqrt(variance),
      delayRate: (times.filter((t) => t > threshold).length / times.length) * 100,
      score: 0,
    };
  });

  const avgs = stats.map((s) => s.avgLeadTime);
  const min = Math.min(...avgs);
  const max = Math.max(...avgs);
  for (const s of stats) {
    s.score = max === min ? 100 : Math.round((1 - (s.avgLeadTime - min) / (max - min)) * 100);
  }
  return stats.sort((a, b) => a.avgLeadTime - b.avgLeadTime);
}

export const fmt = (n: number, d = 1) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const toISO = (d: Date) => d.toISOString().slice(0, 10);

export type GroupStat = {
  key: string;
  shipments: number;
  avgLeadTime: number;
  stdDev: number;
  delayRate: number;
  medianLeadTime: number;
  p90LeadTime: number;
  score: number;
};

export function groupStats(
  data: Shipment[],
  threshold: number,
  keyOf: (s: Shipment) => string,
): GroupStat[] {
  const groups = new Map<string, number[]>();
  for (const s of data) {
    const k = keyOf(s);
    const arr = groups.get(k);
    if (arr) arr.push(s.leadTime);
    else groups.set(k, [s.leadTime]);
  }
  const stats: GroupStat[] = [...groups.entries()].map(([key, times]) => {
    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((a, b) => a + (b - avg) ** 2, 0) / times.length;
    return {
      key,
      shipments: times.length,
      avgLeadTime: avg,
      stdDev: Math.sqrt(variance),
      delayRate: (times.filter((t) => t > threshold).length / times.length) * 100,
      medianLeadTime: sorted[Math.floor(sorted.length / 2)] ?? 0,
      p90LeadTime: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))] ?? 0,
      score: 0,
    };
  });
  const avgs = stats.map((s) => s.avgLeadTime);
  const min = Math.min(...avgs);
  const max = Math.max(...avgs);
  for (const s of stats) {
    s.score = max === min ? 100 : Math.round((1 - (s.avgLeadTime - min) / (max - min)) * 100);
  }
  return stats.sort((a, b) => a.avgLeadTime - b.avgLeadTime);
}

/* ---------------- Route definition by granularity ---------------- */

export type RouteLevel = "state" | "region";

/** Factory -> Customer State (default) or Factory -> Customer Region routes. */
export function aggregateRoutesBy(
  data: Shipment[],
  threshold: number,
  level: RouteLevel,
): RouteStat[] {
  if (level === "state") return aggregateRoutes(data, threshold);

  const groups = new Map<string, Shipment[]>();
  for (const s of data) {
    const key = `${s.factory}→${s.region}`;
    const arr = groups.get(key);
    if (arr) arr.push(s);
    else groups.set(key, [s]);
  }
  const stats: RouteStat[] = [...groups.entries()].map(([key, items]) => {
    const times = items.map((i) => i.leadTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((a, b) => a + (b - avg) ** 2, 0) / times.length;
    return {
      key,
      factory: items[0]!.factory,
      state: items[0]!.region,
      region: items[0]!.region,
      shipments: items.length,
      avgLeadTime: avg,
      stdDev: Math.sqrt(variance),
      delayRate: (times.filter((t) => t > threshold).length / times.length) * 100,
      score: 0,
    };
  });
  const avgs = stats.map((s) => s.avgLeadTime);
  const min = Math.min(...avgs);
  const max = Math.max(...avgs);
  for (const s of stats) {
    s.score = max === min ? 100 : Math.round((1 - (s.avgLeadTime - min) / (max - min)) * 100);
  }
  return stats.sort((a, b) => a.avgLeadTime - b.avgLeadTime);
}

/* ---------------- Geographic bottleneck detection ---------------- */

export type Bottleneck = GroupStat & {
  volumeShare: number;
  congestionIndex: number;
  flags: string[];
};

/**
 * Congestion index = volume share x relative slowness. Flags a geography as
 * congestion-prone when it carries above-median volume AND above-average lead time.
 */
export function detectBottlenecks(
  data: Shipment[],
  threshold: number,
  keyOf: (s: Shipment) => string,
): Bottleneck[] {
  const stats = groupStats(data, threshold, keyOf);
  if (stats.length === 0) return [];
  const total = data.length || 1;
  const networkAvg = data.reduce((a, s) => a + s.leadTime, 0) / total;
  const volumes = stats.map((s) => s.shipments).sort((a, b) => a - b);
  const medianVolume = volumes[Math.floor(volumes.length / 2)] ?? 0;
  const maxDelay = Math.max(...stats.map((s) => s.delayRate), 1);

  return stats
    .map((s) => {
      const volumeShare = (s.shipments / total) * 100;
      const slowness = networkAvg > 0 ? s.avgLeadTime / networkAvg : 1;
      const flags: string[] = [];
      if (s.avgLeadTime > networkAvg) flags.push("SLOW");
      if (s.shipments > medianVolume) flags.push("HIGH VOLUME");
      if (s.delayRate >= maxDelay * 0.9) flags.push("DELAY-PRONE");
      if (s.stdDev > (networkAvg || 1) * 0.25) flags.push("VOLATILE");
      return {
        ...s,
        volumeShare,
        congestionIndex: Math.round(volumeShare * slowness * 10) / 10,
        flags,
      };
    })
    .sort((a, b) => b.congestionIndex - a.congestionIndex);
}

/* ---------------- Ship mode cost / time tradeoff ---------------- */

export type ModeTradeoff = GroupStat & {
  serviceClass: "Expedited" | "Standard";
  costPerUnit: number;
  avgSales: number;
  marginPct: number;
  daysSavedVsStandard: number;
  costPremiumPct: number;
};

export function shipModeTradeoff(data: Shipment[], threshold: number): ModeTradeoff[] {
  const base = groupStats(data, threshold, (s) => s.shipMode);
  const byMode = new Map<string, Shipment[]>();
  for (const s of data) {
    const arr = byMode.get(s.shipMode);
    if (arr) arr.push(s);
    else byMode.set(s.shipMode, [s]);
  }
  const std = data.filter((s) => shipModeClass(s.shipMode) === "Standard");
  const stdAvgLead = std.length
    ? std.reduce((a, s) => a + s.leadTime, 0) / std.length
    : 0;
  const stdUnits = std.reduce((a, s) => a + s.units, 0);
  const stdCostPerUnit = stdUnits ? std.reduce((a, s) => a + s.cost, 0) / stdUnits : 0;

  return base.map((g) => {
    const items = byMode.get(g.key) ?? [];
    const units = items.reduce((a, s) => a + s.units, 0);
    const cost = items.reduce((a, s) => a + s.cost, 0);
    const sales = items.reduce((a, s) => a + s.sales, 0);
    const profit = items.reduce((a, s) => a + s.grossProfit, 0);
    const costPerUnit = units ? cost / units : 0;
    return {
      ...g,
      serviceClass: shipModeClass(g.key),
      costPerUnit,
      avgSales: items.length ? sales / items.length : 0,
      marginPct: sales ? (profit / sales) * 100 : 0,
      daysSavedVsStandard: stdAvgLead - g.avgLeadTime,
      costPremiumPct: stdCostPerUnit
        ? ((costPerUnit - stdCostPerUnit) / stdCostPerUnit) * 100
        : 0,
    };
  });
}
