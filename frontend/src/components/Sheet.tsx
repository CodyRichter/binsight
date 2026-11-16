import { Drawer, Modal, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { ReactNode } from "react";
import classes from "./Sheet.module.css";

interface SheetProps {
  opened: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ opened, title, onClose, children }: SheetProps) {
  const theme = useMantineTheme();
  const wide = useMediaQuery(`(min-width: ${theme.breakpoints.md})`, false, {
    getInitialValueInEffect: false,
  });
  if (wide) {
    return (
      <Modal opened={opened} onClose={onClose} title={title}>
        {children}
      </Modal>
    );
  }
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="bottom"
      classNames={{ content: classes.drawer }}
    >
      {children}
    </Drawer>
  );
}
