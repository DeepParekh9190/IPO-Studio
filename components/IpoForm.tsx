import Link from "next/link";
import { saveIpoAction } from "@/app/admin/actions";
import type { IpoRow } from "@/lib/schema";

export function IpoForm({ ipo, error }: { ipo?: IpoRow; error?: string }) {
  const editing = Boolean(ipo);

  return (
    <form action={saveIpoAction} className="admin-form">
      {ipo && <input type="hidden" name="id" value={ipo.id} />}
      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-form-head">
        <div>
          <h1>{editing ? "Edit IPO" : "New IPO"}</h1>
          <p className="note">
            {editing
              ? `Source: ${ipo!.source}${ipo!.externalId ? ` · #${ipo!.externalId}` : ""}`
              : "Manual rows are not touched by the sync."}
          </p>
        </div>
        <div className="admin-actions">
          <Link className="btn ghost" href="/admin/ipos">
            Cancel
          </Link>
          <button className="btn" type="submit">
            Save IPO
          </button>
        </div>
      </div>

      <section className="admin-section">
        <h2>Company</h2>
        <div className="admin-form-grid">
          <label className="admin-field wide">
            <span>Name</span>
            <input name="name" defaultValue={ipo?.name ?? ""} required minLength={2} />
          </label>
          <label className="admin-field">
            <span>Slug</span>
            <input name="slug" defaultValue={ipo?.slug ?? ""} placeholder="auto from name" />
          </label>
          <label className="admin-field">
            <span>Board</span>
            <select name="board" defaultValue={ipo?.board ?? "MAINBOARD"}>
              <option value="MAINBOARD">Mainboard</option>
              <option value="SME">SME</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Status</span>
            <select name="status" defaultValue={ipo?.status ?? "upcoming"}>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="admin-field wide">
            <span>Source URL</span>
            <input
              name="sourceUrl"
              type="url"
              defaultValue={ipo?.sourceUrl ?? ""}
              placeholder="https://www.ipopremium.in/..."
            />
          </label>
        </div>
      </section>

      <section className="admin-section">
        <h2>Offer</h2>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Min price (₹)</span>
            <input name="minPrice" type="number" min="0" step="1" defaultValue={ipo?.minPrice ?? ""} />
          </label>
          <label className="admin-field">
            <span>Max price (₹)</span>
            <input name="maxPrice" type="number" min="0" step="1" defaultValue={ipo?.maxPrice ?? ""} />
          </label>
          <label className="admin-field">
            <span>Lot size</span>
            <input name="lotSize" type="number" min="0" step="1" defaultValue={ipo?.lotSize ?? ""} />
          </label>
          <label className="admin-field">
            <span>GMP (₹)</span>
            <input name="gmp" type="number" step="1" defaultValue={ipo?.gmp ?? ""} />
          </label>
          <label className="admin-field">
            <span>Issue size (₹ Cr)</span>
            <input name="issueSizeCr" type="number" min="0" step="0.01" defaultValue={ipo?.issueSizeCr ?? ""} />
          </label>
        </div>
      </section>

      <section className="admin-section">
        <h2>Dates</h2>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Opens</span>
            <input name="openDate" type="date" defaultValue={ipo?.openDate ?? ""} />
          </label>
          <label className="admin-field">
            <span>Closes</span>
            <input name="closeDate" type="date" defaultValue={ipo?.closeDate ?? ""} />
          </label>
          <label className="admin-field">
            <span>Allotment</span>
            <input name="allotmentDate" type="date" defaultValue={ipo?.allotmentDate ?? ""} />
          </label>
          <label className="admin-field">
            <span>Listing</span>
            <input name="listingDate" type="date" defaultValue={ipo?.listingDate ?? ""} />
          </label>
        </div>
      </section>

      <section className="admin-section">
        <h2>Logo</h2>
        <div className="admin-form-grid">
          <label className="admin-field wide">
            <span>Logo URL</span>
            <input
              name="logoUrl"
              type="url"
              defaultValue={ipo?.logoUrl ?? ""}
              placeholder="https://... or upload below"
            />
          </label>
          <label className="admin-field wide">
            <span>Replace logo</span>
            <input name="logoFile" type="file" accept="image/*" />
          </label>
        </div>
        {ipo?.logoUrl && <img className="admin-logo-preview" src={ipo.logoUrl} alt="" />}
        <p className="note">Uploads go to Vercel Blob, up to 4 MB. Leave both blank to use initials.</p>
      </section>

      <section className="admin-section">
        <h2>Visibility</h2>
        <div className="admin-checks">
          <label>
            <input type="checkbox" name="published" defaultChecked={ipo ? ipo.published : true} />
            Published on the public site
          </label>
          <label>
            <input
              type="checkbox"
              name="locked"
              defaultChecked={ipo ? ipo.locked || ipo.source !== "manual" : false}
            />
            Lock from auto-sync
          </label>
        </div>
        <p className="note">
          Use lock when you have edited a synced IPO. The sync skips locked rows and keeps your publish choice.
        </p>
      </section>

      <div className="admin-form-foot">
        <Link className="btn ghost" href="/admin/ipos">
          Cancel
        </Link>
        <button className="btn" type="submit">
          Save IPO
        </button>
      </div>
    </form>
  );
}
