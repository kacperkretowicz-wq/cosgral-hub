import { z } from "zod";
import { formatDeadline, type OfferData } from "./offer-templates";
import {
  selectPatternsForIndustry,
  type VisualPattern,
} from "./visual-patterns";

export const offerDocumentSchema = z.object({
  version: z.literal(1),
  cover: z.object({
    client_name: z.string(),
    eyebrow: z.string(),
    title: z.string(),
    subtitle: z.string(),
    prepared_for: z.string(),
  }),
  toc: z.array(
    z.object({
      number: z.string(),
      title: z.string(),
      pages: z.string(),
    }),
  ),
  goal: z.object({
    heading: z.string(),
    intro: z.string(),
    process: z.array(
      z.object({
        number: z.string(),
        title: z.string(),
        body: z.string(),
      }),
    ),
    why_now_heading: z.string(),
    why_now: z.array(z.string()),
    materials_deadline_note: z.string(),
    drive_url: z.string().nullable(),
  }),
  materials_intro: z.object({
    part_label: z.string(),
    heading: z.string(),
    body: z.string(),
  }),
  material_sections: z.array(
    z.object({
      number: z.string(),
      title: z.string(),
      items: z.array(z.string()),
      note: z.string().optional(),
    }),
  ),
  portfolio: z.object({
    heading: z.string(),
    intro: z.string(),
    top: z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
    list: z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
    social_proof: z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
  }),
  contact_branding: z.object({
    heading: z.string(),
    contact: z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
    branding: z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
    access: z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
    note: z.string(),
  }),
  visual_direction: z.object({
    part_label: z.string(),
    heading: z.string(),
    intro: z.string(),
    patterns: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        why: z.string(),
        layout: z.string(),
        effect: z.string(),
      }),
    ),
    recommendation: z.string(),
  }),
  summary: z.object({
    heading: z.string(),
    checklist: z.array(z.string()),
    next_step: z.string(),
    drive_url: z.string().nullable(),
    contact_email: z.string(),
    contact_site: z.string(),
  }),
});

export type OfferDocument = z.infer<typeof offerDocumentSchema>;

export interface BuildOfferDocumentInput {
  companyName: string;
  industry?: string | null;
  pageType: "onepage" | "multipage";
  deadline?: string | null;
  driveFolderUrl?: string | null;
  patterns?: VisualPattern[];
}

function driveNote(url: string | null, deadlineLabel: string): string {
  if (url) {
    return `Prosimy o przesłanie całości w formie folderu do dnia ${deadlineLabel}. Materiały mogą spływać partiami — nie trzeba czekać na komplet.\n${url}`;
  }
  return `Prosimy o przesłanie materiałów (Google Drive / WeTransfer) do dnia ${deadlineLabel}. Materiały mogą spływać partiami — nie trzeba czekać na komplet. Link do folderu przekażemy osobno lub wklej go w generatorze.`;
}

/**
 * Deterministic Juicy-style offer builder — works with $0 AI.
 * Layout intelligence lives here: section order, copy structure, pattern picks.
 */
