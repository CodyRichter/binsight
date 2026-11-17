import { DuplicateSuggestion } from "@/components/DuplicateSuggestion";
import { itemName } from "./placeName";
import { likelyDuplicate } from "./likelyDuplicate";
import { useAddToExisting } from "./useItemChange";
import { useLocationItems, type Destination } from "./useItems";

interface DuplicateOfferProps {
  home: Destination;
  typed: string;
  clearName: () => void;
}

/** Offers "Add to existing" while the name being typed matches an item already here. */
export function DuplicateOffer({ home, typed, clearName }: DuplicateOfferProps) {
  const items = useLocationItems(home.id, false);
  const addToExisting = useAddToExisting();
  const existing = likelyDuplicate(typed, items.data ?? []);
  if (!existing) return null;
  return (
    <DuplicateSuggestion
      message={`${itemName(existing.name)} is already here`}
      onAccept={() => {
        clearName();
        addToExisting(existing);
      }}
    />
  );
}
