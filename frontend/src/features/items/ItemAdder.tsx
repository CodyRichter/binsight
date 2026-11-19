import { useState } from "react";
import { AddBar } from "@/components/AddBar";
import { DuplicateOffer } from "./DuplicateOffer";
import { useAddItem, useAddItems } from "./useAddItem";
import { useAddByPhoto } from "./useAddByPhoto";
import type { Destination } from "./useItems";

interface ItemAdderProps {
  home: Destination | null;
  onSettled: () => void;
  onChangeDestination?: () => void;
  autoFocus?: boolean;
  defaultName?: string;
}

/** The add bar for one destination: by name, several at once, by photo, or to an existing item. */
export function ItemAdder(props: ItemAdderProps) {
  const { home, onSettled, onChangeDestination, autoFocus, defaultName } = props;
  const [typed, setTyped] = useState(defaultName ?? "");
  const addItem = useAddItem(home, onSettled);
  const addItems = useAddItems(home, onSettled);
  const addByPhoto = useAddByPhoto(home, onSettled);
  return (
    <AddBar
      destinationCode={home?.id}
      destinationName={home?.name}
      onChangeDestination={onChangeDestination}
      onAdd={(names) => names.forEach(addItem)}
      onAddSeveral={addItems}
      onAddByPhoto={addByPhoto}
      onNameChange={setTyped}
      autoFocus={autoFocus}
      defaultName={defaultName}
      suggestion={(clearName) =>
        home && <DuplicateOffer home={home} typed={typed} clearName={clearName} />
      }
    />
  );
}
