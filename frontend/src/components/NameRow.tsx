import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./NameRow.module.css";

interface NameRowProps {
  name: string;
  /** How many items have it, at the right; left out for a name not used yet. */
  itemCount?: number;
  /** A 20px icon before the name, such as a location type's. */
  icon?: ReactNode;
  /** The one now in use, marked with a check. */
  chosen?: boolean;
  onPick: () => void;
}

/** A row in a sheet that picks a category, tag or type by its name. */
export function NameRow({ name, itemCount, icon, chosen, onPick }: NameRowProps) {
  return (
    <li className={classes.row}>
      {icon && <span className={classes.icon}>{icon}</span>}
      <button
        type="button"
        className={classes.name}
        aria-current={chosen || undefined}
        onClick={onPick}
      >
        {name}
      </button>
      {itemCount !== undefined && <span className={classes.count}>{itemCount}</span>}
      {chosen && <IconCheck aria-hidden size={20} className={classes.chosen} />}
    </li>
  );
}
