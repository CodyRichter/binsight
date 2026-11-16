import { IconPackage } from "@tabler/icons-react";
import { locationTypeIcons, type LocationType } from "./locationTypeIcons";
import classes from "./Thumbnail.module.css";

interface ThumbnailProps {
  photoUrl?: string;
  locationType?: LocationType;
  large?: boolean;
}

export function Thumbnail({ photoUrl, locationType, large = false }: ThumbnailProps) {
  const TypeIcon = locationType ? locationTypeIcons[locationType] : IconPackage;
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
