"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteChatWorkspace } from "@/components/SiteChatWorkspace";

function AgentCzatInner() {
  const searchParams = useSearchParams();
  return (
    <SiteChatWorkspace
      initialThread={searchParams.get("thread") || ""}
      requirePin
    />
  );
}

export default function AgentCzatPage() {
  return (
    <div className="min-h-screen bg-black">
      <Suspense fallback={<p className="p-6 text-white/50">Ładowanie…</p>}>
        <AgentCzatInner />
      </Suspense>
    </div>
  );
}
