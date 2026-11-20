import type { ReactNode } from "react";
import classes from "./ListSection.module.css";

type ListSectionProps = {
  children: ReactNode;
} & (
  | { title: string; count?: number; action?: ReactNode }
  | {
      title?: never;
      count?: never;
      action?: never;
      /** Starts at the top of its container, with nothing above it to keep apart from. */
      flush?: boolean;
    }
);

export function ListSection(props: ListSectionProps) {
  const { title, count, action, children } = props;
  if (title === undefined) {
    const spacing = props.flush ? "" : ` ${classes.bare}`;
    return <ul className={`${classes.rows}${spacing}`}>{children}</ul>;
  }
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
