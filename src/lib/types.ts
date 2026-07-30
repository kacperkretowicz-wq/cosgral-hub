export type PageType = "onepage" | "multipage";
export type ClientStatus = "draft" | "sent" | "submitted";

export interface Inspiration {
  name: string;
  url: string;
  whyFit: string;
  layout: string;
  whyWorks: string;
}

export type { OfferContent, OfferContentSection } from "./offer-content";
import type { OfferContent } from "./offer-content";
import type { OfferDocument } from "./offer-document";

export interface Client {
  id: string;
  company_name: string;
  industry: string | null;
  page_type: PageType;
  deadline: string | null;
  token: string;
  drive_folder_id: string | null;
  drive_section_folders: Record<string, string> | null;
  drive_doc_id: string | null;
  inspirations: Inspiration[] | null;
  offer_content: OfferContent | null;
  offer_text: string | null;
  offer_document: OfferDocument | null;
  offer_ready: boolean;
  status: ClientStatus;
  created_at: string;
}

export interface Submission {
  id: string;
  client_id: string;
  section_key: string;
  field_key: string;
  text_content: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  client_id: string;
  section_key: string;
  drive_file_id: string;
  file_name: string;
  mime_type: string;
  uploaded_at: string;
}

export interface MaterialField {
  key: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
}

export interface MaterialSection {
  key: string;
  title: string;
  description: string;
  fields: MaterialField[];
  uploadLabel: string;
  uploadMultiple?: boolean;
  repeatable?: boolean;
  repeatLabel?: string;
  repeatCount?: number;
}

export type ServiceType =
  | "strona_www"
  | "system_crm"
  | "automatyzacja_ecommerce"
  | "grafika"
  | "montaz_wideo"
  | "kampania_meta"
  | "kampania_google"
  | "inne";

export type ProjectStatus =
  | "nowe"
  | "w_trakcie"
  | "oczekuje"
  | "zakonczone"
  | "anulowane";

export type BillingStatus = "wycena" | "faktura" | "oplacone" | "anulowane";

export type TaskStatus = "todo" | "doing" | "done";

export type LeadStatus =
  | "nowy"
  | "kontakt"
  | "oferta"
  | "wygrana"
  | "przegrana";

export interface CrmClient {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  crm_client_id: string | null;
  website_client_id: string | null;
  service_type: ServiceType;
  status: ProjectStatus;
  assigned_to: string | null;
  deadline: string | null;
  description: string;
  value_pln: number | null;
  cost_pln: number | null;
  billing_status: BillingStatus;
  created_at: string;
  updated_at: string;
  crm_clients?: CrmClient | null;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  assignee: string;
  status: TaskStatus;
  due_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  projects?: Pick<Project, "id" | "title"> | null;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: LeadStatus;
  message: string;
  crm_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  project_id: string | null;
  crm_client_id: string | null;
  author_email: string;
  content: string;
  created_at: string;
}

export interface ResourceLink {
  id: string;
  project_id: string | null;
  crm_client_id: string | null;
  title: string;
  url: string;
  category: string;
  created_at: string;
}
