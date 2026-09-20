"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteChatWorkspace } from "@/components/SiteChatWorkspace";
import { PageHeader } from "@/components/ui/CrmUi";

function AdminCzatInner() {
  const searchParams = useSearchParams();
  return (
    <div>
      <PageHeader
        eyebrow="Chat"
        title="Czat strony"
        description="Wiadomości z cosgral.pl. Mobile: swipe w lewo jak Gmail. Desktop: Usuń. Alert przy nowej wiadomości."
      />
      <SiteChatWorkspace initialThread={searchParams.get("thread") || ""} />
    </div>
  );
}

export default function AdminCzatPage() {
  return (
    <Suspense fallback={<p className="p-6 text-white/50">Ładowanie czatu…</p>}>
      <AdminCzatInner />
    </Suspense>
  );
}
