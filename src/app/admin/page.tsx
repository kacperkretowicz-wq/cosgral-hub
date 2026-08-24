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
import { probeSchemaHealth } from "@/lib/run-migrations";
import type { Client, Lead, Project } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatPln(n: number) {
  return n.toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function isActiveProject(p: Project) {
  return p.status !== "zakonczone" && p.status !== "anulowane";
}

function isThisMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

export default async function AdminDashboard() {
  let clients: Client[] = [];
  let clientsError = "";
  try {
    clients = await getDb().getClients();
  } catch (e) {
    clientsError =
      e instanceof Error ? e.message : "Błąd połączenia z bazą (Supabase)";
  }

  let allProjects: Project[] = [];
  let recentProjects: Project[] = [];
  let projectsError = "";
  try {
    allProjects = await getIntranetDb().getProjects();
    recentProjects = allProjects.slice(0, 5);
  } catch (e) {
    projectsError = e instanceof Error ? e.message : "Błąd ładowania zleceń";
  }

  let leads: Lead[] = [];
  let leadsError = "";
  try {
    const { getOpsDb } = await import("@/lib/ops-db");
    leads = await getOpsDb().getLeads();
  } catch (e) {
    leadsError = e instanceof Error ? e.message : "Błąd ładowania leadów";
  }

  let schemaReady = true;
  let schemaMissing: string[] = [];
  if (isSupabaseConfigured()) {
    try {
      const health = await probeSchemaHealth();
      schemaReady = health.ready;
      schemaMissing = health.missing;
    } catch {
      schemaReady = false;
      schemaMissing = ["health_check_failed"];
    }
  }

  const activeProjects = allProjects.filter(isActiveProject);
  const newLeads = leads.filter((l) => l.status === "nowy");

  const paidThisMonth = allProjects.filter(
    (p) =>
      p.billing_status === "oplacone" &&
      p.value_pln != null &&
      (isThisMonth(p.paid_at ?? "") || (!p.paid_at && isThisMonth(p.updated_at))),
  );
  const mtdRevenue = paidThisMonth.reduce(
    (sum, p) => sum + (p.value_pln ?? 0),
    0,
  );
  const mtdCosts = paidThisMonth.reduce(
    (sum, p) => sum + (p.cost_pln ?? 0),
    0,
  );

  const unpaidPipeline = allProjects
    .filter(
      (p) =>
        (p.billing_status === "wycena" || p.billing_status === "faktura") &&
        p.value_pln != null,
    )
    .reduce((sum, p) => sum + (p.value_pln ?? 0), 0);

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
        <div className="rounded-sm border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <p className="font-medium">Baza nie jest podpięta — dane się nie zapisują.</p>
          <p className="mt-1 text-red-100/80">
            Na Netlify/Vercel tryb lokalny nie działa (plik znika po restarcie).
            Ustaw klucze Supabase (w tym{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code>) i uruchom
            migracje SQL 001 + 002 oraz 007 + 008 (oferta Cosgral, OS agencji).{" "}
            <Link href="/admin/setup" className="underline">
              Przejdź do setup →
            </Link>
          </p>
        </div>
      )}

      {isSupabaseConfigured() && !schemaReady && (
        <div className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <p className="font-medium">Schema Cosgral OS niekompletna</p>
          <p className="mt-1 text-amber-100/80">
            Brakuje: {schemaMissing.join(", ") || "elementów schematu"}. Wejdź w
            setup i uruchom migracje (albo wklej SQL 007–009).{" "}
            <Link href="/admin/setup" className="underline">
              Setup / migracje →
            </Link>
          </p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Aktywne zlecenia
          </p>
          <p className="mt-2 text-3xl font-bold">{activeProjects.length}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Nowe leady
          </p>
          <p className="mt-2 text-3xl font-bold">{newLeads.length}</p>
          {leadsError ? (
            <p className="mt-1 text-xs text-amber-300/80">Brak tabeli leads?</p>
          ) : null}
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Przychód MTD
          </p>
          <p className="mt-2 text-3xl font-bold">{formatPln(mtdRevenue)} zł</p>
          <p className="mt-1 text-xs text-white/40">
            marża {formatPln(mtdRevenue - mtdCosts)} zł ·{" "}
            {paidThisMonth.length} opłaconych
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Pipeline nieopłacony
          </p>
          <p className="mt-2 text-3xl font-bold">{formatPln(unpaidPipeline)} zł</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/generator">
          <GlassCard>
            <p className="text-2xl">✦</p>
            <p className="mt-2 font-bold">Generator WWW</p>
            <p className="text-sm text-white/50">Oferta + formularz materiałów</p>
          </GlassCard>
        </Link>
        <Link href="/admin/finanse">
          <GlassCard>
            <p className="text-2xl">◈</p>
            <p className="mt-2 font-bold">Finanse</p>
            <p className="text-sm text-white/50">Przychód, marża, pipeline</p>
          </GlassCard>
        </Link>
        <Link href="/admin/zlecenia">
          <GlassCard>
            <p className="text-2xl">◫</p>
            <p className="mt-2 font-bold">Zlecenia</p>
            <p className="text-sm text-white/50">
              {activeProjects.length} aktywnych
            </p>
          </GlassCard>
        </Link>
        <Link href="/admin/klienci">
          <GlassCard>
            <p className="text-2xl">◎</p>
            <p className="mt-2 font-bold">Klienci CRM</p>
            <p className="text-sm text-white/50">Baza kontaktów</p>
          </GlassCard>
        </Link>
        <Link href="/admin/harmonogram">
          <GlassCard>
            <p className="text-2xl">◷</p>
            <p className="mt-2 font-bold">Harmonogram</p>
            <p className="text-sm text-white/50">Zadania zespołu</p>
          </GlassCard>
        </Link>
        <Link href="/admin/leady">
          <GlassCard>
            <p className="text-2xl">◉</p>
            <p className="mt-2 font-bold">Leady</p>
            <p className="text-sm text-white/50">
              {newLeads.length} nowych · {leads.length} łącznie
            </p>
          </GlassCard>
        </Link>
      </div>

      {projectsError && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Nie udało się wczytać zleceń: {projectsError}
          {projectsError.toLowerCase().includes("projects") ||
          projectsError.toLowerCase().includes("schema") ||
          projectsError.toLowerCase().includes("billing") ? (
            <>
              {" "}
              — uruchom migracje{" "}
              <code className="text-xs">002_intranet_schema.sql</code> i{" "}
              <code className="text-xs">008_agency_os.sql</code> w Supabase.
            </>
          ) : null}
        </div>
      )}

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
