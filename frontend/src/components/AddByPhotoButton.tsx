import { ActionIcon } from "@mantine/core";
import { IconCamera } from "@tabler/icons-react";
import { useRef, type ChangeEvent } from "react";
import { barIconVars } from "./barControls";

interface AddByPhotoButtonProps {
  onAddByPhoto: (photo: File) => void;
}

export function AddByPhotoButton({ onAddByPhoto }: AddByPhotoButtonProps) {
  const photoInput = useRef<HTMLInputElement>(null);

  function addPhoto(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.currentTarget.files?.[0];
    if (photo) onAddByPhoto(photo);
    event.currentTarget.value = "";
  }

  return (
    <>
      <ActionIcon
        aria-label="Add by photo"
        vars={barIconVars}
        onClick={() => photoInput.current?.click()}
      >
        <IconCamera aria-hidden />
      </ActionIcon>
      <input
        ref={photoInput}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        tabIndex={-1}
        aria-hidden
        onChange={addPhoto}
      />
    </>
  );
}
