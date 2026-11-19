import type { ReactNode } from "react";
import classes from "./ValueRow.module.css";

interface ValueRowProps {
  name: string;
  /** The name to the left of the value on one line, for a long list of short details. */
  beside?: boolean;
  children: ReactNode;
}

export function ValueRow({ name, beside, children }: ValueRowProps) {
  return (
    <li className={beside ? `${classes.row} ${classes.beside}` : classes.row}>
      <span className={classes.name}>{name}</span>
      <div className={classes.value}>{children}</div>
    </li>
  );
}
