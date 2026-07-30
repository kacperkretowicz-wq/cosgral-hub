"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassCard } from "@/components/ui/GlassCard";
import { OfferLinkResult } from "@/components/OfferLinkResult";
import { OfferDocumentView } from "@/components/OfferDocumentView";
import type { OfferDocument } from "@/lib/offer-document";
import type { CrmClient } from "@/lib/types";

function formatApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error.map((item) => JSON.stringify(item)).join(", ");
  }
  return "Błąd generowania";
}

function GeneratorForm() {
  const searchParams = useSearchParams();
  const [companyName, setCompanyName] = useState(
    searchParams.get("company") ?? "",
  );
  const [industry, setIndustry] = useState("");
  const [pageType, setPageType] = useState<"onepage" | "multipage">("onepage");
  const [deadline, setDeadline] = useState("");
  const [driveFolderUrl, setDriveFolderUrl] = useState("");
  const [crmClientId, setCrmClientId] = useState("");
  const [createCrm, setCreateCrm] = useState(true);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [document, setDocument] = useState<OfferDocument | null>(null);
  const [goalIntro, setGoalIntro] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiProvider, setAiProvider] = useState("none");
  const [loadingBuild, setLoadingBuild] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    offer_url: string;
    company_name: string;
    token: string;
    project_id?: string;
    crm_client_id?: string;
  } | null>(null);

  useEffect(() => {
    const preset = searchParams.get("company");
    if (preset) setCompanyName(preset);
    const crm = searchParams.get("crm");
    if (crm) {
      setCrmClientId(crm);
      setCreateCrm(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/crm-clients", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCrmClients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const applyDocument = (doc: OfferDocument) => {
    setDocument(doc);
    setGoalIntro(doc.goal.intro);
    setRecommendation(doc.visual_direction.recommendation);
  };

  const liveDocument: OfferDocument | null = document
    ? {
        ...document,
        goal: { ...document.goal, intro: goalIntro },
        visual_direction: {
          ...document.visual_direction,
          recommendation,
        },
      }
    : null;

  const handleBuild = async () => {
    if (!companyName.trim()) {
      setError("Podaj nazwę firmy.");
      return;
    }
    setLoadingBuild(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/offer/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        industry,
        page_type: pageType,
        deadline: deadline || undefined,
        drive_folder_url: driveFolderUrl.trim() || undefined,
      }),
    });
    const data = await res.json();
    setLoadingBuild(false);

    if (!res.ok) {
      setError(formatApiError(data.error));
      return;
    }

    applyDocument(data.document as OfferDocument);
    setAiReply(data.reply ?? "");
    setAiProvider(data.ai_provider ?? "none");
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveDocument) {
      setError("Najpierw złóż ofertę Cosgral (przycisk poniżej danych).");
      return;
    }

    setLoadingSave(true);
    setError("");

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
        drive_folder_url: driveFolderUrl.trim() || undefined,
        offer_document: liveDocument,
        offer_ready: true,
      }),
    });

    const data = await res.json();
    setLoadingSave(false);

    if (!res.ok) {
      setError(formatApiError(data.error));
      return;
    }

    setResult(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Generator WWW</h1>
        <p className="mt-1 text-sm text-white/50">
          Oferta Cosgral — układ z szablonu ($0). AI opcjonalne (Groq /
          OpenRouter free). Działa dla dowolnego klienta.
        </p>
      </div>

      <GlassCard title="Dane klienta">
        <form onSubmit={handlePublish} className="space-y-4">
          <Input
            label="Nazwa firmy"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="np. nazwa firmy klienta"
            required
          />
          <Input
            label="Branża (opcjonalnie)"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="np. eventy B2B, beauty, SaaS"
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
            label="Deadline materiałów (opcjonalnie)"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <div className="space-y-3 rounded-sm border border-white/15 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white/90">
              Folder Google Drive na materiały
            </p>
            <p className="text-xs text-white/45">
              Przygotuj folder ręcznie i wklej link — aplikacja nie tworzy
              folderów automatycznie.
            </p>
            <Input
              label="Link do folderu Drive"
              value={driveFolderUrl}
              onChange={(e) => setDriveFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/…"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={loadingBuild || !companyName.trim()}
              onClick={handleBuild}
            >
              {loadingBuild ? "Składanie…" : "Złóż ofertę Cosgral"}
            </Button>
            <Button type="submit" disabled={loadingSave || !liveDocument}>
              {loadingSave ? "Publikowanie…" : "Opublikuj link dla klienta"}
            </Button>
          </div>

          {aiReply && (
            <p className="text-sm text-white/60">
              {aiReply}
              {aiProvider !== "none" ? ` · AI: ${aiProvider}` : " · bez AI"}
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </GlassCard>

      {liveDocument && (
        <>
          <GlassCard title="Edycja kluczowych treści (pełna kontrola)">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm text-white/70">
                  Wstęp (cel projektu)
                </label>
                <textarea
                  value={goalIntro}
                  onChange={(e) => setGoalIntro(e.target.value)}
                  rows={5}
                  className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-white/70">
                  Rekomendacja kierunku wizualnego
                </label>
                <textarea
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  rows={4}
                  className="w-full rounded-sm border border-white/20 bg-white/5 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </GlassCard>

          <div className="overflow-hidden rounded-lg border border-white/10">
            <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/40">
              Podgląd oferty Cosgral
            </div>
            <div className="bg-[#f7f5f1]">
              <OfferDocumentView document={liveDocument} variant="print" />
            </div>
          </div>
        </>
      )}

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

export default function GeneratorPage() {
  return (
    <Suspense fallback={<p className="text-white/50">Ładowanie…</p>}>
      <GeneratorForm />
    </Suspense>
  );
}
