import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-white/50">Strona nie została znaleziona</p>
        <Link href="/admin">
          <Button variant="secondary">Wróć do panelu</Button>
        </Link>
      </div>
    </PageShell>
  );
}
