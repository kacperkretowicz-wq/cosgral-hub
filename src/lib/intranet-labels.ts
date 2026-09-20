import type { BillingStatus, ProjectStatus, ServiceType } from "./types";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  strona_www: "Strona WWW",
  system_crm: "System CRM",
  automatyzacja_ecommerce: "Automatyzacja e-commerce",
  grafika: "Grafika",
  montaz_wideo: "Montaż wideo",
  kampania_meta: "Kampania Meta Ads",
  kampania_google: "Kampania Google Ads",
  inne: "Inne",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  nowe: "Nowe",
  w_trakcie: "W trakcie",
  oczekuje: "Oczekuje",
  zakonczone: "Zakończone",
  anulowane: "Anulowane",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  nowe: "text-white/80",
  w_trakcie: "text-white",
  oczekuje: "text-amber-200/90",
  zakonczone: "text-white/50",
  anulowane: "text-white/30",
};

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  w_toku: "W toku",
  rozliczone: "Rozliczone",
  wycena: "W toku",
  faktura: "W toku",
  oplacone: "Rozliczone",
  anulowane: "Anulowane",
};

export function isBillingInProgress(status: BillingStatus | null | undefined) {
  return status === "w_toku" || status === "wycena" || status === "faktura";
}

export function isBillingSettled(status: BillingStatus | null | undefined) {
  return status === "rozliczone" || status === "oplacone";
}

export const TASK_STATUS_LABELS: Record<import("./types").TaskStatus, string> =
  {
    todo: "Do zrobienia",
    doing: "W toku",
    done: "Gotowe",
  };

export const LEAD_STATUS_LABELS: Record<import("./types").LeadStatus, string> =
  {
    nowy: "Nowy",
    kontakt: "Kontakt",
    oferta: "Oferta",
    wygrana: "Wygrana",
    przegrana: "Przegrana",
  };

export const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];
export const PROJECT_STATUSES = Object.keys(
  PROJECT_STATUS_LABELS,
) as ProjectStatus[];
