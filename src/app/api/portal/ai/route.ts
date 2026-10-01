import { NextResponse } from "next/server";
import { z } from "zod";
import { validatePortalSession } from "@/lib/portal-db";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  geminiGenerateContentUrl,
  isGeminiConfigured,
} from "@/lib/gemini-offer";

const schema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

const STATUS_LABELS: Record<string, string> = {
  nowe: "Nowe zlecenie",
  w_trakcie: "W trakcie realizacji",
  oczekuje: "Oczekuje na materiały",
  zakonczone: "Zakończone",
  anulowane: "Anulowane",
};

const SERVICE_LABELS: Record<string, string> = {
  strona_www: "Strona WWW",
  system_crm: "System CRM",
  automatyzacja_ecommerce: "Automatyzacja / e-commerce",
  grafika: "Grafika",
  montaz_wideo: "Montaż wideo",
  kampania_meta: "Kampania Meta Ads",
  kampania_google: "Kampania Google Ads",
  inne: "Inne",
};

export async function POST(request: Request) {
  // Authenticate portal session
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await validatePortalSession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { message, history = [] } = schema.parse(body);

    // Fetch context: projects, recent messages, files
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const clientId = session.crm_client_id;

    const [projectsRes, messagesRes, filesRes, clientRes] = await Promise.all([
      db
        .from("projects")
        .select("id, title, status, service_type, deadline, assigned_to")
        .eq("crm_client_id", clientId)
        .order("created_at", { ascending: false }),
      db
        .from("portal_messages")
        .select("sender, sender_name, content, created_at")
        .eq("crm_client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10),
      db
        .from("portal_files")
        .select("file_name, size_bytes, created_at, uploaded_by")
        .eq("crm_client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("crm_clients")
        .select("company_name, contact_name, industry, notes")
        .eq("id", clientId)
        .single(),
    ]);

    const client = clientRes.data;
    const projects = projectsRes.data ?? [];
    const messages = (messagesRes.data ?? []).reverse();
    const files = filesRes.data ?? [];

    const now = new Date();
    const fmtDate = (iso: string | null) => {
      if (!iso) return "brak terminu";
      return new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
    };
    const daysLeft = (iso: string | null) => {
      if (!iso) return "";
      const diff = Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000);
      if (diff < 0) return ` (${Math.abs(diff)} dni po terminie!)`;
      if (diff === 0) return " (dziś!)";
      return ` (za ${diff} dni)`;
    };

    const projectsContext = projects.length === 0
      ? "Brak zleceń przypisanych do tego klienta."
      : projects.map((p) => {
          const statusLabel = STATUS_LABELS[p.status] ?? p.status;
          const serviceLabel = SERVICE_LABELS[p.service_type] ?? p.service_type;
          const deadlineStr = p.deadline ? `Termin: ${fmtDate(p.deadline)}${daysLeft(p.deadline)}.` : "Brak terminu.";
          const assignedStr = p.assigned_to ? ` Odpowiada: ${p.assigned_to}.` : "";
          return `• "${p.title}" (${serviceLabel}) — Status: ${statusLabel}. ${deadlineStr}${assignedStr}`;
        }).join("\n");

    const recentMessagesContext = messages.length === 0
      ? "Brak wiadomości."
      : messages.map((m) => {
          const who = m.sender === "admin" ? "Cosgral" : session.requester_name;
          return `[${new Date(m.created_at).toLocaleDateString("pl-PL")}] ${who}: ${m.content}`;
        }).join("\n");

    const filesContext = files.length === 0
      ? "Brak przesłanych plików."
      : `Przesłane pliki (${files.length}): ` + files.slice(0, 5).map((f) => f.file_name).join(", ") + (files.length > 5 ? " i inne." : ".");

    const systemPrompt = `Jesteś asystentem agencji Cosgral do obsługi klienta. Udzielasz konkretnych, rzeczowych odpowiedzi na pytania klienta dotyczące jego zleceń.

ZASADY ABSOLUTNE — łamanie którejkolwiek jest niedopuszczalne:
1. ZAKAZANE: zaczynanie od "Cześć", "Witaj", "Dzień dobry", "Dziękuję za wiadomość", "Rozumiem", "Oczywiście", "Z przyjemnością" lub jakichkolwiek grzecznościowych wstępów.
2. ZAKAZANE: powtarzanie pytania klienta ani parafrazowanie go.
3. WYMAGANE: pierwsza linia odpowiedzi = bezpośrednia odpowiedź merytoryczna. Zaczynaj od faktów lub konkretu.
4. Odpowiadaj po polsku.
5. Maksymalnie 3-4 zdania — krótko i na temat.
6. Jeśli brakuje danych — napisz wprost co wiesz, a resztę skieruj do czatu.

PRZYKŁAD ŹLE: "Cześć Marto! Dziękuję za pytanie. Rozumiem, że interesują Cię statystyki kampanii..."
PRZYKŁAD DOBRZE: "Aktualnie kampania Meta jest w trakcie realizacji, termin raportu to 10 października. Szczegółowe statystyki (zasięg, CTR, ROAS) znajdziesz w pliku który wyślemy przez zakładkę Pliki. Pytania do Twojego opiekuna — napisz przez Czat."

DANE KLIENTA:
Firma: ${client?.company_name ?? "—"}
Kontakt: ${client?.contact_name ?? "—"}
Branża: ${client?.industry ?? "—"}
Notatki: ${client?.notes ?? "brak"}

ZLECENIA KLIENTA:
${projectsContext}

OSTATNIE WIADOMOŚCI Z CZATU (od najstarszej):
${recentMessagesContext}

PRZESŁANE PLIKI:
${filesContext}

DATA DZISIEJSZA: ${now.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.

Gdy klient pyta o statystyki reklam — podaj co wiesz z danych zlecenia i powiedz że szczegółowe dane są w plikach lub czacie.
Gdy klient pyta "kiedy będzie gotowe?" — podaj dokładny termin z danych lub napisz że brak terminu.
Gdy klient pyta "co zostało zrobione?" — opisz status z danych.
Gdy klient pyta "czego ode mnie potrzebujecie?" — sprawdź czy status to "oczekuje" i co wynika z notatek.
Gdy nie masz danych — przyznaj to i powiedz żeby napisał na czacie.`;

    if (!isGeminiConfigured()) {
      // Fallback heuristic response
      const reply = projects.length > 0
        ? `Cześć! Twoje zlecenie "${projects[0].title}" ma status: ${STATUS_LABELS[projects[0].status] ?? projects[0].status}. ${projects[0].deadline ? `Termin: ${fmtDate(projects[0].deadline)}${daysLeft(projects[0].deadline)}.` : ""} Jeśli masz pytania — napisz na czacie, zespół Cosgral odpowie wkrótce.`
        : "Cześć! Nie mam jeszcze żadnych zleceń przypisanych do Twojego konta. Skontaktuj się przez czat z Cosgral.";
      return NextResponse.json({ reply, provider: "heuristic" });
    }

    // Build Gemini conversation
    type GeminiContent = { role: "user" | "model"; parts: [{ text: string }] };
    const contents: GeminiContent[] = [];
    for (const turn of history.slice(-12)) {
      contents.push({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const apiKey = process.env.GEMINI_API_KEY!;
    const response = await fetch(geminiGenerateContentUrl(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 450,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 200)}`);
    }

    type GeminiResp = { candidates?: [{ content?: { parts?: [{ text?: string }] } }] };
    const json = await response.json() as GeminiResp;
    const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "Przepraszam, nie udało się uzyskać odpowiedzi. Skontaktuj się przez czat.";

    return NextResponse.json({ reply, provider: "gemini" });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors }, { status: 400 });
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
