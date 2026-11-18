/** The header's count line for a list of search results: "1 result", "3 results". */
export function resultCount(count: number | undefined): string[] {
  if (count === undefined) return [];
  return [count === 1 ? "1 result" : `${count} results`];
}
