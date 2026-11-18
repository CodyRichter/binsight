import { useRef, type ChangeEvent } from "react";
import { NameRow } from "@/components/NameRow";
import { Sheet } from "@/components/Sheet";
import type { NewAttachment } from "./useItemAttachments";

interface AttachSheetProps {
  opened: boolean;
  onAttach: (attachment: NewAttachment) => void;
  onAddLink: () => void;
  onClose: () => void;
}

const FILE_TYPES = "application/pdf,image/jpeg,image/png,image/webp";

/** Choosing what to attach: a photo from the camera, a file, or a web link. */
export function AttachSheet({ opened, onAttach, onAddLink, onClose }: AttachSheetProps) {
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const picked = (kind: "photo" | "file") => (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!chosen) return;
    onClose();
    onAttach(kind === "photo" ? { kind, photo: chosen } : { kind, file: chosen });
  };
  return (
    <Sheet
      opened={opened}
      title="Attach"
      onClose={onClose}
      rows={
        <>
          <NameRow name="Take photo" onPick={() => photoInput.current?.click()} />
          <NameRow name="Choose file" onPick={() => fileInput.current?.click()} />
          <NameRow name="Add link" onPick={onAddLink} />
          <input
            ref={photoInput}
            hidden
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Photo"
            onChange={picked("photo")}
          />
          <input
            ref={fileInput}
            hidden
            type="file"
            accept={FILE_TYPES}
            aria-label="File"
            onChange={picked("file")}
          />
        </>
      }
    />
  );
}
