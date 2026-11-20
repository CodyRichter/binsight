import { Textarea } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { AddByPhotoButton } from "./AddByPhotoButton";
import { AddBarActions } from "./AddBarActions";
import { CodeChip } from "./CodeChip";
import { useWiderThan } from "./frameWidths";
import classes from "./AddBar.module.css";

interface AddBarProps {
  destinationCode?: string;
  destinationName?: string;
  onChangeDestination?: () => void;
  onAdd: (names: string[]) => void;
  onAddSeveral?: (names: string[]) => void;
  onAddByPhoto?: (photo: File) => void;
  onNameChange?: (name: string) => void;
  /** The name the field starts with, such as a search that found nothing. */
  defaultName?: string;
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

function namesIn(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AddBar(props: AddBarProps) {
  const [several, setSeveral] = useState(false);
  const [switched, setSwitched] = useState(false);
  const [lines, setLines] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const inBar = useWiderThan("md");

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

  // Pasting several lines into the one-name field switches to adding several, lines kept.
  function pasteLines(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!props.onAddSeveral || namesIn(pasted).length < 2) return;
    event.preventDefault();
    setLines(pasted.trim());
    switchField();
  }

  function addSeveral() {
    const names = namesIn(lines);
    if (names.length === 0) return;
    props.onAddSeveral?.(names);
    setLines("");
  }

  const actions = (
    <AddBarActions
      several={several}
      inBar={inBar}
      onSwitch={props.onAddSeveral && switchField}
      onAdd={several ? addSeveral : submitOne}
    />
  );
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
            defaultValue={props.defaultName}
            autoFocus={switched}
            data-autofocus={props.autoFocus || undefined}
            onChange={(event) => props.onNameChange?.(event.currentTarget.value.trim())}
            onKeyDown={addOne}
            onPaste={pasteLines}
          />
        )}
        {destinationButton(props)}
        {props.onAddByPhoto && <AddByPhotoButton onAddByPhoto={props.onAddByPhoto} />}
        {inBar && actions}
      </div>
      {!several && props.suggestion?.(clearName)}
      {!inBar && <div className={classes.below}>{actions}</div>}
    </div>
  );
}
