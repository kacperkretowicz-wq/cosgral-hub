import { v4 as uuidv4 } from "uuid";
import type { CrmClient, Note, Project, ResourceLink } from "./types";
import { assertPersistentDb } from "./persistence";
import { readJsonStore, writeJsonStore } from "./json-store";

async function readJson<T>(file: string, fallback: T): Promise<T> {
  return readJsonStore(file, fallback);
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  assertPersistentDb("zapis danych intranetu");
  await writeJsonStore(file, data);
}

export function createLocalIntranetDb() {
  return {
    async getCrmClients(): Promise<CrmClient[]> {
      const clients = await readJson<CrmClient[]>("crm_clients.json", []);
      return clients.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
    },

    async getCrmClient(id: string): Promise<CrmClient | null> {
      const clients = await readJson<CrmClient[]>("crm_clients.json", []);
      return clients.find((c) => c.id === id) ?? null;
    },

    async createCrmClient(
      input: Omit<CrmClient, "id" | "created_at" | "updated_at">,
    ): Promise<CrmClient> {
      const clients = await readJson<CrmClient[]>("crm_clients.json", []);
      const now = new Date().toISOString();
      const client: CrmClient = {
        ...input,
        id: uuidv4(),
        created_at: now,
        updated_at: now,
      };
      clients.unshift(client);
      await writeJson("crm_clients.json", clients);
      return client;
    },

    async updateCrmClient(
      id: string,
      input: Partial<CrmClient>,
    ): Promise<CrmClient> {
      const clients = await readJson<CrmClient[]>("crm_clients.json", []);
      const idx = clients.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("CRM client not found");
      clients[idx] = {
        ...clients[idx],
        ...input,
        updated_at: new Date().toISOString(),
      };
      await writeJson("crm_clients.json", clients);
      return clients[idx];
    },

    async getProjects(filters?: {
      status?: string;
      service_type?: string;
      crm_client_id?: string;
    }): Promise<Project[]> {
      let projects = await readJson<Project[]>("projects.json", []);
      const crmClients = await readJson<CrmClient[]>("crm_clients.json", []);
      if (filters?.status) {
        projects = projects.filter((p) => p.status === filters.status);
      }
      if (filters?.service_type) {
        projects = projects.filter(
          (p) => p.service_type === filters.service_type,
        );
      }
      if (filters?.crm_client_id) {
        projects = projects.filter(
          (p) => p.crm_client_id === filters.crm_client_id,
        );
      }
      return projects
        .map((p) => ({
          ...p,
          crm_clients: crmClients.find((c) => c.id === p.crm_client_id) ?? null,
        }))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
    },

    async getProject(id: string): Promise<Project | null> {
      const projects = await readJson<Project[]>("projects.json", []);
      const project = projects.find((p) => p.id === id);
      if (!project) return null;
      const crmClients = await readJson<CrmClient[]>("crm_clients.json", []);
      return {
        ...project,
        crm_clients:
          crmClients.find((c) => c.id === project.crm_client_id) ?? null,
      };
    },

    async createProject(
      input: Omit<Project, "id" | "created_at" | "updated_at" | "crm_clients">,
    ): Promise<Project> {
      const projects = await readJson<Project[]>("projects.json", []);
      const now = new Date().toISOString();
      const project: Project = {
        ...input,
        id: uuidv4(),
        created_at: now,
        updated_at: now,
        crm_clients: null,
      };
      projects.unshift(project);
      await writeJson("projects.json", projects);
      if (project.crm_client_id) {
        const crmClients = await readJson<CrmClient[]>("crm_clients.json", []);
        project.crm_clients =
          crmClients.find((c) => c.id === project.crm_client_id) ?? null;
      }
      return project;
    },

    async updateProject(
      id: string,
      input: Partial<Project>,
    ): Promise<Project> {
      const projects = await readJson<Project[]>("projects.json", []);
      const idx = projects.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Project not found");
      const { crm_clients: _, ...rest } = input;
      projects[idx] = {
        ...projects[idx],
        ...rest,
        updated_at: new Date().toISOString(),
      };
      await writeJson("projects.json", projects);
      const crmClients = await readJson<CrmClient[]>("crm_clients.json", []);
      return {
        ...projects[idx],
        crm_clients:
          crmClients.find((c) => c.id === projects[idx].crm_client_id) ?? null,
      };
    },

    async getNotes(filters: {
      project_id?: string;
      crm_client_id?: string;
    }): Promise<Note[]> {
      const notes = await readJson<Note[]>("notes.json", []);
      return notes
        .filter((n) => {
          if (filters.project_id && n.project_id !== filters.project_id)
            return false;
          if (
            filters.crm_client_id &&
            n.crm_client_id !== filters.crm_client_id
          )
            return false;
          return true;
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    },

    async createNote(input: Omit<Note, "id" | "created_at">): Promise<Note> {
      const notes = await readJson<Note[]>("notes.json", []);
      const note: Note = {
        ...input,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };
      notes.unshift(note);
      await writeJson("notes.json", notes);
      return note;
    },

    async getResourceLinks(filters: {
      project_id?: string;
      crm_client_id?: string;
    }): Promise<ResourceLink[]> {
      const links = await readJson<ResourceLink[]>("resource_links.json", []);
      return links
        .filter((l) => {
          if (filters.project_id && l.project_id !== filters.project_id)
            return false;
          if (
            filters.crm_client_id &&
            l.crm_client_id !== filters.crm_client_id
          )
            return false;
          return true;
        })
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    },

    async createResourceLink(
      input: Omit<ResourceLink, "id" | "created_at">,
    ): Promise<ResourceLink> {
      const links = await readJson<ResourceLink[]>("resource_links.json", []);
      const link: ResourceLink = {
        ...input,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };
      links.unshift(link);
      await writeJson("resource_links.json", links);
      return link;
    },

    async deleteResourceLink(id: string): Promise<void> {
      const links = await readJson<ResourceLink[]>("resource_links.json", []);
      await writeJson(
        "resource_links.json",
        links.filter((l) => l.id !== id),
      );
    },

    async deleteCrmClient(id: string): Promise<void> {
      const clients = await readJson<CrmClient[]>("crm_clients.json", []);
      if (!clients.some((c) => c.id === id)) {
        throw new Error("CRM client not found");
      }
      await writeJson(
        "crm_clients.json",
        clients.filter((c) => c.id !== id),
      );

      const notes = await readJson<Note[]>("notes.json", []);
      await writeJson(
        "notes.json",
        notes.filter((n) => n.crm_client_id !== id),
      );

      const links = await readJson<ResourceLink[]>("resource_links.json", []);
      await writeJson(
        "resource_links.json",
        links.filter((l) => l.crm_client_id !== id),
      );

      const projects = await readJson<Project[]>("projects.json", []);
      await writeJson(
        "projects.json",
        projects.map((p) =>
          p.crm_client_id === id ? { ...p, crm_client_id: null } : p,
        ),
      );
    },

    async deleteProject(id: string): Promise<void> {
      const projects = await readJson<Project[]>("projects.json", []);
      if (!projects.some((p) => p.id === id)) {
        throw new Error("Project not found");
      }
      await writeJson(
        "projects.json",
        projects.filter((p) => p.id !== id),
      );

      const notes = await readJson<Note[]>("notes.json", []);
      await writeJson(
        "notes.json",
        notes.filter((n) => n.project_id !== id),
      );

      const links = await readJson<ResourceLink[]>("resource_links.json", []);
      await writeJson(
        "resource_links.json",
        links.filter((l) => l.project_id !== id),
      );
    },

    async deleteNote(id: string): Promise<void> {
      const notes = await readJson<Note[]>("notes.json", []);
      await writeJson(
        "notes.json",
        notes.filter((n) => n.id !== id),
      );
    },
  };
}

export type IntranetDb = ReturnType<typeof createLocalIntranetDb>;
