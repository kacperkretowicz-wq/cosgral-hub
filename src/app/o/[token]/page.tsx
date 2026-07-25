import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { OfferMessage } from "@/components/OfferMessage";
import { getDb } from "@/lib/db/client";
import type { Client } from "@/lib/types";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OfferPage({ params }: Props) {
  const { token } = await params;
  const db = getDb();
  const client = await db.getClientByToken(token);

  if (!client) notFound();

  const typedClient = client as Client;

  return (
    <PageShell logoHref={`/o/${token}`} logoSize="lg">
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
    </PageShell>
  );
}
