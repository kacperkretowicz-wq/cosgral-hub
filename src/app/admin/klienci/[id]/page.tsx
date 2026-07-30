import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { NotesPanel } from "@/components/NotesPanel";
import { ResourceLinksPanel } from "@/components/ResourceLinksPanel";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { CrmClientEditor } from "@/components/CrmClientEditor";
import { getIntranetDb } from "@/lib/intranet-db";
import { getDb } from "@/lib/db/client";
import {
  BILLING_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/lib/intranet-labels";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KlientDetailPage({ params }: Props) {
  const { id } = await params;

  let client = null;
  let loadError = "";
  try {
    client = await getIntranetDb().getCrmClient(id);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Błąd ładowania klienta";
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/klienci"
          className="text-sm text-white/50 hover:text-white"
        >
          ← Klienci
        </Link>
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      </div>
    );
  }

  if (!client) notFound();

  let projects: Awaited<
    ReturnType<ReturnType<typeof getIntranetDb>["getProjects"]>
  > = [];
  let projectsError = "";
  try {
    projects = await getIntranetDb().getProjects({ crm_client_id: id });
  } catch (e) {
    projectsError = e instanceof Error ? e.message : "Błąd ładowania zleceń";
  }

  const offerTokens = projects
    .map((p) => p.website_client_id)
    .filter(Boolean) as string[];

  const offers: { id: string; token: string; company_name: string; status: string }[] =
    [];
  if (offerTokens.length) {
    try {
      const db = getDb();
      for (const websiteId of offerTokens) {
        const offer = await db.getClientById(websiteId);
        if (offer) {
          offers.push({
            id: offer.id,
            token: offer.token,
            company_name: offer.company_name,
            status: offer.status,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  const pipeline = projects
    .filter((p) => p.value_pln != null)
    .reduce((s, p) => s + (p.value_pln ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/klienci"
            className="text-sm text-white/50 hover:text-white"
          >
            ← Klienci
          </Link>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            {client.company_name}
          </h1>
          <p className="text-sm text-white/50">
            {client.contact_name ?? "Brak osoby kontaktowej"}
            {client.industry ? ` · ${client.industry}` : ""}
            {pipeline > 0
              ? ` · pipeline ${pipeline.toLocaleString("pl-PL")} zł`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/generator?company=${encodeURIComponent(client.company_name)}&crm=${id}`}
          >
            <Button variant="secondary">Oferta Cosgral</Button>
          </Link>
          <Link href={`/admin/zlecenia/nowe?crm_client_id=${id}`}>
            <Button>+ Nowe zlecenie</Button>
          </Link>
          <DeleteRecordButton
            apiUrl={`/api/crm-clients/${id}`}
            redirectTo="/admin/klienci"
            label="Usuń klienta"
            confirmMessage={`Usunąć klienta CRM „${client.company_name}”? Powiązane zlecenia, oferty WWW, notatki i linki też zostaną usunięte.`}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard title="Kontakt">
          <CrmClientEditor client={client} />
        </GlassCard>

        <GlassCard title="Zlecenia">
          {projectsError ? (
            <p className="text-sm text-red-300">{projectsError}</p>
          ) : !projects.length ? (
            <div className="space-y-3">
              <p className="text-sm text-white/40">Brak przypisanych zleceń.</p>
              <Link href={`/admin/zlecenia/nowe?crm_client_id=${id}`}>
                <Button variant="secondary">Utwórz pierwsze zlecenie</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/zlecenia/${p.id}`}
                  className="block rounded-sm bg-white/5 p-3 text-sm hover:bg-white/10"
                >
                  <p className="font-medium">{p.title}</p>
                  <p className="text-white/40">
                    {SERVICE_TYPE_LABELS[p.service_type]} ·{" "}
                    <span className={PROJECT_STATUS_COLORS[p.status]}>
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                    {p.value_pln != null
                      ? ` · ${p.value_pln.toLocaleString("pl-PL")} zł`
                      : ""}
                    {` · ${BILLING_STATUS_LABELS[p.billing_status ?? "wycena"]}`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard title="Oferty WWW">
        {!offers.length ? (
          <p className="text-sm text-white/40">
            Brak powiązanych ofert.{" "}
            <Link
              href={`/admin/generator?company=${encodeURIComponent(client.company_name)}&crm=${id}`}
              className="underline"
            >
              Złóż ofertę Cosgral
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {offers.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-white/5 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{o.company_name}</p>
                  <p className="text-white/40">status: {o.status}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/clients/${o.token}`}>
                    <Button variant="secondary" className="px-3 py-1 text-xs">
                      Edytuj
                    </Button>
                  </Link>
                  <Link href={`/o/${o.token}`} target="_blank">
                    <Button variant="ghost" className="px-3 py-1 text-xs">
                      Publiczna ↗
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard title="Notatki zespołu">
        <NotesPanel entityId={id} entityType="crm_client" />
      </GlassCard>

      <GlassCard title="Linki i zasoby">
        <ResourceLinksPanel entityId={id} entityType="crm_client" />
      </GlassCard>
    </div>
  );
}
