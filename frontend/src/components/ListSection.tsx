import type { ReactNode } from "react";
import classes from "./ListSection.module.css";

type ListSectionProps = {
  children: ReactNode;
} & (
  | { title: string; count?: number; action?: ReactNode }
  | { title?: never; count?: never; action?: never }
);

export function ListSection({ title, count, action, children }: ListSectionProps) {
  if (title === undefined) return <ul className={`${classes.rows} ${classes.bare}`}>{children}</ul>;
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
