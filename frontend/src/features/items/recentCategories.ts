const storageKey = "binsight.recent-categories";
const kept = 5;

/** The categories most recently picked on this device, newest first. */
export function recentCategories(): string[] {
  const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  return Array.isArray(stored) ? stored.filter((name) => typeof name === "string") : [];
}

/** Puts a category at the front of this device's recently picked categories. */
export function rememberCategory(name: string): void {
  const recent = [name, ...recentCategories().filter((each) => each !== name)];
  localStorage.setItem(storageKey, JSON.stringify(recent.slice(0, kept)));
}

/** Categories with the recently picked ones first, newest first; the rest keep their order. */
export function recentFirst<Category extends { name: string }>(
  categories: Category[],
  recent: string[],
): Category[] {
  const picked = recent.flatMap((name) => categories.filter((each) => each.name === name));
  return [...picked, ...categories.filter((each) => !recent.includes(each.name))];
}
