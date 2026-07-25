import Link from "next/link";
import { CosgralLogo } from "@/components/CosgralLogo";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getDb, isSupabaseConfigured } from "@/lib/db/client";
import { getIntranetDb } from "@/lib/intranet-db";
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/lib/intranet-labels";
import type { Client } from "@/lib/types";

export default async function AdminDashboard() {
  const db = getDb();
  const clients = await db.getClients();

  let recentProjects: Awaited<
    ReturnType<ReturnType<typeof getIntranetDb>["getProjects"]>
  > = [];
  try {
    const all = await getIntranetDb().getProjects();
    recentProjects = all.slice(0, 5);
  } catch {
    // intranet tables may not exist yet
  }

  const statusLabel: Record<string, string> = {
    draft: "Szkic",
    sent: "Wysłana",
    submitted: "Materiały przesłane",
  };

  const statusColor: Record<string, string> = {
    draft: "text-white/40",
    sent: "text-yellow-400/80",
    submitted: "text-green-400/80",
  };

  return (
    <div className="space-y-8">
      {!isSupabaseConfigured() && (
        <div className="rounded-sm border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Tryb lokalny aktywny.{" "}
          <Link href="/admin/setup" className="underline">
            Połącz Supabase →
          </Link>
        </div>
      )}

      <div className="flex items-center gap-4">
        <CosgralLogo size="lg" />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Cosgral Hub</h1>
          <p className="mt-1 text-sm text-white/50">
            Panel zespołu — oferty, zlecenia, klienci
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/generator">
          <GlassCard>
            <p className="text-2xl">✦</p>
            <p className="mt-2 font-bold">Generator WWW</p>
            <p className="text-sm text-white/50">Oferta + formularz materiałów</p>
          </GlassCard>
        </Link>
        <Link href="/admin/zlecenia">
          <GlassCard>
            <p className="text-2xl">◫</p>
            <p className="mt-2 font-bold">Zlecenia</p>
            <p className="text-sm text-white/50">{recentProjects.length}+ aktywnych</p>
          </GlassCard>
        </Link>
        <Link href="/admin/klienci">
          <GlassCard>
            <p className="text-2xl">◎</p>
            <p className="mt-2 font-bold">Klienci CRM</p>
            <p className="text-sm text-white/50">Baza kontaktów</p>
          </GlassCard>
        </Link>
      </div>

      {recentProjects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Ostatnie zlecenia</h2>
            <Link href="/admin/zlecenia">
              <Button variant="ghost">Wszystkie →</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {recentProjects.map((p) => (
              <Link key={p.id} href={`/admin/zlecenia/${p.id}`}>
                <div className="glass rounded-lg p-4 transition hover:bg-white/8">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-white/40">
                        {SERVICE_TYPE_LABELS[p.service_type]}
                      </p>
                    </div>
                    <span
                      className={`text-sm ${PROJECT_STATUS_COLORS[p.status]}`}
                    >
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Oferty WWW</h2>
          <Link href="/admin/generator">
            <Button>+ Wygeneruj formularz</Button>
          </Link>
        </div>

        {!clients.length ? (
          <GlassCard>
            <p className="text-white/50">
              Brak klientów. Wygeneruj pierwszą ofertę.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {(clients as Client[]).slice(0, 8).map((client) => (
              <Link key={client.id} href={`/admin/clients/${client.token}`}>
                <div className="glass rounded-lg p-5 transition hover:bg-white/8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-bold">{client.company_name}</h2>
                      <p className="text-sm text-white/50">
                        {client.page_type === "onepage" ? "Onepage" : "Multipage"}
                        {client.industry ? ` · ${client.industry}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${statusColor[client.status]}`}
                      >
                        {statusLabel[client.status]}
                      </p>
                      <p className="text-xs text-white/30">
                        {new Date(client.created_at).toLocaleDateString("pl-PL")}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
