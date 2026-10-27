import { getLogoUrl } from "@/lib/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logo = await getLogoUrl(Number(id)).catch(() => null);
  if (!logo) return new Response("Not found", { status: 404 });

  let url: URL;
  try {
    url = new URL(logo);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const host = url.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "::1" ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (!["http:", "https:"].includes(url.protocol) || privateHost) {
    return new Response("Not found", { status: 404 });
  }

  // shortcut: blocks obvious private hosts, not DNS rebinding; logos are admin-controlled.

  // Same-origin proxy so the canvas can draw the logo without tainting.
  const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(10000) });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.startsWith("image/")) return new Response("No logo", { status: 404 });

  return new Response(res.body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
