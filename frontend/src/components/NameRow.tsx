import classes from "./NameRow.module.css";

interface NameRowProps {
  name: string;
  /** How many items have it, at the right; left out for a name not used yet. */
  itemCount?: number;
  onPick: () => void;
}

/** A row in a sheet that picks a category or tag by its name. */
export function NameRow({ name, itemCount, onPick }: NameRowProps) {
  return (
    <li className={classes.row}>
      <button type="button" className={classes.name} onClick={onPick}>
        {name}
      </button>
      {itemCount !== undefined && <span className={classes.count}>{itemCount}</span>}
    </li>
  );
}
