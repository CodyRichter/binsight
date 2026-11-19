import { ActionIcon } from "@mantine/core";
import { IconFileTypePdf, IconPhoto, IconWorld, IconX } from "@tabler/icons-react";
import { Thumbnail } from "./Thumbnail";
import classes from "./AttachmentRow.module.css";

export interface AttachmentRowProps {
  kind: "photo" | "file" | "link";
  /** What it is called: a file's name, a link's name or address, or "Photo". */
  name: string;
  /** Under the name, in muted text: a file's size, or a link's site. */
  detail?: string;
  /** Where tapping opens it, in a new tab. */
  href: string;
  /** For a photo, the photo itself in place of an icon. */
  photoUrl?: string;
  /** For a file, whether it is a PDF rather than an image. */
  pdf?: boolean;
  /** Left out for someone who may not change the item. */
  onRemove?: () => void;
}

function iconOf({ kind, pdf }: AttachmentRowProps) {
  if (kind === "link") return IconWorld;
  return pdf ? IconFileTypePdf : IconPhoto;
}

/** One of an item's photos, files or web links: opened by tapping, removed with its button. */
export function AttachmentRow(props: AttachmentRowProps) {
  const { name, detail, href, photoUrl, onRemove } = props;
  return (
    <li className={classes.row}>
      <Thumbnail photoUrl={photoUrl} icon={iconOf(props)} />
      <div className={classes.main}>
        <a className={classes.name} href={href} target="_blank" rel="noreferrer">
          {name}
        </a>
        {detail && <span className={classes.detail}>{detail}</span>}
      </div>
      {onRemove && (
        <ActionIcon className={classes.remove} aria-label={`Remove ${name}`} onClick={onRemove}>
          <IconX aria-hidden />
        </ActionIcon>
      )}
    </li>
  );
}
