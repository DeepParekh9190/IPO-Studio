import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (!client) {
    // Vercel functions are short-lived: one connection per instance is enough.
    // 20s leaves room for Neon's scale-to-zero compute to wake on the first request.
    client = postgres(url, { max: 1, prepare: false, connect_timeout: 20, idle_timeout: 20 });
  }

  return drizzle(client, { schema });
}
