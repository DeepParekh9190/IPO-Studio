"use server";

import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminSession, requireAdminAction, setAdminSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/ipos";
import { ipos } from "@/lib/schema";
import { syncIpos, type SyncResult } from "@/lib/sync";

const BOARDS = ["MAINBOARD", "SME"];
const STATUSES = ["live", "upcoming", "closed"];

function text(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function numberValue(form: FormData, key: string, signed = false): number | null {
  const raw = text(form, key);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || (!signed && value < 0)) {
    throw new Error(`${key.replace("_", " ")} is invalid`);
  }
  return value;
}

function integerValue(form: FormData, key: string, signed = false): number | null {
  const value = numberValue(form, key, signed);
  return value == null ? null : Math.round(value);
}

function dateValue(form: FormData, key: string): string | null {
  const value = text(form, key);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${key.replace("_", " ")} is invalid`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${key.replace("_", " ")} is invalid`);
  }
  return value;
}

function httpUrl(value: string, label: string): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} URL is invalid`);
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${label} URL must start with http or https`);
  return url.toString();
}

async function uploadLogo(file: File) {
  if (!file.size) return null;
  if (!file.type.startsWith("image/")) throw new Error("Logo must be an image");
  if (file.size > 4 * 1024 * 1024) throw new Error("Logo must be under 4 MB");

  const blob = await put(`ipos/${Date.now()}-${slugify(file.name)}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function loginAction(form: FormData) {
  const password = String(form.get("password") || "");
  if (!checkPassword(password)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    redirect("/admin/login?error=1");
  }
  await setAdminSession();
  redirect("/admin/ipos");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function saveIpoAction(form: FormData) {
  await requireAdminAction();

  const idText = text(form, "id");
  const id = idText ? Number(idText) : null;
  const base = id ? `/admin/ipos/${id}` : "/admin/ipos/new";
  let failure = "";

  try {
    if (idText && (!Number.isInteger(id) || id! < 1)) throw new Error("Invalid IPO id");

    const name = text(form, "name");
    if (name.length < 2) throw new Error("Name is required");

    const board = text(form, "board");
    if (!BOARDS.includes(board)) throw new Error("Choose a valid board");

    const status = text(form, "status");
    if (!STATUSES.includes(status)) throw new Error("Choose a valid status");

    const minPrice = integerValue(form, "minPrice");
    const maxPrice = integerValue(form, "maxPrice");
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      throw new Error("Minimum price cannot be above maximum price");
    }

    const slug = slugify(text(form, "slug") || name);
    const logoFile = form.get("logoFile");
    const uploaded = logoFile instanceof File ? await uploadLogo(logoFile) : null;
    const logoUrl = uploaded || httpUrl(text(form, "logoUrl"), "Logo");
    const issueSize = numberValue(form, "issueSizeCr");
    const sourceUrl = httpUrl(text(form, "sourceUrl"), "Source");

    const values = {
      name,
      slug,
      board,
      status,
      minPrice,
      maxPrice,
      lotSize: integerValue(form, "lotSize"),
      gmp: integerValue(form, "gmp", true),
      issueSizeCr: issueSize == null ? null : issueSize.toFixed(2),
      openDate: dateValue(form, "openDate"),
      closeDate: dateValue(form, "closeDate"),
      allotmentDate: dateValue(form, "allotmentDate"),
      listingDate: dateValue(form, "listingDate"),
      logoUrl,
      sourceUrl,
      published: form.get("published") === "on",
      locked: form.get("locked") === "on",
      updatedAt: new Date(),
    };

    const db = getDb();
    if (id) {
      const [row] = await db.update(ipos).set(values).where(eq(ipos.id, id)).returning({ id: ipos.id });
      if (!row) throw new Error("IPO not found");
      revalidatePath("/");
      revalidatePath("/admin/ipos");
      redirect(`/admin/ipos/${id}?saved=1`);
    }

    const [row] = await db
      .insert(ipos)
      .values({ ...values, source: "manual", externalId: null })
      .returning({ id: ipos.id });
    revalidatePath("/");
    revalidatePath("/admin/ipos");
    redirect(`/admin/ipos/${row.id}?saved=1`);
  } catch (error) {
    if (typeof error === "object" && error !== null && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "Could not save IPO";
    failure = message.includes("DATABASE_URL")
      ? "DATABASE_URL is not set."
      : message.includes("ipos_slug_idx")
        ? "That slug already exists."
        : message;
  }

  redirect(`${base}?error=${encodeURIComponent(failure)}`);
}

export async function deleteIpoAction(form: FormData) {
  await requireAdminAction();
  const id = Number(text(form, "id"));
  if (!Number.isInteger(id) || id < 1) redirect("/admin/ipos?error=Invalid+IPO");

  await getDb()
    .update(ipos)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(ipos.id, id));
  revalidatePath("/");
  revalidatePath("/admin/ipos");
  redirect("/admin/ipos?deleted=1");
}

export async function togglePublishedAction(form: FormData) {
  await requireAdminAction();
  const id = Number(text(form, "id"));
  if (!Number.isInteger(id) || id < 1) return;

  await getDb()
    .update(ipos)
    .set({ published: text(form, "published") !== "true", updatedAt: new Date() })
    .where(eq(ipos.id, id));
  revalidatePath("/");
  revalidatePath("/admin/ipos");
}

export async function syncNowAction() {
  await requireAdminAction();
  let result: SyncResult;
  try {
    result = await syncIpos();
  } catch (error) {
    console.error("Manual IPO sync failed", error);
    redirect("/admin/ipos?error=Sync%20failed.%20Check%20the%20server%20logs.");
  }

  revalidatePath("/");
  revalidatePath("/admin/ipos");
  redirect(
    `/admin/ipos?synced=${result.inserted}%20new%2C%20${result.updated}%20updated%2C%20${result.skipped}%20locked`,
  );
}
