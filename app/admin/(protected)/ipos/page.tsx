import Link from "next/link";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { isDbConfigured } from "@/lib/db";
import { getAdminIpos } from "@/lib/queries";
import { deleteIpoAction, syncNowAction, togglePublishedAction } from "../../actions";

export const dynamic = "force-dynamic";

type Search = {
  q?: string;
  status?: string;
  board?: string;
  synced?: string;
  deleted?: string;
  error?: string;
};

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

function shortDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminIposPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = one(params.q).trim();
  const status = one(params.status);
  const board = one(params.board);
  const dbReady = isDbConfigured();

  let rows: Awaited<ReturnType<typeof getAdminIpos>> = [];
  let loadFailed = false;
  if (dbReady) {
    try {
      rows = await getAdminIpos({ q, status, board });
    } catch (error) {
      console.error("Admin IPO list failed", error);
      loadFailed = true;
    }
  }

  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>IPOs</h1>
          <p className="note">The public catalog is read-only. Syncs never overwrite locked or deleted rows.</p>
        </div>
        <div className="admin-actions">
          <Link className="btn" href="/admin/ipos/new">
            New IPO
          </Link>
          <form action={syncNowAction}>
            <button className="btn ghost" type="submit" disabled={!dbReady}>
              Sync now
            </button>
          </form>
        </div>
      </div>

      {!dbReady && (
        <div className="admin-alert">
          Set <code>DATABASE_URL</code> and run <code>npm run db:migrate</code> to manage IPOs. The public site is
          still serving the upstream fallback.
        </div>
      )}
      {one(params.synced) && <div className="admin-ok">Sync complete: {one(params.synced)}.</div>}
      {one(params.deleted) && <div className="admin-ok">IPO removed from the public catalog.</div>}
      {one(params.error) && <div className="admin-alert">{one(params.error)}</div>}
      {loadFailed && <div className="admin-alert">Could not load IPOs. Check the server logs.</div>}

      <form className="admin-filters" method="get">
        <input name="q" placeholder="Search name or slug" defaultValue={q} />
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">All statuses</option>
          <option value="live">Live</option>
          <option value="upcoming">Upcoming</option>
          <option value="closed">Closed</option>
        </select>
        <select name="board" defaultValue={board} aria-label="Board">
          <option value="">All boards</option>
          <option value="MAINBOARD">Mainboard</option>
          <option value="SME">SME</option>
        </select>
        <button className="btn ghost" type="submit">
          Filter
        </button>
        {(q || status || board) && <Link href="/admin/ipos">Clear</Link>}
      </form>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>IPO</th>
              <th>Status</th>
              <th>Dates</th>
              <th>Public</th>
              <th>Sync</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((ipo) => (
              <tr key={ipo.id}>
                <td>
                  <Link href={`/admin/ipos/${ipo.id}`} className="admin-ipo-name">
                    {ipo.name}
                  </Link>
                  <span className="admin-sub">
                    {ipo.board} · {ipo.source}
                    {ipo.externalId ? ` #${ipo.externalId}` : ""}
                  </span>
                </td>
                <td>
                  <span className={`pill ${ipo.status}`}>{ipo.status}</span>
                  <span className="admin-sub">
                    {ipo.openDate ? `${shortDate(ipo.openDate)} – ${shortDate(ipo.closeDate)}` : "No dates"}
                  </span>
                </td>
                <td>
                  <span className="admin-sub">
                    {ipo.minPrice && ipo.maxPrice ? `₹${ipo.minPrice} – ₹${ipo.maxPrice}` : "Price TBA"}
                    <br />
                    {ipo.gmp == null ? "No GMP" : `GMP ₹${ipo.gmp}`}
                  </span>
                </td>
                <td>
                  <form action={togglePublishedAction}>
                    <input type="hidden" name="id" value={ipo.id} />
                    <input type="hidden" name="published" value={String(ipo.published)} />
                    <button className={`mini-btn ${ipo.published ? "" : "muted"}`} type="submit">
                      {ipo.published ? "Published" : "Draft"}
                    </button>
                  </form>
                </td>
                <td>
                  <span className={`badge ${ipo.locked ? "locked" : ""}`}>{ipo.locked ? "Locked" : "Auto"}</span>
                  <span className="admin-sub">
                    {ipo.lastSyncedAt
                      ? `Synced ${new Date(ipo.lastSyncedAt).toLocaleDateString("en-IN")}`
                      : "Manual"}
                  </span>
                </td>
                <td className="admin-row-actions">
                  <Link href={`/admin/ipos/${ipo.id}`}>Edit</Link>
                  <form action={deleteIpoAction}>
                    <input type="hidden" name="id" value={ipo.id} />
                    <ConfirmSubmit message={`Delete ${ipo.name}? The public page will stop showing it.`}>
                      Delete
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="admin-empty">
                  {dbReady
                    ? q || status || board
                      ? "No IPOs match these filters."
                      : "No IPOs yet. Run Sync now."
                    : "Connect a database to add or edit IPOs."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="note admin-footnote">
        {dbReady
          ? "New synced rows publish automatically. Editing a row locks it until you uncheck “Lock from auto-sync”."
          : "The upstream fallback is read-only."}
      </p>
    </>
  );
}
