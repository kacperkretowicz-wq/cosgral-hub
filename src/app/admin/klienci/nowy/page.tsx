"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/CrmUi";

function NowyKlientForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companyName, setCompanyName] = useState(
    searchParams.get("company") ?? "",
  );
  const [contactName, setContactName] = useState(
    searchParams.get("contact") ?? "",
  );
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [industry, setIndustry] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/crm-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        contact_name: contactName,
        email,
        phone,
        industry,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Błąd tworzenia",
      );
      setLoading(false);
      return;
    }

    router.push(`/admin/klienci/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader eyebrow="Klient" title="Nowy klient" />
      <Link
        href="/admin/klienci"
        className="inline-block text-sm text-white/45 hover:text-white"
      >
        ← Anuluj
      </Link>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nazwa firmy"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <Input
          label="Osoba kontaktowa"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Telefon"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label="Branża"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        />
        <Input
          label="Tagi"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="np. hot, retainer"
        />
        <div className="space-y-2">
          <label className="block text-sm text-white/70">Notatki</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none focus:border-white/35"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Zapisywanie..." : "Utwórz klienta"}
        </Button>
      </form>
    </div>
  );
}

export default function NowyKlientPage() {
  return (
    <Suspense fallback={<p className="text-white/50">Ładowanie…</p>}>
      <NowyKlientForm />
    </Suspense>
  );
}
