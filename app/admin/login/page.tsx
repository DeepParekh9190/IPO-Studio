import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "../actions";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin login · IPO Studio",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdmin()) redirect("/admin/ipos");
  const { error } = await searchParams;
  const configured = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <Link href="/" className="admin-back">
          ← Back to IPO Studio
        </Link>
        <h1>Admin</h1>
        <p className="note">One password. Manage the public IPO list and run syncs.</p>

        {!configured && (
          <p className="admin-alert">Set <code>ADMIN_PASSWORD</code> in the environment before signing in.</p>
        )}
        {error && <p className="admin-alert">Wrong password. Try again.</p>}

        <form action={loginAction} className="admin-login-form">
          <label className="admin-label">
            Password
            <input type="password" name="password" autoFocus required autoComplete="current-password" />
          </label>
          <button className="btn" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
