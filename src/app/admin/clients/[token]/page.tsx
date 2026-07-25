import Link from "next/link";
import { notFound } from "next/navigation";
import { OfferMessage } from "@/components/OfferMessage";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { InspirationsManager } from "@/components/InspirationsManager";
import { getDb } from "@/lib/db/client";
import { MATERIAL_SECTIONS } from "@/lib/offer-templates";
import { getStoredFileUrl } from "@/lib/file-url";
import { getOfferUrl } from "@/lib/app-url";
import { getDriveFolderUrl } from "@/lib/google-drive";
import { getGoogleDocUrl } from "@/lib/google-docs";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";
import { OfferTextManager } from "@/components/OfferTextManager";
import type { Client, Submission, UploadedFile } from "@/lib/types";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { token } = await params;
  const db = getDb();

  const client = await db.getClientByToken(token);
  if (!client) notFound();

  const submissions: Submission[] = await db.getSubmissions(client.id);
  const files: UploadedFile[] = await db.getFiles(client.id);

  const typedClient = client as Client;
  const offerUrl = getOfferUrl(token);

  const submissionsBySection = submissions.reduce(
    (acc, s) => {
      if (!acc[s.section_key]) acc[s.section_key] = [];
      acc[s.section_key].push(s);
      return acc;
    },
    {} as Record<string, Submission[]>,
  );

  const filesBySection = files.reduce(
    (acc, f) => {
      if (!acc[f.section_key]) acc[f.section_key] = [];
      acc[f.section_key].push(f);
      return acc;
    },
    {} as Record<string, UploadedFile[]>,
  );

  const fileUrls = new Map<string, string | null>();
  await Promise.all(
    files.map(async (f) => {
      fileUrls.set(f.id, await getStoredFileUrl(f.drive_file_id));
    }),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm text-white/50 hover:text-white"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold">
              {typedClient.company_name}
            </h1>
            <p className="text-sm text-white/50">
              Status: {typedClient.status} ·{" "}
              {typedClient.page_type === "onepage" ? "Onepage" : "Multipage"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/o/${token}`} target="_blank">
              <Button variant="secondary">Podgląd oferty</Button>
            </Link>
            <Link href={`/o/${token}/materialy`} target="_blank">
              <Button variant="secondary">Formularz materiałów</Button>
            </Link>
            {typedClient.drive_folder_id && (
              <a
                href={getDriveFolderUrl(typedClient.drive_folder_id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost">Google Drive ↗</Button>
              </a>
            )}
            {typedClient.drive_doc_id && (
              <a
                href={getGoogleDocUrl(typedClient.drive_doc_id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost">Google Doc ↗</Button>
              </a>
            )}
            <DeleteRecordButton
              apiUrl={`/api/clients/${typedClient.id}`}
              redirectTo="/admin"
              label="Usuń ofertę"
              confirmMessage={`Usunąć ofertę i formularz „${typedClient.company_name}”? Materiały w Google Drive pozostaną na dysku.`}
            />
          </div>
        </div>

        <InspirationsManager
          clientId={typedClient.id}
          initialInspirations={typedClient.inspirations ?? []}
        />

        <OfferTextManager
          clientId={typedClient.id}
          companyName={typedClient.company_name}
          industry={typedClient.industry}
          pageType={typedClient.page_type}
          deadline={typedClient.deadline}
          initialOfferText={typedClient.offer_text}
        />

        <GlassCard title="Link do oferty dla klienta">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-white/50">Wyślij klientowi: </span>
              <code className="text-white/80 break-all">{offerUrl}</code>
            </p>
            <p className="text-xs text-white/40">
              Klient zobaczy ofertę i na dole przycisk „Prześlij materiały”.
            </p>
          </div>
        </GlassCard>

        <GlassCard title="Przesłane materiały">
          {!submissions.length && !files.length ? (
            <p className="text-white/50">
              Klient jeszcze nie przesłał materiałów.
            </p>
          ) : (
            <div className="space-y-6">
              {MATERIAL_SECTIONS.map((section) => {
                const sectionSubs = submissionsBySection[section.key] ?? [];
                const sectionFiles = filesBySection[section.key] ?? [];
                if (!sectionSubs.length && !sectionFiles.length) return null;

                return (
                  <div
                    key={section.key}
                    className="border-t border-white/10 pt-4 space-y-3"
                  >
                    <h3 className="font-bold">{section.title}</h3>
                    {sectionSubs.map((sub: Submission) => {
                      const field = section.fields.find(
                        (f) => f.key === sub.field_key,
                      );
                      return (
                        <div key={sub.id} className="space-y-1">
                          <p className="text-xs text-white/40">
                            {field?.label ?? sub.field_key}
                          </p>
                          <p className="text-sm whitespace-pre-line text-white/80">
                            {sub.text_content || "—"}
                          </p>
                        </div>
                      );
                    })}
                    {sectionFiles.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {sectionFiles.map((f) => {
                          const href = fileUrls.get(f.id);
                          return (
                          <li key={f.id}>
                            {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/70 underline hover:text-white"
                            >
                              📎 {f.file_name}
                            </a>
                            ) : (
                              <span className="text-white/70">📎 {f.file_name}</span>
                            )}
                          </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard title="Podgląd oferty">
          <OfferMessage
            data={{
              companyName: typedClient.company_name,
              pageType: typedClient.page_type,
              deadline: typedClient.deadline ?? "",
              industry: typedClient.industry ?? undefined,
              inspirations: typedClient.inspirations ?? [],
            }}
            offerText={typedClient.offer_text}
            offerContent={typedClient.offer_content}
            showMaterialsLink={false}
          />
        </GlassCard>
    </div>
  );
}
