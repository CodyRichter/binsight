import { SearchResults } from "@/features/search";
import { SaveSearchButton } from "@/features/views";

export function SearchPage() {
  return <SearchResults action={(search) => <SaveSearchButton search={search} />} />;
}
