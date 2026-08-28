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
  skipped: { missing: number; invalidDate: number; negative: number; noFactory: number };
  totalRows: number;
};

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
  const skipped = { missing: 0, invalidDate: 0, negative: 0, noFactory: 0 };
  const shipments: Shipment[] = [];

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
    shipments.push({
      orderId: pick(row, ["Order ID", "OrderID"]) || `${shipments.length}`,
      orderDate,
      shipDate,
      leadTime,
      shipMode: pick(row, ["Ship Mode", "ShipMode"]) || "Unknown",
      state: pick(row, ["State/Province", "State", "Province"]) || "Unknown",
      region: pick(row, ["Region"]) || "Unknown",
      city: pick(row, ["City"]),
      factory,
      product,
      sales: num(pick(row, ["Sales"])),
      units: num(pick(row, ["Units"])),
      cost: num(pick(row, ["Cost"])),
      grossProfit: num(pick(row, ["Gross Profit", "GrossProfit"])),
    });
  }

  return { shipments, skipped, totalRows: rows.length };
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
