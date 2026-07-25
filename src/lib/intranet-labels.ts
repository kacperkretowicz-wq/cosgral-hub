import type { ProjectStatus, ServiceType } from "./types";

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
  nowe: "text-blue-400",
  w_trakcie: "text-yellow-400",
  oczekuje: "text-orange-400",
  zakonczone: "text-green-400",
  anulowane: "text-white/40",
};

export const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];
