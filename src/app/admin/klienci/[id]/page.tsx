import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { NotesPanel } from "@/components/NotesPanel";
import { ResourceLinksPanel } from "@/components/ResourceLinksPanel";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { getIntranetDb } from "@/lib/intranet-db";
import {
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
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-white/40">Email</dt>
              <dd>{client.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-white/40">Telefon</dt>
              <dd>{client.phone ?? "—"}</dd>
            </div>
            {client.notes && (
              <div>
                <dt className="text-white/40">Notatki ogólne</dt>
                <dd className="whitespace-pre-wrap">{client.notes}</dd>
              </div>
            )}
          </dl>
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
                  </p>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard title="Notatki zespołu">
        <NotesPanel entityId={id} entityType="crm_client" />
      </GlassCard>

      <GlassCard title="Linki i zasoby">
        <ResourceLinksPanel entityId={id} entityType="crm_client" />
      </GlassCard>
    </div>
  );
}
