import type { ReactNode } from "react";
import classes from "./ListSection.module.css";

interface ListSectionProps {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}

export function ListSection({ title, count, action, children }: ListSectionProps) {
  return (
    <section>
      <div className={classes.header}>
        <h2 className={classes.title}>
          {title}
          {count !== undefined && <small className={classes.count}>{count}</small>}
        </h2>
        {action}
      </div>
      <ul className={classes.rows}>{children}</ul>
    </section>
  );
}
