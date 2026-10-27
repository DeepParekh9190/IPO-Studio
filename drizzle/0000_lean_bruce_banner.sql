CREATE TABLE "ipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"board" text DEFAULT 'MAINBOARD' NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"min_price" integer,
	"max_price" integer,
	"lot_size" integer,
	"gmp" integer,
	"issue_size_cr" numeric(14, 2),
	"open_date" date,
	"close_date" date,
	"allotment_date" date,
	"listing_date" date,
	"logo_url" text,
	"source_url" text,
	"published" boolean DEFAULT true NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"last_synced_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ipos_source_external_idx" ON "ipos" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ipos_slug_idx" ON "ipos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ipos_published_idx" ON "ipos" USING btree ("published");