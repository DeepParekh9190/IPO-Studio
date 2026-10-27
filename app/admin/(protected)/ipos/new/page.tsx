import { IpoForm } from "@/components/IpoForm";

export const dynamic = "force-dynamic";

export default async function NewIpoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <IpoForm error={error} />;
}
