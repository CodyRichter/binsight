import { ActionIcon } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import classes from "./SelectionBar.module.css";

interface SelectionBarProps {
  count: number;
  actions: ReactNode;
  onClose: () => void;
}

export function SelectionBar({ count, actions, onClose }: SelectionBarProps) {
  return (
    <div className={classes.bar} role="toolbar" aria-label="Selected rows">
      <span className={classes.count}>{count} selected</span>
      <div className={classes.actions}>{actions}</div>
      <ActionIcon aria-label="Close" onClick={onClose}>
        <IconX aria-hidden />
      </ActionIcon>
    </div>
  );
}
