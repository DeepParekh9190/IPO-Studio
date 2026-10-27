import { NextResponse } from "next/server";
import { syncIpos } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await syncIpos());
  } catch (error) {
    console.error("IPO sync failed", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
