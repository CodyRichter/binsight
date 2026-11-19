import type { HistoryEntry } from "./useItemHistory";

/** Who made a change, as history shows it: Claude, You for this account, or the username. */
export function madeBy(entry: Pick<HistoryEntry, "actor" | "username">, me: string | undefined) {
  if (entry.actor === "mcp") return "Claude";
  if (entry.username === null) return "Someone";
  return entry.username === me ? "You" : entry.username;
}
