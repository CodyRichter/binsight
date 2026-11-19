import { Drawer, Modal, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import classes from "./Sheet.module.css";

interface SheetProps {
  opened: boolean;
  title: string;
  onClose: () => void;
  rows?: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  children?: ReactNode;
}

interface VisibleArea {
  top: number;
  height: number;
}

// iOS Safari draws the keyboard over the page and scrolls the page under it, so the sheet is
// placed in the part of the screen still visible, measured from the visual viewport alone.
function useVisibleArea(opened: boolean): VisibleArea | undefined {
  const [area, setArea] = useState<VisibleArea>();
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!opened || !viewport) return;
    const measure = () => setArea({ top: viewport.offsetTop, height: viewport.height });
    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    return () => {
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
    };
  }, [opened]);
  return area;
}

function sheetForm({ onSubmit, children }: SheetProps): ReactNode {
  if (!children) return null;
  if (!onSubmit) return <div className={classes.form}>{children}</div>;
  return (
    <form className={classes.form} onSubmit={onSubmit}>
      {children}
    </form>
  );
}

function sheetBody(props: SheetProps): ReactNode {
  return (
    <>
      {sheetForm(props)}
      {props.rows && <ul className={classes.rows}>{props.rows}</ul>}
    </>
  );
}

export function Sheet(props: SheetProps) {
  const { opened, title, onClose } = props;
  const theme = useMantineTheme();
  const wide = useMediaQuery(`(min-width: ${theme.breakpoints.md})`, false, {
    getInitialValueInEffect: false,
  });
  const visible = useVisibleArea(opened && !wide);
  const body = sheetBody(props);
  if (wide) {
    return (
      <Modal opened={opened} onClose={onClose} title={title} classNames={{ body: classes.body }}>
        {body}
      </Modal>
    );
  }
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="bottom"
      classNames={{ content: classes.drawer, body: classes.body }}
      styles={{ inner: visible && { top: visible.top, bottom: "auto", height: visible.height } }}
    >
      {body}
    </Drawer>
  );
}
