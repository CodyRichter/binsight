import { Button } from "@mantine/core";
import { barControl } from "./barControls";

interface AddBarActionsProps {
  several: boolean;
  /** Drawn inside the bar, at its height, rather than on a line under it. */
  inBar: boolean;
  onSwitch?: () => void;
  onAdd: () => void;
}

const inBarVars = () => ({ root: { "--button-height": barControl } });

/** The add bar's Add several (or Add one) and Add buttons. */
export function AddBarActions({ several, inBar, onSwitch, onAdd }: AddBarActionsProps) {
  const vars = inBar ? inBarVars : undefined;
  return (
    <>
      {onSwitch && (
        <Button variant="subtle" vars={vars} onClick={onSwitch}>
          {several ? "Add one" : "Add several"}
        </Button>
      )}
      <Button vars={vars} onClick={onAdd}>
        Add
      </Button>
    </>
  );
}
