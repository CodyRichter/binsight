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

// iOS Safari draws the keyboard over the page without resizing it, so the sheet is lifted by hand.
function useKeyboardHeight(opened: boolean): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!opened || !viewport) return;
    const measure = () =>
      setHeight(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    return () => {
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
    };
  }, [opened]);
  return height;
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
  const keyboardHeight = useKeyboardHeight(opened && !wide);
  const body = sheetBody(props);
  if (wide) {
    return (
      <Modal opened={opened} onClose={onClose} title={title}>
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
      classNames={{ content: classes.drawer }}
      styles={{ inner: { bottom: keyboardHeight } }}
    >
      {body}
    </Drawer>
  );
}
