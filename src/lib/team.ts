/** Fixed 2-person Cosgral team — used in schedule & assignments */

export const TEAM = [
  {
    id: "jakub",
    label: "Jakub",
    email: "jakub.gral00@gmail.com",
  },
  {
    id: "kacper",
    label: "Kacper",
    email: "kacper.kretowicz@op.pl",
  },
] as const;

export type TeamMemberId = (typeof TEAM)[number]["id"];

export function isTeamMemberId(value: string): value is TeamMemberId {
  return TEAM.some((m) => m.id === value);
}

export function teamLabel(id: string | null | undefined): string {
  return TEAM.find((m) => m.id === id)?.label ?? id ?? "—";
}
