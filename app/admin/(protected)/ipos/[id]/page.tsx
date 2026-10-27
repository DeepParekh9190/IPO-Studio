import { notFound } from "next/navigation";
import { IpoForm } from "@/components/IpoForm";
import { getAdminIpo } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditIpoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const ipo = await getAdminIpo(Number(id)).catch(() => null);
  if (!ipo) notFound();

  return (
    <>
      {saved && <div className="admin-ok">Saved.</div>}
      <IpoForm ipo={ipo} error={error} />
    </>
  );
}
