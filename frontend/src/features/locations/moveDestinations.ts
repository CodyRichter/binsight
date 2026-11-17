import { treeRows } from "./treeRows";
import type { Location } from "./useLocations";

interface Choices {
  query: string;
  currentId: string | null;
  movingId?: string;
  recent: string[];
}

const codeNumber = (text: string) => /^b-?(\d+)$/i.exec(text.trim())?.[1];

function matches(location: Location, query: string): boolean {
  const typed = query.trim().toLowerCase();
  if (!typed) return true;
  const number = codeNumber(typed);
  const code = location.label_code && codeNumber(location.label_code);
  if (number && code) return Number(number) === Number(code);
  return location.name.toLowerCase().includes(typed);
}

/** Whether a thing can move to a location: not where it is, nor into itself or anything inside. */
export function canMoveTo(location: Location, currentId: string | null, movingId?: string) {
  return location.id !== currentId && !location.path.some((step) => step.id === movingId);
}

/** The locations a move sheet offers: recently used first, then the rest in tree order. */
export function moveDestinations(locations: Location[], choices: Choices): Location[] {
  const everyId = new Set(locations.map((location) => location.id));
  const inTreeOrder = treeRows(locations, everyId).map((row) => row.location);
  const offered = inTreeOrder.filter(
    (location) =>
      canMoveTo(location, choices.currentId, choices.movingId) && matches(location, choices.query),
  );
  const recent = choices.recent.flatMap((id) => offered.filter((location) => location.id === id));
  return [...recent, ...offered.filter((location) => !recent.includes(location))];
}
