export type RawIpo = {
  id: number;
  name: string;
  is_new_sme: number | null;
  lot_size: number | null;
  min_price: number | null;
  max_price: number | null;
  open: string | null;
  close: string | null;
  allotment_date: string | null;
  listing_date: string | null;
  icon_url: string | null;
  premium: number | null;
  issue_size: string | null;
  current_status: string | null;
  slug: string | null;
};

export type Ipo = {
  id: number;
  name: string;
  board: "MAINBOARD" | "SME";
  status: string;
  priceBand: string;
  lot: number | null;
  minInvestment: string;
  gmp: number | null;
  gmpPercent: string | null;
  issueSize: string;
  open: string;
  close: string;
  allotment: string;
  listing: string;
  logo: string;
  slug: string;
  sourceUrl: string;
};

export type IpoRecord = {
  id: number;
  name: string;
  slug: string;
  board: string;
  status: string;
  minPrice: number | null;
  maxPrice: number | null;
  lotSize: number | null;
  gmp: number | null;
  issueSizeCr: string | number | null;
  openDate: string | null;
  closeDate: string | null;
  allotmentDate: string | null;
  listingDate: string | null;
  logoUrl: string | null;
  sourceUrl: string | null;
  updatedAt?: Date | string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d || m > 12) return "-";
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function normalize(raw: RawIpo): Ipo {
  const number = (value: unknown) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const positive = (value: unknown) => {
    const parsed = number(value);
    return parsed != null && parsed > 0 ? parsed : null;
  };
  const min = positive(raw.min_price);
  const max = positive(raw.max_price);
  // shortcut: issue_size is assumed to be ₹ crore (site prints bare numbers); verify before public use.
  const crores = number(raw.issue_size) ?? 0;
  const gmp = number(raw.premium);
  const lot = positive(raw.lot_size);
  const status = (raw.current_status || "unknown").toLowerCase();

  return {
    id: raw.id,
    name: raw.name.replace(/\s*\((?:BSE |NSE )?(?:MAINBOARD|SME)\)\s*$/i, "").trim(),
    board: raw.is_new_sme || /\([^)]*SME\)\s*$/i.test(raw.name) ? "SME" : "MAINBOARD",
    // upstream says "open"; the UI filter/card keys use "live"
    status: status === "open" ? "live" : status === "listed" ? "closed" : status,
    priceBand: min && max ? (min === max ? inr(min) : `${inr(min)} – ${inr(max)}`) : "TBA",
    lot,
    minInvestment: lot && max ? inr(lot * max) : "-",
    gmp,
    gmpPercent: gmp != null && max ? `${((gmp / max) * 100).toFixed(1)}%` : null,
    issueSize:
      Number.isFinite(crores) && crores > 0
        ? `₹${crores.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`
        : "-",
    open: fmtDate(raw.open),
    close: fmtDate(raw.close),
    allotment: fmtDate(raw.allotment_date),
    listing: fmtDate(raw.listing_date),
    logo: `/api/logo/${raw.id}`,
    slug: raw.slug || String(raw.id),
    sourceUrl: "https://www.ipopremium.in",
  };
}

export function toIpo(record: IpoRecord): Ipo {
  const min = record.minPrice && record.minPrice > 0 ? record.minPrice : null;
  const max = record.maxPrice && record.maxPrice > 0 ? record.maxPrice : null;
  const lot = record.lotSize && record.lotSize > 0 ? record.lotSize : null;
  const gmp = typeof record.gmp === "number" ? record.gmp : null;
  const crores = Number(record.issueSizeCr);
  const status = ["live", "upcoming", "closed"].includes(record.status)
    ? record.status
    : record.status === "open"
      ? "live"
      : "upcoming";
  const version = record.updatedAt ? new Date(record.updatedAt).getTime() : 0;

  return {
    id: record.id,
    name: record.name,
    board: record.board === "SME" ? "SME" : "MAINBOARD",
    status,
    priceBand: min && max ? (min === max ? inr(min) : `${inr(min)} – ${inr(max)}`) : "TBA",
    lot,
    minInvestment: lot && max ? inr(lot * max) : "-",
    gmp,
    gmpPercent: gmp != null && max ? `${((gmp / max) * 100).toFixed(1)}%` : null,
    issueSize:
      Number.isFinite(crores) && crores > 0
        ? `₹${crores.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`
        : "-",
    open: fmtDate(record.openDate),
    close: fmtDate(record.closeDate),
    allotment: fmtDate(record.allotmentDate),
    listing: fmtDate(record.listingDate),
    logo: `/api/logo/${record.id}${version ? `?v=${version}` : ""}`,
    slug: record.slug,
    sourceUrl: record.sourceUrl || "https://www.ipopremium.in",
  };
}

export async function fetchUpstreamRows(fresh = false): Promise<RawIpo[]> {
  // /api/ipo/list only carries open + upcoming; closed ones live on their own endpoint.
  const [list, closed] = await Promise.allSettled([
    fetchUpstream("list", fresh),
    fetchUpstream("closed?limit=20", fresh),
  ]);
  if (list.status === "rejected" && closed.status === "rejected") throw list.reason;

  const rows = [
    ...(list.status === "fulfilled" ? (list.value.data ?? []) : []),
    ...(closed.status === "fulfilled" ? (closed.value.data ?? []) : []),
  ];
  const seen = new Set<number>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function fetchIpos(fresh = false): Promise<Ipo[]> {
  return (await fetchUpstreamRows(fresh)).map(normalize);
}

async function fetchUpstream(path: string, fresh: boolean): Promise<{ data?: RawIpo[] }> {
  const res = await fetch(`https://www.ipopremium.in/api/ipo/${path}`, {
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; ipo-share/1.0)" },
    signal: AbortSignal.timeout(15000),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return (await res.json()) as { data?: RawIpo[] };
}

export function logoUrl(id: number): string {
  return `https://assets.ipopremium.in/images/ipo/${id}.png`;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "ipo"
  );
}

export function initials(name: string): string {
  const words = name.replace(/\b(limited|ltd|private|pvt)\b/gi, "").trim().split(/\s+/);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "IPO";
}
