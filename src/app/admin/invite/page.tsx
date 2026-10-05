import { Suspense } from "react";
import InviteAcceptPage from "./InviteAcceptClient";

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/50">
          Ładowanie…
        </div>
      }
    >
      <InviteAcceptPage />
    </Suspense>
  );
}
