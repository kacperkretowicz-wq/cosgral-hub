import Link from "next/link";
import { getIntranetDb } from "@/lib/intranet-db";
import { ZlecenieEditor } from "@/components/ZlecenieEditor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ZlecenieDetailPage({ params }: Props) {
  const { id } = await params;

  let project = null;
  let loadError = "";

  try {
    project = await getIntranetDb().getProject(id);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Błąd ładowania zlecenia";
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/zlecenia"
          className="text-sm text-white/50 hover:text-white"
        >
          ← Zlecenia
        </Link>
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/zlecenia"
          className="text-sm text-white/50 hover:text-white"
        >
          ← Zlecenia
        </Link>
        <p className="text-white/50">
          Nie znaleziono zlecenia. Mogło zostać usunięte albo nie zapisało się w
          bazie (sprawdź konfigurację Supabase).
        </p>
      </div>
    );
  }

  return <ZlecenieEditor initialProject={project} />;
}
