import type { components } from "@/types/api.generated";

export type Role = components["schemas"]["Role"];

/** The roles from least to most allowed, each with the word it is shown as. */
export const roles: { role: Role; word: string }[] = [
  { role: "viewer", word: "View" },
  { role: "editor", word: "Edit" },
  { role: "admin", word: "Admin" },
];

export function roleWord(role: Role): string {
  return roles.find((each) => each.role === role)?.word ?? role;
}
