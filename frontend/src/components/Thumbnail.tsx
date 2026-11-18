import { IconPackage, type Icon } from "@tabler/icons-react";
import { locationTypeIcons, type LocationType } from "./locationTypeIcons";
import classes from "./Thumbnail.module.css";

interface ThumbnailProps {
  photoUrl?: string;
  locationType?: LocationType;
  /** In place of the item or location icon, for an attachment that is not a photo. */
  icon?: Icon;
  large?: boolean;
}

export function Thumbnail({ photoUrl, locationType, icon, large = false }: ThumbnailProps) {
  const TypeIcon = icon ?? (locationType ? locationTypeIcons[locationType] : IconPackage);
  return (
    <span className={classes.thumbnail} data-large={large || undefined}>
      {photoUrl ? (
        <img className={classes.photo} src={photoUrl} alt="" />
      ) : (
        <TypeIcon aria-hidden size={large ? 32 : 24} />
      )}
    </span>
  );
}
