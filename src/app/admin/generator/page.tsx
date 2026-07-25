"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { OfferLinkResult } from "@/components/OfferLinkResult";
import { InspirationsEditor } from "@/components/InspirationsEditor";
import { OfferContentEditor } from "@/components/OfferContentEditor";
import type { CrmClient, Inspiration } from "@/lib/types";
import type { OfferContent } from "@/lib/offer-content";

function formatApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error.map((item) => JSON.stringify(item)).join(", ");
  }
  return "Błąd generowania";
}

export default function GeneratorPage() {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [pageType, setPageType] = useState<"onepage" | "multipage">("onepage");
  const [deadline, setDeadline] = useState("");
  const [crmClientId, setCrmClientId] = useState("");
  const [createCrm, setCreateCrm] = useState(true);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [customInspirations, setCustomInspirations] = useState<Inspiration[]>(
    [],
  );
  const [offerContent, setOfferContent] = useState<OfferContent | null>(null);
  const [generatingOfferText, setGeneratingOfferText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    offer_url: string;
    company_name: string;
    token: string;
    project_id?: string;
    crm_client_id?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/crm-clients")
      .then((r) => r.json())
      .then((data) => setCrmClients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleGenerateOfferText = async () => {
    if (!companyName.trim()) return;

    setGeneratingOfferText(true);
    setError("");

    const res = await fetch("/api/offer/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        industry,
        page_type: pageType,
        deadline: deadline || undefined,
        inspirations: customInspirations,
        use_gemini: true,
      }),
    });

    const data = await res.json();
    setGeneratingOfferText(false);

    if (!res.ok) {
      setError(formatApiError(data.error));
      return;
    }

    setOfferContent(data.offer_content);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!offerContent) {
      setError("Najpierw zaproponuj tekst oferty (Gemini) i ewentualnie go edytuj.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        industry,
        page_type: pageType,
        deadline: deadline || undefined,
        crm_client_id: crmClientId || undefined,
        create_crm: createCrm && !crmClientId,
        custom_inspirations: customInspirations,
        offer_content: offerContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(formatApiError(data.error));
      setLoading(false);
      return;
    }

    setResult(data);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Generator WWW</h1>
        <p className="mt-1 text-sm text-white/50">
          Gemini proponuje tekst → edytujesz → generujesz link dla klienta
        </p>
      </div>

      <GlassCard title="Nowa oferta dla klienta">
        <form onSubmit={handleGenerate} className="space-y-4">
          <Input
            label="Nazwa firmy"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="np. Anna Rumińska"
            required
          />
          <Input
            label="Branża (opcjonalnie)"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="np. beauty, makijaż"
          />

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Klient CRM</label>
            <select
              value={crmClientId}
              onChange={(e) => setCrmClientId(e.target.value)}
              className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="">— nowy klient (auto) —</option>
              {crmClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
            {!crmClientId && (
              <label className="flex items-center gap-2 text-sm text-white/50">
                <input
                  type="checkbox"
                  checked={createCrm}
                  onChange={(e) => setCreateCrm(e.target.checked)}
                  className="accent-white"
                />
                Utwórz wpis w CRM automatycznie
              </label>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-white/70">Typ strony</label>
            <div className="flex gap-4">
              {(["onepage", "multipage"] as const).map((type) => (
                <label
                  key={type}
                  className={`flex cursor-pointer items-center gap-2 rounded-sm border px-4 py-3 text-sm transition ${
                    pageType === type
                      ? "border-white bg-white/10"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="pageType"
                    value={type}
                    checked={pageType === type}
                    onChange={() => setPageType(type)}
                    className="accent-white"
                  />
                  {type === "onepage" ? "Onepage" : "Multipage"}
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Deadline przesłania materiałów (opcjonalnie)"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <InspirationsEditor
            value={customInspirations}
            onChange={setCustomInspirations}
          />

          <OfferContentEditor
            value={offerContent}
            onChange={setOfferContent}
            onGenerate={handleGenerateOfferText}
            generating={generatingOfferText}
            companyName={companyName}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" disabled={loading || !offerContent}>
            {loading ? "Generowanie..." : "Generuj ofertę"}
          </Button>
        </form>
      </GlassCard>

      {result && (
        <OfferLinkResult
          companyName={result.company_name}
          offerUrl={result.offer_url}
          token={result.token}
          projectId={result.project_id}
          crmClientId={result.crm_client_id}
        />
      )}
    </div>
  );
}
