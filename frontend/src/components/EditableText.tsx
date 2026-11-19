import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
  onSave: (value: string) => void;
}

type Field = HTMLInputElement | HTMLTextAreaElement;

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
    if (typed.trim() !== value) onSave(typed.trim());
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

  if (editing && multiline) {
    return (
      <textarea
        className={classes.field}
        aria-label={label}
        defaultValue={value}
        rows={4}
        autoFocus
        onBlur={(event) => save(event.currentTarget.value)}
        onKeyDown={handleKey}
      />
    );
  }
  if (editing) {
    return (
      <input
        className={classes.field}
        aria-label={label}
        defaultValue={value}
        type={type}
        inputMode={inputMode}
        autoFocus
        onBlur={(event) => save(event.currentTarget.value)}
        onKeyDown={handleKey}
      />
    );
  }
  const shown = display ?? value;
  if (!shown && !invitation) return null;
  return (
    <button
      ref={buttonRef}
      type="button"
      className={classes.text}
      data-empty={!value || undefined}
      // A name must include the words shown, so an empty field is named by its invitation.
      aria-label={`${label}: ${shown || invitation}`}
      onClick={() => setEditing(true)}
    >
      {shown || invitation}
    </button>
  );
}
