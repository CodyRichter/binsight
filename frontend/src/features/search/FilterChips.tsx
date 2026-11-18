import { Chip } from "@mantine/core";
import { useContext, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { useLocationTree } from "@/features/locations";
import { filterTitles, useFilterChoices } from "./filterChoices";
import { FilterSheet } from "./FilterSheet";
import {
  filterNames,
  statusWords,
  warrantyWords,
  type FilterName,
  type Search,
} from "./searchState";

interface FilterChipsProps {
  search: Search;
  onChange: (search: Search) => void;
}

function useChipWords(search: Search): Record<FilterName, string | undefined> {
  const locations = useLocationTree(Boolean(search.location_id)).data ?? [];
  const place = locations.find((each) => each.id === search.location_id);
  return {
    location_id: search.location_id && `In ${place?.name ?? "a location"}`,
    category: search.category,
    tag: search.tag,
    status: search.status && statusWords[search.status],
    warranty: search.warranty && `Warranty ${warrantyWords[search.warranty].toLowerCase()}`,
  };
}

/** The search filters as chips: an unpressed one opens its choices, a pressed one clears it. */
export function FilterChips({ search, onChange }: FilterChipsProps) {
  const { MoveSheet } = useContext(FrameAdditionsContext);
  const [picking, setPicking] = useState<FilterName | null>(null);
  const words = useChipWords(search);
  const choiceFilter = picking === "location_id" ? null : picking;
  const choices = useFilterChoices(choiceFilter);
  const set = (name: FilterName, value: string | undefined) =>
    onChange({ ...search, [name]: value });
  return (
    <>
      {filterNames.map((name) => (
        <Chip
          key={name}
          checked={Boolean(search[name])}
          onChange={() => (search[name] ? set(name, undefined) : setPicking(name))}
        >
          {words[name] ?? filterTitles[name]}
        </Chip>
      ))}
      {MoveSheet && (
        <MoveSheet
          opened={picking === "location_id"}
          onClose={() => setPicking(null)}
          currentId={null}
          title="Filter by location"
          onPick={(place) => set("location_id", place.id)}
        />
      )}
      <FilterSheet
        opened={choiceFilter !== null}
        title={choiceFilter ? `Filter by ${filterTitles[choiceFilter].toLowerCase()}` : ""}
        choices={choices}
        onClose={() => setPicking(null)}
        onPick={(value) => choiceFilter && set(choiceFilter, value)}
      />
    </>
  );
}
