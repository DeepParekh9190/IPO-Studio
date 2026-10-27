import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { fetchUpstreamRows, logoUrl, normalize, slugify, type RawIpo } from "./ipos";
import { ipos, type IpoInsert } from "./schema";

const SOURCE = "ipopremium";

export type SyncResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
};

function dateOrNull(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

function statusOf(raw: RawIpo, fallback: string): string {
  if (["live", "upcoming", "closed"].includes(fallback)) return fallback;
  const today = new Date().toISOString().slice(0, 10);
  if (raw.close && raw.close < today) return "closed";
  if (raw.open && raw.open > today) return "upcoming";
  return "live";
}

function toRow(raw: RawIpo): Omit<IpoInsert, "published" | "locked"> {
  const ipo = normalize(raw);
  const crores = Number(raw.issue_size);
  const gmp = Number(raw.premium);
  const slug = raw.slug ? slugify(raw.slug) : `${slugify(ipo.name)}-${raw.id}`;

  return {
    source: SOURCE,
    externalId: String(raw.id),
    name: ipo.name,
    slug,
    board: ipo.board,
    status: statusOf(raw, ipo.status),
    minPrice: raw.min_price && raw.min_price > 0 ? Math.round(raw.min_price) : null,
    maxPrice: raw.max_price && raw.max_price > 0 ? Math.round(raw.max_price) : null,
    lotSize: raw.lot_size && raw.lot_size > 0 ? Math.round(raw.lot_size) : null,
    gmp: raw.premium != null && Number.isFinite(gmp) ? Math.round(gmp) : null,
    issueSizeCr: Number.isFinite(crores) && crores > 0 ? crores.toFixed(2) : null,
    openDate: dateOrNull(raw.open),
    closeDate: dateOrNull(raw.close),
    allotmentDate: dateOrNull(raw.allotment_date),
    listingDate: dateOrNull(raw.listing_date),
    logoUrl: raw.icon_url || logoUrl(raw.id),
    sourceUrl: raw.slug
      ? `https://www.ipopremium.in/view/ipo/${raw.id}/${raw.slug}`
      : "https://www.ipopremium.in",
  };
}

/**
 * Imports the current ipopremium list into Postgres without touching rows an
 * admin has locked or deleted. New rows are published immediately.
 *
 * shortcut: one upstream source. Add an ipos.markets fallback if this feed is
 * blocked; that source has no GMP, lot size, or logos.
 */
export async function syncIpos(): Promise<SyncResult> {
  const db = getDb();
  const raw = await fetchUpstreamRows(true);
  const externalIds = raw.map((row) => String(row.id));
  if (!externalIds.length) return { fetched: 0, inserted: 0, updated: 0, skipped: 0 };

  const existing = await db
    .select({
      id: ipos.id,
      externalId: ipos.externalId,
      locked: ipos.locked,
      deletedAt: ipos.deletedAt,
    })
    .from(ipos)
    .where(and(eq(ipos.source, SOURCE), inArray(ipos.externalId, externalIds)));

  const byExternalId = new Map(existing.map((row) => [row.externalId, row]));
  const slugOwner = new Map(
    (await db.select({ id: ipos.id, slug: ipos.slug }).from(ipos)).map((row) => [row.slug, row.id]),
  );
  const now = new Date();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  await db.transaction(async (tx) => {
    for (const source of raw) {
      const row = toRow(source);
      const current = byExternalId.get(String(source.id));

      if (current) {
        if (current.locked || current.deletedAt) {
          skipped++;
          continue;
        }
      }

      let slug = row.slug;
      while (slugOwner.has(slug) && slugOwner.get(slug) !== current?.id) {
        slug = `${slug}-${source.id}`;
      }
      slugOwner.set(slug, current?.id ?? -1);
      const values = { ...row, slug };

      if (current) {
        await tx
          .update(ipos)
          .set({ ...values, lastSyncedAt: now, updatedAt: now })
          .where(eq(ipos.id, current.id));
        updated++;
      } else {
        const [created] = await tx
          .insert(ipos)
          .values({
            ...values,
            published: true,
            locked: false,
            lastSyncedAt: now,
          })
          .onConflictDoNothing()
          .returning({ id: ipos.id });
        if (created) inserted++;
        else skipped++;
      }
    }
  });

  return { fetched: raw.length, inserted, updated, skipped };
}
