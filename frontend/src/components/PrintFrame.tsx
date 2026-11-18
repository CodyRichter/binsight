import { ActionIcon, Button } from "@mantine/core";
import { IconPrinter, IconX } from "@tabler/icons-react";
import { useEffect, type ReactNode } from "react";
import { barIconVars } from "./barControls";
import { ErrorBoundary } from "./ErrorBoundary";
import { SessionCheck } from "./SessionCheck";
import classes from "./PrintFrame.module.css";

interface PrintFrameProps {
  name: string;
  onClose: () => void;
  children: ReactNode;
}

const scheme = "data-mantine-color-scheme";

/** Paper is white, so a page printed from dark mode is printed in the light colors. */
function usePrintedLight() {
  useEffect(() => {
    const root = document.documentElement;
    let shown: string | null = null;
    const beforePrint = () => {
      shown = root.getAttribute(scheme);
      root.setAttribute(scheme, "light");
    };
    const afterPrint = () => {
      if (shown) root.setAttribute(scheme, shown);
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);
}

export function PrintFrame({ name, onClose, children }: PrintFrameProps) {
  usePrintedLight();
  return (
    <div className={classes.frame} data-frame="print">
      <header className={classes.bar}>
        <ActionIcon aria-label="Close" vars={barIconVars} onClick={onClose}>
          <IconX aria-hidden />
        </ActionIcon>
        <span className={classes.name}>{name}</span>
        <Button
          variant="primary"
          leftSection={<IconPrinter aria-hidden />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </header>
      <main id="content" className={classes.paper}>
        <ErrorBoundary onGoHome={onClose}>
          <SessionCheck>{children}</SessionCheck>
        </ErrorBoundary>
      </main>
    </div>
  );
}
