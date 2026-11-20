import type { ReactNode } from "react";
import classes from "./RecordColumns.module.css";

interface RecordColumnsProps {
  main: ReactNode;
  side: ReactNode;
}

/** A record's sections below its header: side by side in a wide column, stacked otherwise. */
export function RecordColumns({ main, side }: RecordColumnsProps) {
  return (
    <div className={classes.record}>
      <div className={classes.columns}>
        <div className={classes.column}>{main}</div>
        <div className={classes.column}>{side}</div>
      </div>
    </div>
  );
}
