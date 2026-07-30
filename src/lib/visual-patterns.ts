/** Visual reference patterns used in Cosgral Juicy-style offers */

export interface VisualPattern {
  id: string;
  name: string;
  url: string;
  why: string;
  layout: string;
  effect: string;
}

export const COSGRAL_VISUAL_PATTERNS: VisualPattern[] = [
  {
    id: "nitex",
    name: "NITEX",
    url: "https://nitex.com",
    why: "Industrialna precyzja połączona z nowoczesnym, SaaS-owym minimalizmem.",
    layout:
      "Bardzo surowa siatka, czysta typografia i wysoki kontrast. Zamiast ozdobnictwa — fokus na strukturze, procesie i danych.",
    effect:
      "Pokazuje klientowi B2B, że pod spodem kryje się twarda logistyka i system, a nie chaos.",
  },
  {
    id: "juice",
    name: "Juice Agency",
    url: "https://juice.agency",
    why: "Odważny, edgy design i spójność nazewnicza oraz klimatyczna.",
    layout:
      "Wyrazisty sound & motion design, mocny kontrast (głębokie tła kontra neony), brak korporacyjnych nagłówków.",
    effect:
      "Pozycjonuje markę jako podmiot wyznaczający trendy. Buduje poczucie ekskluzywności.",
  },
  {
    id: "truus",
    name: "TRUUS",
    url: "https://truus.co",
    why: "Minimalizm z nutą estetyki Y2K i retro-tech.",
    layout:
      "Surowa nawigacja, wyrazisty micro-copywriting i kroje pism z przełomu wieków. Tylko mocne hasła i konkretne wideo w tle.",
    effect:
      "Retro-nostalgia robiona z wyczuciem, bez utraty czytelności komunikatu dla zarządu czy PM-a.",
  },
  {
    id: "leveled",
    name: "LEVELED Agency",
    url: "https://leveled-agency.fr",
    why: "Brutalistyczny układ portfolio i nastawienie na mięsiste case studies.",
    layout:
      "Techniczny interfejs, moduły jak dashboard lub arkusz produkcyjny, kinowe ujęcia z realizacji.",
    effect:
      "Komunikuje „jesteśmy inżynierami emocji” i od razu przechodzi do twardych dowodów.",
  },
  {
    id: "podium",
    name: "PODIUM Global",
    url: "https://podium.global",
    why: "Wzorcowe połączenie high-endowej estetyki z komunikacją biznesową.",
    layout:
      "Duża przestrzeń, elegancka typografia i perfekcyjna sekcja case studies — każdy kadr ma uzasadnienie.",
    effect:
      "Trafia do decydentów 30–50+. Wygląda poważnie, kosztownie i wiarygodnie.",
  },
  {
    id: "sweetpunk",
    name: "Sweet Punk",
    url: "https://sweetpunk.com",
    why: "Dynamika, energia i surowy, bezkompromisowy ton.",
    layout:
      "Gigantyczne nagłówki, płynny i agresywny scroll, świetna praca światłem w wideo, interaktywna ścieżka zamiast menu.",
    effect: "Udowadnia, że B2B nie musi być zachowawczy.",
  },
  {
    id: "blaed",
    name: "Blaed Agency",
    url: "https://blaedagency.com",
    why: "Butikowy, architektoniczny sznyt i skrajny redukcjonizm.",
    layout:
      "Oszczędna paleta barw, ekspozycja surowych detali, krojony na miarę układ siatki. Zero liczników i fałszywych wskaźników.",
    effect: "Mówi klientowi: „szanujemy Twój czas, nie ściemniamy”.",
  },
];

/** Pick patterns by industry hint — deterministic, no AI */
export function selectPatternsForIndustry(industry?: string | null): VisualPattern[] {
  const key = (industry ?? "").toLowerCase();
  let ids: string[];

  if (/event|imprez|wesel|konfer/.test(key)) {
    ids = ["juice", "sweetpunk", "leveled", "podium", "blaed"];
  } else if (/beauty|kosmet|fryzj|spa|wellness/.test(key)) {
    ids = ["podium", "blaed", "truus", "juice", "leveled"];
  } else if (/saas|tech|soft|it|b2b|logist/.test(key)) {
    ids = ["nitex", "leveled", "truus", "podium", "blaed"];
  } else if (/gastro|restaur|kawiarn|hoteler/.test(key)) {
    ids = ["juice", "podium", "sweetpunk", "blaed", "leveled"];
  } else {
    ids = ["nitex", "juice", "leveled", "podium", "blaed"];
  }

  return ids
    .map((id) => COSGRAL_VISUAL_PATTERNS.find((p) => p.id === id)!)
    .filter(Boolean);
}
