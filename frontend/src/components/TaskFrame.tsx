import { ActionIcon, Button } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./TaskFrame.module.css";

interface TaskFrameProps {
  name: string;
  onClose: () => void;
  action: { label: string; onClick: () => void };
  children: ReactNode;
}

export function TaskFrame({ name, onClose, action, children }: TaskFrameProps) {
  return (
    <div className={classes.frame} data-frame="task">
      <title>{`${name} – Binsight`}</title>
      <header className={classes.bar}>
        <ActionIcon aria-label="Close" onClick={onClose}>
          <IconX aria-hidden />
        </ActionIcon>
        <h1 className={classes.name} tabIndex={-1}>
          {name}
        </h1>
      </header>
      <main id="content" className={classes.work}>
        {children}
      </main>
      <div className={classes.action}>
        <Button variant="primary" fullWidth onClick={action.onClick}>
          {action.label}
        </Button>
      </div>
    </div>
  );
}
