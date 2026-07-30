import { notFound } from "next/navigation";
import { OfferDocumentView } from "@/components/OfferDocumentView";
import { OfferMessage } from "@/components/OfferMessage";
import { getDb } from "@/lib/db/client";
import { getDriveFolderUrl } from "@/lib/google-drive";
import {
  buildOfferDocument,
  parseOfferDocument,
} from "@/lib/offer-document";
import type { Client } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OfferPage({ params }: Props) {
  const { token } = await params;
  const db = getDb();
  const client = await db.getClientByToken(token);

  if (!client) notFound();

  const typedClient = client as Client;
  const driveUrl = typedClient.drive_folder_id
    ? getDriveFolderUrl(typedClient.drive_folder_id)
    : null;

  const document =
    parseOfferDocument(typedClient.offer_document) ??
    buildOfferDocument({
      companyName: typedClient.company_name,
      industry: typedClient.industry,
      pageType: typedClient.page_type,
      deadline: typedClient.deadline,
      driveFolderUrl: driveUrl,
    });

  const hasStructured = Boolean(parseOfferDocument(typedClient.offer_document));

  if (hasStructured || !typedClient.offer_text) {
    return (
      <div className="offer-print-root min-h-screen bg-[#f7f5f1] text-neutral-900">
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
          <OfferDocumentView
            document={document}
            variant="print"
            materialsHref={`/o/${token}/materialy`}
            showPrintButton
          />
        </div>
      </div>
    );
  }

  // Legacy flat-text offers
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="glass rounded-lg p-6 md:p-10">
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
            showMaterialsLink
            token={token}
          />
        </div>
      </div>
    </div>
  );
}
