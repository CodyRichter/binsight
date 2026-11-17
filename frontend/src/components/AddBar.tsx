import { ActionIcon, Button, Textarea } from "@mantine/core";
import { IconCamera, IconPlus } from "@tabler/icons-react";
import { useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { barIconVars } from "./barControls";
import { CodeChip } from "./CodeChip";
import classes from "./AddBar.module.css";

interface AddBarProps {
  destinationCode?: string;
  destinationName?: string;
  onChangeDestination: () => void;
  onAdd: (names: string[]) => void;
  onAddByPhoto: (photo: File) => void;
  onNameChange?: (name: string) => void;
  suggestion?: (clearName: () => void) => ReactNode;
  autoFocus?: boolean;
}

function destination(code?: string, name?: string) {
  if (code) return <CodeChip code={code} />;
  return name ?? "Inbox";
}

export function AddBar(props: AddBarProps) {
  const [several, setSeveral] = useState(false);
  const [switched, setSwitched] = useState(false);
  const [lines, setLines] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
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

  function addPhoto(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.currentTarget.files?.[0];
    if (photo) props.onAddByPhoto(photo);
    event.currentTarget.value = "";
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
    props.onAdd(names);
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
        <button
          type="button"
          className={classes.destination}
          aria-label={`Add to ${props.destinationCode ?? props.destinationName ?? "Inbox"}, change destination`}
          onClick={props.onChangeDestination}
        >
          to {destination(props.destinationCode, props.destinationName)}
        </button>
        <ActionIcon
          aria-label="Add by photo"
          vars={barIconVars}
          onClick={() => photoInput.current?.click()}
        >
          <IconCamera aria-hidden />
        </ActionIcon>
        <input
          ref={photoInput}
          className={classes.photoInput}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden
          onChange={addPhoto}
        />
      </div>
      {!several && props.suggestion?.(clearName)}
      <div className={classes.below}>
        <Button variant="subtle" onClick={switchField}>
          {several ? "Add one" : "Add several"}
        </Button>
        <Button onClick={several ? addSeveral : submitOne}>Add</Button>
      </div>
    </div>
  );
}