export function buildOfferDocument(
  input: BuildOfferDocumentInput,
): OfferDocument {
  const company = input.companyName.trim();
  const deadlineLabel = input.deadline
    ? formatDeadline(input.deadline)
    : "ustalonego wspólnie terminu";
  const driveUrl = input.driveFolderUrl?.trim() || null;
  const multipage =
    input.pageType === "multipage"
      ? " (w tym osobne podstrony — treści osobno, jeśli dotyczy)"
      : "";
  const patterns = input.patterns ?? selectPatternsForIndustry(input.industry);

  const energyIds = new Set(["juice", "sweetpunk"]);
  const structureIds = new Set(["leveled", "podium", "nitex"]);
  const energy = patterns.filter((p) => energyIds.has(p.id)).map((p) => p.name);
  const structure = patterns
    .filter((p) => structureIds.has(p.id))
    .map((p) => p.name);

  const recommendation = `Każdy z tych serwisów stawia na duży kadr, mało tekstu i mocny dowód zamiast deklaracji.
Dla ${company} proponujemy połączenie energii${energy.length ? ` (${energy.join(" i ")})` : ""} z poukładaną strukturą case studies${structure.length ? ` (${structure.join(" i ")})` : ""}.
Kierunek wybieramy wspólnie po przesłaniu pierwszych materiałów.`;

  return {
    version: 1,
    cover: {
      client_name: company,
      eyebrow: "OFERTA · COSGRAL.AGENCY",
      title: "OFERTA",
      subtitle: `Nowa strona internetowa dla ${company} — zakres materiałów, struktura serwisu i kierunek wizualny.`,
      prepared_for: `Przygotowana dla ${company}`,
    },
    toc: [
      { number: "01", title: "Cel projektu i proces", pages: "str. 3" },
      { number: "02", title: "Materiały — sekcje strony", pages: "str. 4–5" },
      { number: "03", title: "Portfolio i realizacje", pages: "str. 6" },
      { number: "04", title: "Kontakt, branding, dostępy", pages: "str. 7" },
      { number: "05", title: "Kierunek wizualny — wzory", pages: "str. 8–10" },
      { number: "06", title: "Checklista i kolejny krok", pages: "str. 11" },
    ],
    goal: {
      heading: "Serwis, który sprzedaje doświadczenie",
      intro: `Cieszymy się na współpracę przy nowej stronie dla ${company}. Chcemy, żeby serwis w pełni oddał charakter marki, przyciągał idealnych klientów i budował zaufanie od pierwszego wejrzenia.
Abyśmy mogli sprawnie przejść do projektowania i wdrożenia, przygotowaliśmy zestawienie materiałów oraz informacji, których od Was potrzebujemy — w podziale na poszczególne sekcje planowanej strony${multipage}.`,
      process: [
        {
          number: "01",
          title: "Materiały",
          body: "Zbieramy treści, zdjęcia, wideo i identyfikację wizualną według listy z kolejnych stron.",
        },
        {
          number: "02",
          title: "Projekt",
          body: "Układ sekcji i warstwa wizualna oparte o uzgodniony kierunek i realne materiały.",
        },
        {
          number: "03",
          title: "Wdrożenie",
          body: "Kodowanie, podpięcie domeny i hostingu, testy oraz publikacja serwisu.",
        },
      ],
      why_now_heading: "Trzy powody, dla których start od materiałów się opłaca",
      why_now: [
        "Brak przestojów. Komplet materiałów na starcie oznacza, że projekt nie zatrzymuje się w połowie na oczekiwaniu na zdjęcia czy logotypy.",
        "Projekt na realnych treściach. Układ tworzony na Waszych zdjęciach i liczbach wygląda inaczej niż na wypełniaczu — i lepiej sprzedaje.",
        "Jeden punkt prawdy. Wszystko ląduje w jednym folderze, do którego obie strony mają dostęp.",
      ],
      materials_deadline_note: driveNote(driveUrl, deadlineLabel),
      drive_url: driveUrl,
    },
    materials_intro: {
      part_label: "CZĘŚĆ PIERWSZA",
      heading: "Materiały i treści",
      body: "Poniżej rozpisaliśmy wszystko, czego potrzebujemy od Was — sekcja po sekcji, dokładnie w kolejności, w jakiej użytkownik będzie przewijał stronę.",
    },
    material_sections: [
      {
        number: "01",
        title: "Sekcja główna (Hero — góra strony)",
        items: [
          `Hasło główne (headline): krótkie, mocne zdanie mówiące o tym, czym jest ${company} i co Was wyróżnia.`,
          "Podtytuł: 1–2 zdania doprecyzowujące Wasz profil działania.",
          "Materiały wideo / foto: krótka rolka w tle pokazująca kulisy i klimat działalności lub 1–2 wysokiej jakości zdjęcia wizerunkowe (poziome).",
        ],
      },
      {
        number: "02",
        title: "O nas / o marce",
        items: [
          `Tekst o ${company}: kim jesteście, jak pracujecie i dlaczego warto wybrać właśnie Was.`,
          "Kluczowe liczby do statystyk: liczba zrealizowanych projektów, lata na rynku, liczba klientów lub znanych marek.",
          "Zdjęcia zespołu / liderów: profesjonalne portrety lub ujęcia w trakcie pracy.",
        ],
      },
      {
        number: "03",
        title: "Oferta (usługi)",
        items: [
          "Lista głównych obszarów działalności: podział na kategorie usług.",
          `Krótki opis do każdej usługi${multipage}: 2–4 zdania o tym, co wchodzi w skład i jaki problem klienta rozwiązujecie.`,
        ],
        note: "NIE MUSICIE PISAĆ GOTOWYCH TEKSTÓW — wystarczą punkty w formie notatek. Redakcję bierzemy na siebie.",
      },
    ],
    portfolio: {
      heading: "Portfolio i realizacje",
      intro:
        "W tej branży klienci kupują oczami. Dlatego dzielimy tę sekcję na dwa poziomy: kilka projektów flagowych oraz szybki dowód skali działania.",
      top: {
        title: "TOP case studies — 3 do 5 głównych projektów",
        items: [
          "Opis projektu: cel, wyzwanie, efekt.",
          "Galeria zdjęć i wideo w najlepszej dostępnej jakości.",
          "Logotyp klienta oraz — jeśli są dostępne — referencje.",
        ],
      },
      list: {
        title: "Pełna lista realizacji — szybki dowód skali",
        items: [
          "Krótka lista 10–20 pozostałych projektów: nazwa i typ.",
          "Po 2–4 reprezentatywne zdjęcia z każdego z tych projektów.",
        ],
      },
      social_proof: {
        title: "Logotypy i opinie — dowód społeczny",
        items: [
          "Logotypy klientów: .SVG lub .PNG na przezroczystym tle.",
          "Cytaty i opinie: 2–4 krótkie wypowiedzi z imieniem, nazwiskiem, stanowiskiem i nazwą firmy.",
        ],
      },
    },
    contact_branding: {
      heading: "Kontakt, identyfikacja i dostępy techniczne",
      contact: {
        title: "Kontakt i stopka",
        items: [
          "Dane firmowe: pełna nazwa, NIP, adres rejestrowy oraz adres biura.",
          "Dane do kontaktu: e-mail i telefon — wraz z informacją, do kogo mają trafiać zapytania.",
          "Social media: linki do profilów (Instagram, LinkedIn, Facebook i pozostałe).",
        ],
      },
      branding: {
        title: "Identyfikacja wizualna",
        items: [
          "Logo: wersja podstawowa, alternatywna oraz sygnet — .SVG, .EPS lub wysokiej jakości .PNG.",
          "Księga znaku, paleta kolorów, fonty: jeśli posiadacie — .PDF lub kody HEX.",
        ],
      },
      access: {
        title: "Dostępy",
        items: [
          "Domena i hosting: informacja, gdzie macie zarejestrowaną domenę oraz wykupiony hosting, jeśli strona ma stanąć w tym samym miejscu.",
        ],
      },
      note: "Jeśli coś wymaga omówienia — dajcie znać. Chętnie się zdzwonimy i przejdziemy przez listę punkt po punkcie.",
    },
    visual_direction: {
      part_label: "CZĘŚĆ DRUGA",
      heading: "Kierunek wizualny",
      intro:
        "Strony, które warto mieć przed oczami. Nie chodzi o kopiowanie — każdy przykład pokazuje inny sposób rozwiązania tego samego problemu: jak sprzedać doświadczenie, którego nie da się dotknąć.",
      patterns: patterns.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        why: p.why,
        layout: p.layout,
        effect: p.effect,
      })),
      recommendation,
    },
    summary: {
      heading: "Checklista i kolejny krok",
      checklist: [
        "Hero: hasło główne, podtytuł, wideo w tle lub 1–2 zdjęcia poziome.",
        "O nas: tekst o marce, kluczowe liczby, zdjęcia zespołu.",
        "Oferta: lista obszarów działalności i krótki opis do każdej usługi.",
        "Portfolio: 3–5 case studies z opisem i galerią oraz 10–20 realizacji po 2–4 zdjęcia.",
        "Dowód społeczny: logotypy klientów (.SVG / .PNG) i 2–4 opinie z podpisem.",
        "Kontakt: dane firmowe, e-mail, telefon, linki do social mediów.",
        "Branding: logo w wersjach, księga znaku, kolory HEX, fonty.",
        "Dostępy: informacja o domenie i hostingu.",
      ],
      next_step: driveUrl
        ? `Wrzućcie materiały do wskazanego folderu — nawet partiami. Po otrzymaniu pierwszej części wracamy do Was z propozycją układu strony i kierunku wizualnego wybranego spośród przedstawionych wzorów.`
        : `Wrzućcie materiały do wspólnego folderu (link ustalamy przy starcie) — nawet partiami. Po otrzymaniu pierwszej części wracamy z propozycją układu i kierunku wizualnego.`,
      drive_url: driveUrl,
      contact_email: "kontakt@cosgral.pl",
      contact_site: "cosgral.agency",
    },
  };
}

