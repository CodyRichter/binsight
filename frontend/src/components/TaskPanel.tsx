import type { FormEvent, ReactNode } from "react";
import classes from "./TaskPanel.module.css";

interface TaskPanelProps {
  /** Given for a field: Enter does what the task's button does. */
  onSubmit?: () => void;
  children: ReactNode;
}

/** A task's work held to the gutter, such as the camera or one field. */
export function TaskPanel({ onSubmit, children }: TaskPanelProps) {
  if (!onSubmit) return <div className={classes.panel}>{children}</div>;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form className={classes.panel} onSubmit={submit}>
      {children}
    </form>
  );
}
