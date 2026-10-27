import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const ipos = pgTable(
  "ipos",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull().default("manual"),
    externalId: text("external_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    board: text("board").notNull().default("MAINBOARD"),
    status: text("status").notNull().default("upcoming"),
    minPrice: integer("min_price"),
    maxPrice: integer("max_price"),
    lotSize: integer("lot_size"),
    gmp: integer("gmp"),
    issueSizeCr: numeric("issue_size_cr", { precision: 14, scale: 2 }),
    openDate: date("open_date"),
    closeDate: date("close_date"),
    allotmentDate: date("allotment_date"),
    listingDate: date("listing_date"),
    logoUrl: text("logo_url"),
    sourceUrl: text("source_url"),
    published: boolean("published").notNull().default(true),
    locked: boolean("locked").notNull().default(false),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ipos_source_external_idx").on(table.source, table.externalId),
    uniqueIndex("ipos_slug_idx").on(table.slug),
    index("ipos_published_idx").on(table.published),
  ],
);

export type IpoRow = typeof ipos.$inferSelect;
export type IpoInsert = typeof ipos.$inferInsert;