export function offerDocumentToPlainText(doc: OfferDocument): string {
  const lines: string[] = [];
  lines.push(`${doc.cover.eyebrow}`);
  lines.push(`COSGRAL × ${doc.cover.client_name}`);
  lines.push(doc.cover.title);
  lines.push(doc.cover.subtitle);
  lines.push("");
  lines.push(doc.goal.heading);
  lines.push(doc.goal.intro);
  lines.push("");
  for (const step of doc.goal.process) {
    lines.push(`${step.number} ${step.title}`);
    lines.push(step.body);
  }
  lines.push("");
  lines.push(doc.goal.why_now_heading);
  for (const w of doc.goal.why_now) lines.push(`• ${w}`);
  lines.push("");
  lines.push(doc.goal.materials_deadline_note);
  lines.push("");
  lines.push(doc.materials_intro.heading);
  lines.push(doc.materials_intro.body);
  for (const s of doc.material_sections) {
    lines.push("");
    lines.push(`${s.number} ${s.title}`);
    for (const item of s.items) lines.push(`• ${item}`);
    if (s.note) lines.push(s.note);
  }
  lines.push("");
  lines.push(doc.portfolio.heading);
  lines.push(doc.portfolio.intro);
  lines.push(doc.portfolio.top.title);
  for (const item of doc.portfolio.top.items) lines.push(`• ${item}`);
  lines.push(doc.portfolio.list.title);
  for (const item of doc.portfolio.list.items) lines.push(`• ${item}`);
  lines.push(doc.portfolio.social_proof.title);
  for (const item of doc.portfolio.social_proof.items) lines.push(`• ${item}`);
  lines.push("");
  lines.push(doc.contact_branding.heading);
  for (const block of [
    doc.contact_branding.contact,
    doc.contact_branding.branding,
    doc.contact_branding.access,
  ]) {
    lines.push(block.title);
    for (const item of block.items) lines.push(`• ${item}`);
  }
  lines.push(doc.contact_branding.note);
  lines.push("");
  lines.push(doc.visual_direction.heading);
  lines.push(doc.visual_direction.intro);
  for (const p of doc.visual_direction.patterns) {
    lines.push(`${p.name} — ${p.url}`);
    lines.push(`Dlaczego: ${p.why}`);
    lines.push(`Układ: ${p.layout}`);
    lines.push(`Efekt: ${p.effect}`);
  }
  lines.push(doc.visual_direction.recommendation);
  lines.push("");
  lines.push(doc.summary.heading);
  for (const c of doc.summary.checklist) lines.push(`☐ ${c}`);
  lines.push(doc.summary.next_step);
  if (doc.summary.drive_url) lines.push(doc.summary.drive_url);
  lines.push(`${doc.summary.contact_site} · ${doc.summary.contact_email}`);
  return lines.join("\n");
}

export function parseOfferDocument(raw: unknown): OfferDocument | null {
  const parsed = offerDocumentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function offerDataFromClient(input: {
  company_name: string;
  industry?: string | null;
  page_type: "onepage" | "multipage";
  deadline?: string | null;
}): OfferData {
  return {
    companyName: input.company_name,
    industry: input.industry ?? undefined,
    pageType: input.page_type,
    deadline: input.deadline ?? "",
  };
}
