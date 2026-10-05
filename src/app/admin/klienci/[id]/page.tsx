import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageHeader, StatusPill } from "@/components/ui/CrmUi";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { CrmClientEditor } from "@/components/CrmClientEditor";
import { getIntranetDb } from "@/lib/intranet-db";
import {
  BILLING_STATUS_LABELS,
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
        <Link href="/admin/klienci" className="text-sm text-white/50 hover:text-white">
          ← Klienci
        </Link>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      </div>
    );
  }

  if (!client) notFound();

  let projects: Awaited<
    ReturnType<ReturnType<typeof getIntranetDb>["getProjects"]>
  > = [];
  try {
    projects = await getIntranetDb().getProjects({ crm_client_id: id });
  } catch {
    projects = [];
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Klient"
        title={client.company_name}
        description={[
          client.contact_name,
          client.industry,
          client.email,
          client.phone,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <Link href={`/admin/materialy/${id}`}>
              <Button variant="secondary">Katalog materiałów</Button>
            </Link>
            <Link href={`/admin/zlecenia/nowe?crm_client_id=${id}`}>
              <Button>+ Zlecenie</Button>
            </Link>
            <DeleteRecordButton
              apiUrl={`/api/crm-clients/${id}`}
              redirectTo="/admin/klienci"
              label="Usuń"
              confirmTitle="Usuń klienta"
              confirmMessage={`Usunąć klienta „${client.company_name}”? Powiązane zlecenia też zostaną usunięte.`}
            />
          </>
        }
      />

      <Link
        href="/admin/klienci"
        className="inline-block text-sm text-white/45 hover:text-white"
      >
        ← Wróć do listy
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <p className="label-mono mb-3">Kontakt</p>
          <CrmClientEditor client={client} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="label-mono">Zlecenia</p>
            <Link
              href={`/admin/zlecenia/nowe?crm_client_id=${id}`}
              className="text-xs text-white/50 underline hover:text-white"
            >
              Dodaj
            </Link>
          </div>
          {!projects.length ? (
            <p className="text-sm text-white/40">Brak zleceń dla tego klienta.</p>
          ) : (
            <ul className="surface-list divide-y divide-white/8">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/zlecenia/${p.id}`}
                    className="block py-3 transition hover:bg-white/[0.03]"
                  >
                    <p className="font-medium text-white">{p.title}</p>
                    <p className="mt-1 text-sm text-white/45">
                      {SERVICE_TYPE_LABELS[p.service_type]} ·{" "}
                      {PROJECT_STATUS_LABELS[p.status]}
                      {p.value_pln != null
                        ? ` · ${p.value_pln.toLocaleString("pl-PL")} zł`
                        : ""}
                    </p>
                    <div className="mt-2">
                      <StatusPill>
                        {BILLING_STATUS_LABELS[p.billing_status ?? "w_toku"]}
                      </StatusPill>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
