import { NextResponse } from "next/server";
import { getPublicIpos } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.has("fresh");
  try {
    const ipos = await getPublicIpos(fresh);
    return NextResponse.json(
      { ipos, fetchedAt: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "IPO data unavailable" }, { status: 502 });
  }
}
