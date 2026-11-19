import { LocationIcon } from "./LocationIcon";
import { iconWords, type LocationType } from "./locationIcons";
import classes from "./IconGrid.module.css";

interface IconGridProps {
  /** The location's type, whose icon a null choice stands for. */
  type: LocationType;
  /** Icons by name; null is the type's own icon. */
  icons: (string | null)[];
  chosen: string | null;
  /** How many matched, when more matched than are shown. */
  total?: number;
  onPick: (icon: string | null) => void;
}

/** Icons to pick a location's from, each a square button named by its words. */
export function IconGrid({ type, icons, chosen, total, onPick }: IconGridProps) {
  return (
    <div className={classes.grid}>
      <ul className={classes.icons}>
        {icons.map((icon) => (
          <li key={icon ?? ""}>
            <button
              type="button"
              className={classes.icon}
              aria-label={icon ? iconWords(icon) : "Type's icon"}
              aria-pressed={icon === chosen}
              onClick={() => onPick(icon)}
            >
              <LocationIcon type={type} icon={icon} size={24} />
            </button>
          </li>
        ))}
      </ul>
      {icons.length === 0 && <p className={classes.more}>No icon matches. Try another word.</p>}
      {total !== undefined && total > icons.length && (
        <p className={classes.more}>
          {icons.length} of {total} shown. Keep typing to narrow.
        </p>
      )}
    </div>
  );
}
