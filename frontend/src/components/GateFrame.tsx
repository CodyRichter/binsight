import { Title } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./GateFrame.module.css";

interface GateFrameProps {
  children: ReactNode;
}

export function GateFrame({ children }: GateFrameProps) {
  return (
    <main id="content" className={classes.frame} data-frame="gate">
      <title>Binsight</title>
      <Title order={1}>Binsight</Title>
      {children}
    </main>
  );
}
