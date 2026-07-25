import Link from "next/link";
import { notFound } from "next/navigation";
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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KlientDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await getIntranetDb().getCrmClient(id);
  if (!client) notFound();

  const projects = (await getIntranetDb().getProjects()).filter(
    (p) => p.crm_client_id === id,
  );

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
        <DeleteRecordButton
          apiUrl={`/api/crm-clients/${id}`}
          redirectTo="/admin/klienci"
          label="Usuń klienta"
          confirmMessage={`Usunąć klienta CRM „${client.company_name}”? Powiązane notatki i linki zostaną usunięte.`}
        />
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
          {!projects.length ? (
            <p className="text-sm text-white/40">Brak przypisanych zleceń.</p>
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
