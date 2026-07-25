import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getIntranetDb } from "@/lib/intranet-db";
import type { CrmClient } from "@/lib/types";

export default async function KlienciPage() {
  let clients: CrmClient[] = [];
  let error = "";

  try {
    clients = await getIntranetDb().getCrmClients();
  } catch (e) {
    error = e instanceof Error ? e.message : "Błąd ładowania";
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Klienci CRM</h1>
          <p className="mt-1 text-sm text-white/50">
            Baza klientów agencji — kontakty, notatki, linki
          </p>
        </div>
        <Link href="/admin/klienci/nowy">
          <Button>+ Nowy klient</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error.includes("crm_clients") ? (
            <>
              Uruchom migrację SQL{" "}
              <code className="text-xs">002_intranet_schema.sql</code> w
              Supabase.
            </>
          ) : (
            error
          )}
        </div>
      )}

      {!clients.length ? (
        <GlassCard>
          <p className="text-white/50">Brak klientów CRM. Dodaj pierwszego.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/admin/klienci/${client.id}`}>
              <div className="glass rounded-lg p-5 transition hover:bg-white/8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-bold">{client.company_name}</h2>
                    <p className="text-sm text-white/50">
                      {client.contact_name ?? "—"}
                      {client.industry ? ` · ${client.industry}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-white/30">
                    {client.email && <p>{client.email}</p>}
                    {client.phone && <p>{client.phone}</p>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
