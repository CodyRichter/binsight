import { Button } from "@mantine/core";
import { IconPhoto, IconPhotoOff } from "@tabler/icons-react";
import { useRef, type ChangeEvent } from "react";
import { Thumbnail } from "./Thumbnail";
import classes from "./PhotoChoice.module.css";

interface PhotoChoiceProps {
  photoUrl?: string;
  /** Names the file input, which the camera or file picker fills. */
  inputLabel: string;
  /** Given the photo taken or chosen, or null to take the photo away. */
  onPhoto: (photo: File | null) => void;
}

/** Adding a photo, or the photo shown with Replace and Remove beside it. */
export function PhotoChoice({ photoUrl, inputLabel, onPhoto }: PhotoChoiceProps) {
  const input = useRef<HTMLInputElement>(null);
  const taken = (event: ChangeEvent<HTMLInputElement>) => {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (photo) onPhoto(photo);
  };
  return (
    <div className={classes.choice}>
      {photoUrl && <Thumbnail photoUrl={photoUrl} large />}
      <div className={classes.buttons}>
        <Button leftSection={<IconPhoto aria-hidden />} onClick={() => input.current?.click()}>
          {photoUrl ? "Replace photo" : "Add photo"}
        </Button>
        {photoUrl && (
          <Button leftSection={<IconPhotoOff aria-hidden />} onClick={() => onPhoto(null)}>
            Remove photo
          </Button>
        )}
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={inputLabel}
        onChange={taken}
      />
    </div>
  );
}
