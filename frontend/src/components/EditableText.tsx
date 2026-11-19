import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { DateField } from "./DateField";
import classes from "./EditableText.module.css";

interface EditableTextProps {
  value: string;
  label: string;
  invitation?: string;
  multiline?: boolean;
  /** The kind of field a one-line value is typed in. */
  type?: "text" | "date" | "url";
  inputMode?: "decimal";
  /** How the value reads at rest, when that differs from how it is typed (a date). */
  display?: string;
  /** Left out for someone who may not change it: the value shows as plain text. */
  onSave?: (value: string) => void;
}

type Field = HTMLInputElement | HTMLTextAreaElement;

type TextFieldProps = Pick<
  EditableTextProps,
  "value" | "label" | "multiline" | "type" | "inputMode"
>;

function textField(
  { value, label, multiline, type, inputMode }: TextFieldProps,
  onBlur: (event: FocusEvent<Field>) => void,
  onKeyDown: (event: KeyboardEvent<Field>) => void,
) {
  if (multiline) {
    return (
      <textarea
        className={classes.field}
        aria-label={label}
        defaultValue={value}
        rows={4}
        autoFocus
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    );
  }
  return (
    <input
      className={classes.field}
      aria-label={label}
      defaultValue={value}
      type={type}
      inputMode={inputMode}
      autoFocus
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}

interface Resting {
  value: string;
  shown: string;
  label: string;
  invitation?: string;
}

function resting(
  { value, shown, label, invitation }: Resting,
  buttonRef: RefObject<HTMLButtonElement | null>,
  onEdit: () => void,
) {
  if (!shown && !invitation) return null;
  return (
    <button
      ref={buttonRef}
      type="button"
      className={classes.text}
      data-empty={!value || undefined}
      // A name must include the words shown, so an empty field is named by its invitation.
      aria-label={`${label}: ${shown || invitation}`}
      onClick={onEdit}
    >
      {shown || invitation}
    </button>
  );
}

export function EditableText({
  value,
  label,
  invitation,
  multiline,
  type,
  inputMode,
  display,
  onSave,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      buttonRef.current?.focus();
    }
  }, [editing]);

  function save(typed: string) {
    setEditing(false);
    if (typed.trim() !== value) onSave?.(typed.trim());
  }

  function handleKey(event: KeyboardEvent<Field>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      restoreFocus.current = true;
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      restoreFocus.current = true;
      event.currentTarget.value = value;
      event.currentTarget.blur();
    }
  }

  const ended = (then: () => void) => {
    restoreFocus.current = true;
    then();
  };
  if (editing && type === "date") {
    return (
      <DateField
        value={value}
        label={label}
        onSave={(picked) => ended(() => save(picked))}
        onCancel={() => ended(() => setEditing(false))}
      />
    );
  }
  if (editing) {
    const onBlur = (event: FocusEvent<Field>) => save(event.currentTarget.value);
    return textField({ value, label, multiline, type, inputMode }, onBlur, handleKey);
  }
  const shown = display ?? value;
  if (!onSave) return shown ? <span className={classes.shown}>{shown}</span> : null;
  return resting({ value, shown, label, invitation }, buttonRef, () => setEditing(true));
}
