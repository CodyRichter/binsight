import type { ReactNode } from "react";
import classes from "./ValueRow.module.css";

interface ValueRowProps {
  name: string;
  children: ReactNode;
}

export function ValueRow({ name, children }: ValueRowProps) {
  return (
    <li className={classes.row}>
      <span className={classes.name}>{name}</span>
      <div className={classes.value}>{children}</div>
    </li>
  );
}
