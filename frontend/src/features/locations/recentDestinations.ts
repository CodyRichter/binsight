const storageKey = "binsight.recent-destinations";
const kept = 5;

/** The locations most recently moved things to on this device, newest first. */
export function recentDestinations(): string[] {
  const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
}

/** Puts a location at the front of this device's recently used destinations. */
export function rememberDestination(locationId: string): void {
  const recent = [locationId, ...recentDestinations().filter((id) => id !== locationId)];
  localStorage.setItem(storageKey, JSON.stringify(recent.slice(0, kept)));
}
