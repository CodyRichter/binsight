import type { ChangeEvent, RefObject } from "react";
import { useAttach } from "./useItemAttachments";
import type { Item } from "./useItems";

interface ItemPhotoInputProps {
  item: Item;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Hidden camera input used when adding a photo directly from an item's placeholder thumbnail. */
export function ItemPhotoInput({ item, inputRef }: ItemPhotoInputProps) {
  const attach = useAttach(item);
  const photoTaken = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (photo) attach({ kind: "photo", photo });
  };
  return (
    <input
      ref={inputRef}
      hidden
      type="file"
      accept="image/*"
      capture="environment"
      aria-label="Item photo"
      onChange={photoTaken}
    />
  );
}
