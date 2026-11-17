import { Button, Textarea } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AddByPhotoButton } from "./AddByPhotoButton";
import { CodeChip } from "./CodeChip";
import classes from "./AddBar.module.css";

interface AddBarProps {
  destinationCode?: string;
  destinationName?: string;
  onChangeDestination?: () => void;
  onAdd: (names: string[]) => void;
  onAddSeveral?: (names: string[]) => void;
  onAddByPhoto?: (photo: File) => void;
  onNameChange?: (name: string) => void;
  suggestion?: (clearName: () => void) => ReactNode;
  autoFocus?: boolean;
}

function destination(code?: string, name?: string) {
  if (code) return <CodeChip code={code} />;
  return name ?? "Inbox";
}

function destinationButton(props: AddBarProps): ReactNode {
  if (!props.onChangeDestination) return null;
  const where = props.destinationCode ?? props.destinationName ?? "Inbox";
  return (
    <button
      type="button"
      className={classes.destination}
      aria-label={`Add to ${where}, change destination`}
      onClick={props.onChangeDestination}
    >
      to {destination(props.destinationCode, props.destinationName)}
    </button>
  );
}

export function AddBar(props: AddBarProps) {
  const [several, setSeveral] = useState(false);
  const [switched, setSwitched] = useState(false);
  const [lines, setLines] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  function clearName() {
    if (nameInput.current) nameInput.current.value = "";
    nameInput.current?.focus();
    props.onNameChange?.("");
  }

  function switchField() {
    setSeveral(!several);
    setSwitched(true);
  }

  function submitOne() {
    const name = nameInput.current?.value.trim() ?? "";
    if (!name) return;
    props.onAdd([name]);
    clearName();
  }

  function addOne(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.key !== "Enter") return;
    submitOne();
  }

  function addSeveral() {
    const names = lines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    props.onAddSeveral?.(names);
    setLines("");
  }

  return (
    <div className={classes.addBar}>
      <div className={classes.bar}>
        <IconPlus aria-hidden className={classes.plus} />
        {several ? (
          <Textarea
            className={classes.several}
            aria-label="Add several, one name per line"
            placeholder="One name per line"
            autosize
            minRows={3}
            autoFocus
            value={lines}
            onChange={(event) => setLines(event.currentTarget.value)}
          />
        ) : (
          <input
            ref={nameInput}
            className={classes.input}
            aria-label="Add an item"
            placeholder="Add an item"
            autoFocus={switched}
            data-autofocus={props.autoFocus || undefined}
            onChange={(event) => props.onNameChange?.(event.currentTarget.value.trim())}
            onKeyDown={addOne}
          />
        )}
        {destinationButton(props)}
        {props.onAddByPhoto && <AddByPhotoButton onAddByPhoto={props.onAddByPhoto} />}
      </div>
      {!several && props.suggestion?.(clearName)}
      <div className={classes.below}>
        {props.onAddSeveral && (
          <Button variant="subtle" onClick={switchField}>
            {several ? "Add one" : "Add several"}
          </Button>
        )}
        <Button onClick={several ? addSeveral : submitOne}>Add</Button>
      </div>
    </div>
  );
}
