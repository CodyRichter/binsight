import { IconPackage, type Icon } from "@tabler/icons-react";
import { LocationIcon } from "./LocationIcon";
import type { LocationType } from "./locationIcons";
import classes from "./Thumbnail.module.css";

interface ThumbnailProps {
  photoUrl?: string;
  locationType?: LocationType;
  /** The icon chosen for the location, shown in place of its type's. */
  locationIcon?: string | null;
  /** In place of the item or location icon, for an attachment that is not a photo. */
  icon?: Icon;
  large?: boolean;
}

function placeholder({ locationType, locationIcon, icon, large }: ThumbnailProps) {
  const size = large ? 32 : 24;
  if (locationType && !icon) {
    return <LocationIcon type={locationType} icon={locationIcon} size={size} />;
  }
  const Shown = icon ?? IconPackage;
  return <Shown aria-hidden size={size} />;
}

export function Thumbnail(props: ThumbnailProps) {
  const { photoUrl, large = false } = props;
  return (
    <span className={classes.thumbnail} data-large={large || undefined}>
      {photoUrl ? <img className={classes.photo} src={photoUrl} alt="" /> : placeholder(props)}
    </span>
  );
}
