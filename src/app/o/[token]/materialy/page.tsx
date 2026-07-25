import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { MaterialsForm } from "@/components/MaterialsForm";
import { getDb } from "@/lib/db/client";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function MaterialsPage({ params }: Props) {
  const { token } = await params;
  const db = getDb();
  const client = await db.getClientByToken(token);

  if (!client) notFound();

  return (
    <PageShell logoHref={`/o/${token}`} logoSize="lg">
      <div className="mb-6">
        <Link
          href={`/o/${token}`}
          className="text-sm text-white/50 hover:text-white"
        >
          ← Wróć do oferty ({client.company_name})
        </Link>
      </div>
      <MaterialsForm token={token} />
    </PageShell>
  );
}
