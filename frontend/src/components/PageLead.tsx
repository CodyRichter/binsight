import type { ReactNode } from "react";
import classes from "./PageLead.module.css";

interface PageLeadProps {
  header: ReactNode;
  filters?: ReactNode;
  children?: ReactNode;
}

/** The top of a page: its header, then the controls that act on the whole page. */
export function PageLead({ header, filters, children }: PageLeadProps) {
  return (
    <div className={classes.lead}>
      {header}
      {children && <div className={classes.controls}>{children}</div>}
      {filters && <div className={classes.filters}>{filters}</div>}
    </div>
  );
}
