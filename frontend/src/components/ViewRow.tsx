import type { Icon } from "@tabler/icons-react";
import { Link } from "react-router";
import classes from "./ViewRow.module.css";

interface ViewRowProps {
  name: string;
  icon: Icon;
  count: number;
  to: string;
}

/** A row on /views: a view or saved search, with how many it lists now. */
export function ViewRow({ name, icon: ViewIcon, count, to }: ViewRowProps) {
  return (
    <li className={classes.row}>
      <ViewIcon aria-hidden size={20} className={classes.icon} />
      <Link className={classes.name} to={to}>
        {name}
      </Link>
      <span className={classes.count}>{count}</span>
    </li>
  );
}
