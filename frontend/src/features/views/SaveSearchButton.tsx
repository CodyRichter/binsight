import { Button } from "@mantine/core";
import { useState } from "react";
import { useAccess } from "@/lib/api/useAccess";
import type { Search } from "@/features/search";
import { NameSheet } from "./NameSheet";
import { useSaveSearch } from "./useSavedSearches";

/** The search page's "Save search", which keeps the words and filters under a name. */
export function SaveSearchButton({ search }: { search: Search }) {
  const [naming, setNaming] = useState(false);
  const save = useSaveSearch();
  if (!useAccess().canEdit) return null;
  return (
    <>
      <Button onClick={() => setNaming(true)}>Save search</Button>
      <NameSheet
        // Opened afresh each time, so it offers the words searched for at that moment.
        key={String(naming)}
        opened={naming}
        title="Save search"
        action="Save"
        initialName={search.query}
        onName={(name) => save({ ...search, name })}
        onClose={() => setNaming(false)}
      />
    </>
  );
}
