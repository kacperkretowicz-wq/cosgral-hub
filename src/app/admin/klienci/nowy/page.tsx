"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";

export default function NowyKlientPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
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
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Błąd tworzenia");
      setLoading(false);
      return;
    }

    router.push(`/admin/klienci/${data.id}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/klienci"
          className="text-sm text-white/50 hover:text-white"
        >
          ← Klienci
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Nowy klient CRM</h1>
      </div>

      <GlassCard>
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
          <div className="space-y-2">
            <label className="block text-sm text-white/70">Notatki</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Zapisywanie..." : "Utwórz klienta"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
