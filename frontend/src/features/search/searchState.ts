import type { components, operations } from "@/types/api.generated";

type Status = components["schemas"]["ItemStatus"];
type Warranty = NonNullable<
  NonNullable<operations["search_home"]["parameters"]["query"]>["warranty"]
>;

/** What a search keeps: each filter left out keeps everything. */
export interface Filters {
  location_id?: string;
  category?: string;
  tag?: string;
  status?: Status;
  warranty?: Warranty;
}

export type FilterName = keyof Filters;

/** The words typed and the filters set, as the address and a saved search hold them. */
export interface Search extends Filters {
  query: string;
}

export const filterNames: FilterName[] = ["location_id", "category", "tag", "status", "warranty"];

export const statusWords: Record<Status, string> = {
  in_place: "In place",
  in_use: "In use",
  lent_out: "Lent out",
  missing: "Missing",
  sold: "Sold",
  given_away: "Given away",
  thrown_away: "Thrown away",
};

export const warrantyWords: Record<Warranty, string> = {
  active: "Under warranty",
  ending_soon: "Ending soon",
  ended: "Ended",
};

/** The search an address asks for: `q` and each filter by its own name. */
export function searchOf(params: URLSearchParams): Search {
  const search: Search = { query: (params.get("q") ?? "").trim() };
  for (const name of filterNames) {
    const value = params.get(name);
    // The address is typed by people, so a value is checked once more by the API.
    if (value) Object.assign(search, { [name]: value });
  }
  return search;
}

/** The address of a search, leaving out what it doesn't use. */
export function addressOf(search: Search): string {
  const params = new URLSearchParams({ q: search.query });
  for (const name of filterNames) {
    const value = search[name];
    if (value) params.set(name, value);
  }
  return `/search?${params}`;
}

export function hasFilters(search: Filters): boolean {
  return filterNames.some((name) => Boolean(search[name]));
}
