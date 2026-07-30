import { Suspense } from "react";
import NoweZlecenieForm from "./NoweZlecenieForm";

export default function NoweZleceniePage() {
  return (
    <Suspense fallback={<p className="text-white/50">Ładowanie…</p>}>
      <NoweZlecenieForm />
    </Suspense>
  );
}
