import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb, isDbConfigured } from "./db";
import { fetchIpos, fetchUpstreamRows, logoUrl, toIpo, type Ipo } from "./ipos";
import { ipos, type IpoRow } from "./schema";

export type AdminFilters = {
  q?: string;
  status?: string;
  board?: string;
};

export async function getPublicIpos(fresh = false): Promise<Ipo[]> {
  if (!isDbConfigured()) return fetchIpos(fresh);

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(ipos)
      .where(and(eq(ipos.published, true), isNull(ipos.deletedAt)))
      .orderBy(desc(ipos.updatedAt));
    if (rows.length) return rows.map(toIpo);

    // An empty table means the first sync has not run yet. A table with rows
    // means the admin hid/deleted everything, so respect that instead.
    const [any] = await db.select({ id: ipos.id }).from(ipos).limit(1);
    if (any) return [];
  } catch (error) {
    console.error("IPO database read failed; serving upstream data", error);
  }

  // shortcut: keeps the public site alive before the first sync or during a DB outage.
  return fetchIpos(fresh);
}

export async function getAdminIpos(filters: AdminFilters = {}): Promise<IpoRow[]> {
  const q = filters.q?.trim();
  const where = [isNull(ipos.deletedAt)];

  if (q) {
    where.push(or(ilike(ipos.name, `%${q}%`), ilike(ipos.slug, `%${q}%`))!);
  }
  if (filters.status && ["live", "upcoming", "closed"].includes(filters.status)) {
    where.push(eq(ipos.status, filters.status));
  }
  if (filters.board && ["MAINBOARD", "SME"].includes(filters.board)) {
    where.push(eq(ipos.board, filters.board));
  }

  return getDb().select().from(ipos).where(and(...where)).orderBy(desc(ipos.updatedAt));
}

export async function getAdminIpo(id: number): Promise<IpoRow | null> {
  if (!Number.isInteger(id)) return null;
  const rows = await getDb()
    .select()
    .from(ipos)
    .where(and(eq(ipos.id, id), isNull(ipos.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLogoUrl(id: number): Promise<string | null> {
  if (!Number.isInteger(id)) return null;

  if (isDbConfigured()) {
    try {
      const db = getDb();
      const rows = await db
        .select({ logoUrl: ipos.logoUrl })
        .from(ipos)
        .where(eq(ipos.id, id))
        .limit(1);
      if (rows[0]) return rows[0].logoUrl || null;

      // Only fall back before the first sync. Once the table has rows, an
      // unknown id is a deleted/missing IPO, not an upstream id.
      const [any] = await db.select({ id: ipos.id }).from(ipos).limit(1);
      if (any) return null;
    } catch (error) {
      console.error("IPO database logo read failed; trying upstream", error);
    }
  }

  // shortcut: DB-less/dev mode still resolves upstream logos.
  const raw = (await fetchUpstreamRows().catch(() => [])).find((row) => row.id === id);
  return raw ? raw.icon_url || logoUrl(raw.id) : null;
}
