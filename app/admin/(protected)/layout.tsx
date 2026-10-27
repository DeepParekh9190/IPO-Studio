import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IPO Studio admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="admin-shell">
      <header className="admin-nav">
        <div className="shell admin-nav-inner">
          <Link href="/admin/ipos" className="admin-brand">
            IPO Studio <span>/ admin</span>
          </Link>
          <nav>
            <Link href="/admin/ipos">IPOs</Link>
            <Link href="/" target="_blank">
              View site ↗
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="admin-link-button">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="shell admin-main">{children}</main>
    </div>
  );
}
