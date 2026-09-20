import { KlienciListClient } from "@/components/KlienciListClient";
import { getIntranetDb } from "@/lib/intranet-db";
import type { CrmClient } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function KlienciPage() {
  let clients: CrmClient[] = [];
  let error = "";

  try {
    clients = await getIntranetDb().getCrmClients();
  } catch (e) {
    error = e instanceof Error ? e.message : "Błąd ładowania";
  }

  return (
    <div>
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <KlienciListClient clients={clients} />
    </div>
  );
}
