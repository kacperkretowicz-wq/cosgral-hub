"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { CrmClient } from "@/lib/types";

interface Props {
  client: CrmClient;
}

export function CrmClientEditor({ client }: Props) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(client.company_name);
  const [contactName, setContactName] = useState(client.contact_name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [industry, setIndustry] = useState(client.industry ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/crm-clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        contact_name: contactName || null,
        email: email || null,
        phone: phone || null,
        industry: industry || null,
        notes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(
        typeof data.error === "string" ? data.error : "Błąd zapisu",
      );
      return;
    }
    setMessage("Zapisano.");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        required
        placeholder="Firma"
        className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
      />
      <input
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        placeholder="Osoba kontaktowa"
        className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
        className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Telefon"
        className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
      />
      <input
        value={industry}
        onChange={(e) => setIndustry(e.target.value)}
        placeholder="Branża"
        className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder="Notatki ogólne"
        className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
      />
      {message && (
        <p
          className={`text-xs ${
            message === "Zapisano." ? "text-green-300" : "text-red-300"
          }`}
        >
          {message}
        </p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? "Zapisywanie…" : "Zapisz kontakt"}
      </Button>
    </form>
  );
}
