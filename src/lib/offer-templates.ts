import type { Inspiration, MaterialSection, PageType } from "./types";

export interface OfferData {
  companyName: string;
  pageType: PageType;
  deadline: string;
  industry?: string;
  inspirations?: Inspiration[];
}

export function formatDeadline(dateStr: string): string {
  if (!dateStr) return "[wpisz datę]";
  return new Date(dateStr).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getOfferSubject(data: OfferData): string {
  return `[${data.companyName}] Co jest nam potrzebne do stworzenia strony? (Lista materiałów i treści)`;
}

export function getOfferIntro(data: OfferData): string {
  return `Cześć!
Cieszymy się na współpracę przy nowej stronie dla ${data.companyName}! Chcemy, żeby serwis w pełni oddawał charakter marki, przyciągał idealnych klientów i budował zaufanie od pierwszego wejrzenia.
Abyśmy mogli sprawnie przejść do projektowania i wdrożenia, przygotowaliśmy dla Ciebie zestawienie materiałów oraz informacji, których od Was potrzebujemy. Rozbiliśmy to na poszczególne sekcje planowanej strony${data.pageType === "multipage" ? " (w tym osobne podstrony)" : ""}:`;
}

export interface OfferSection {
  number: string;
  title: string;
  items: string[];
}

export function getOfferSections(data: OfferData): OfferSection[] {
  const multipageNote =
    data.pageType === "multipage"
      ? " (dla każdej podstrony osobno, jeśli dotyczy)"
      : "";

  return [
    {
      number: "1",
      title: "Sekcja Główna (Hero Section – góra strony)",
      items: [
        "Hasło główne (Headline): Krótkie, mocne zdanie mówiące o tym, czym jest " +
          data.companyName +
          " i co Was wyróżnia.",
        "Podtytuł: 1-2 zdania doprecyzowujące Wasz profil działania.",
        "Materiały wideo/foto: Krótka rolka (wideo w tle) pokazująca kulisy/klimat Waszej działalności LUB 1-2 wysokiej jakości zdjęcia wizerunkowe (poziome).",
      ],
    },
    {
      number: "2",
      title: "O nas / O marce",
      items: [
        `Tekst o ${data.companyName}: Kim jesteście, jak pracujecie i dlaczego warto wybrać właśnie Was.`,
        "Kluczowe liczby (do statystyk): np. liczba zrealizowanych projektów, lata na rynku, liczba obsłużonych klientów lub znanych marek.",
        "Zdjęcia zespołu / liderów: Profesjonalne portrety lub zdjęcia w trakcie pracy.",
      ],
    },
    {
      number: "3",
      title: "Oferta (Usługi)",
      items: [
        "Lista głównych obszarów działalności: Podział na główne kategorie usług.",
        `Krótki opis do każdej usługi${multipageNote}: 2-4 zdania na temat tego, co wchodzi w skład danej usługi i jaki problem klienta rozwiązujecie.`,
      ],
    },
    {
      number: "4",
      title: "Portfolio i Realizacje (Najważniejsza część strony)",
      items: [
        "W tej branży klienci kupują oczami, dlatego chcemy dobrze wyeksponować Wasze doświadczenie:",
        "A. TOP Case Studies (3–5 głównych projektów): Te projekty, którymi chcecie chwalić się w pierwszej kolejności. Opis (cel, wyzwanie, efekt), galeria zdjęć/wideo, logotyp klienta i ewentualnie referencje.",
        "B. Pełna lista / Siatka zorganizowanych realizacji: Potrzebujemy krótkiej listy/materiału dla 10–20 pozostałych projektów: nazwa / typ oraz po 2–4 reprezentatywne zdjęcia z każdego.",
      ],
    },
    {
      number: "5",
      title: "Logotypy & Opinie (Dowód społeczny)",
      items: [
        "Logotypy klientów: Pliki graficzne marek, dla których realizowaliście projekty (najlepiej .SVG lub .PNG na przezroczystym tle).",
        "Cytaty/Opinie (Testimonials): 2–4 krótkie wypowiedzi od zadowolonych klientów wraz z imieniem, nazwiskiem, stanowiskiem i nazwą firmy.",
      ],
    },
    {
      number: "6",
      title: "Kontakt & Stopka",
      items: [
        "Dane firmowe: Pełna nazwa, NIP, adres rejestrowy / biura.",
        "Dane do kontaktu: Adres e-mail, numer telefonu (do kogo bezpośrednio trafiają zapytania?).",
        "Social Media: Linki do profilów (Instagram, LinkedIn, Facebook itd.).",
      ],
    },
    {
      number: "",
      title: "Ogólne materiały identyfikacji wizualnej (Branding)",
      items: [
        "Logo: Wersja podstawowa, alternatywna oraz sygnet (pliki .SVG, .EPS lub wysokiej jakości .PNG).",
        "Księga znaku / Paleta kolorów / Fonty: Jeśli posiadacie (pliki .PDF lub kody kolorów HEX).",
        "Dostępy: Informacja, gdzie masz zarejestrowaną domenę/hosting (jeśli mamy tam stawiać stronę).",
      ],
    },
  ];
}

export function getOfferClosing(data: OfferData): string {
  return `Prośba o przesłanie materiałów do dnia ${formatDeadline(data.deadline)}.
Gdyby któryś punkt wymagał omówienia lub chcielibyście, żebyśmy pomogli w dopracowaniu treści – daj znać, chętnie się zdzwonimy.

Przesyłamy również strony internetowe, które według nas dobrze sprawdzą się jako wzór i inspiracja dla ${data.companyName}.`;
}

export function getOfferFooter(): string {
  return `Pozdrawiamy,

Kacper Kosikowski i Jakub Gral

COSGRAL.AGENCY`;
}

export const MATERIAL_SECTIONS: MaterialSection[] = [
  {
    key: "hero",
    title: "1. Sekcja Główna (Hero Section)",
    description:
      "Hasło główne, podtytuł oraz materiały wideo/foto na górę strony.",
    fields: [
      {
        key: "headline",
        label: "Hasło główne (Headline)",
        type: "text",
        placeholder: "Krótkie, mocne zdanie o tym, czym jest Wasza firma",
      },
      {
        key: "subtitle",
        label: "Podtytuł",
        type: "textarea",
        placeholder: "1-2 zdania doprecyzowujące profil działania",
      },
    ],
    uploadLabel: "Wideo/foto (rolka w tle lub 1-2 zdjęcia poziome)",
  },
  {
    key: "about",
    title: "2. O nas / O marce",
    description: "Kim jesteście, jak pracujecie i dlaczego warto Was wybrać.",
    fields: [
      {
        key: "about_text",
        label: "Tekst o marce",
        type: "textarea",
        placeholder: "Opis firmy, sposób pracy, wyróżniki",
      },
      {
        key: "stats",
        label: "Kluczowe liczby (statystyki)",
        type: "textarea",
        placeholder: "np. liczba projektów, lata na rynku, liczba klientów",
      },
    ],
    uploadLabel: "Zdjęcia zespołu / liderów",
  },
  {
    key: "services",
    title: "3. Oferta (Usługi)",
    description: "Lista obszarów działalności z opisami.",
    fields: [
      {
        key: "service_areas",
        label: "Lista głównych obszarów działalności",
        type: "textarea",
        placeholder: "Podział na kategorie usług",
      },
      {
        key: "service_descriptions",
        label: "Opisy usług (2-4 zdania każda)",
        type: "textarea",
        placeholder: "Opis każdej usługi i problem, który rozwiązujecie",
      },
    ],
    uploadLabel: "Ikony lub zdjęcia usług (opcjonalnie)",
  },
  {
    key: "portfolio-top",
    title: "4a. Portfolio — TOP Case Studies",
    description:
      "3–5 głównych projektów: opis (cel, wyzwanie, efekt), galeria, logotyp klienta, referencje.",
    fields: [
      {
        key: "case_studies",
        label: "Opisy projektów (cel, wyzwanie, efekt)",
        type: "textarea",
        placeholder: "Projekt 1:\nProjekt 2:\nProjekt 3:",
      },
      {
        key: "references",
        label: "Referencje (opcjonalnie)",
        type: "textarea",
        placeholder: "Cytaty lub referencje od klientów",
      },
    ],
    uploadLabel: "Galeria zdjęć/wideo + logotypy klientów",
    uploadMultiple: true,
  },
  {
    key: "portfolio-list",
    title: "4b. Portfolio — Pełna lista realizacji",
    description:
      "Lista 10–20 pozostałych projektów z nazwą/ typem oraz 2–4 zdjęciami każdy.",
    fields: [
      {
        key: "events_list",
        label: "Lista projektów (nazwa / typ)",
        type: "textarea",
        placeholder: "1. Gala Jubileuszowa dla X\n2. Premiera Produktu Y\n3. ...",
      },
    ],
    uploadLabel: "Zdjęcia z realizacji (2-4 per projekt)",
    uploadMultiple: true,
  },
  {
    key: "social-proof",
    title: "5. Logotypy & Opinie",
    description:
      "Logotypy klientów oraz 2–4 cytaty/testimonials.",
    fields: [
      {
        key: "testimonials",
        label: "Cytaty / Opinie (treść + imię + stanowisko + firma)",
        type: "textarea",
        placeholder: '"Cytat..." — Imię Nazwisko, Stanowisko, Firma',
      },
    ],
    uploadLabel: "Logotypy klientów (.SVG / .PNG)",
    uploadMultiple: true,
  },
  {
    key: "contact",
    title: "6. Kontakt & Stopka",
    description: "Dane firmowe, kontaktowe i social media.",
    fields: [
      {
        key: "company_full_name",
        label: "Pełna nazwa firmy",
        type: "text",
      },
      { key: "nip", label: "NIP", type: "text" },
      {
        key: "address",
        label: "Adres rejestrowy / biura",
        type: "textarea",
      },
      { key: "email", label: "E-mail kontaktowy", type: "text" },
      { key: "phone", label: "Telefon", type: "text" },
      {
        key: "instagram",
        label: "Instagram",
        type: "text",
        placeholder: "https://instagram.com/...",
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        type: "text",
        placeholder: "https://linkedin.com/...",
      },
      {
        key: "facebook",
        label: "Facebook",
        type: "text",
        placeholder: "https://facebook.com/...",
      },
    ],
    uploadLabel: "",
  },
  {
    key: "branding",
    title: "7. Branding",
    description:
      "Logo, księga znaku, paleta kolorów, fonty oraz dostępy do domeny/hostingu.",
    fields: [
      {
        key: "domain_hosting",
        label: "Dostępy — domena / hosting",
        type: "textarea",
        placeholder: "Gdzie zarejestrowana domena, dane dostępowe do hostingu",
      },
    ],
    uploadLabel: "Logo (.SVG/.EPS/.PNG) + Księga znaku / paleta / fonty (.PDF)",
    uploadMultiple: true,
  },
];

export const DRIVE_SECTION_FOLDERS = MATERIAL_SECTIONS.filter(
  (s) => s.uploadLabel,
).map((s) => ({
  key: s.key,
  name: s.title.replace(/^\d+[ab]?\.\s*/, ""),
}));
