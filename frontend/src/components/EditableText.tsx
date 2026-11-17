import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import classes from "./EditableText.module.css";

interface EditableTextProps {
  value: string;
  label: string;
  invitation?: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}

type Field = HTMLInputElement | HTMLTextAreaElement;

export function EditableText({ value, label, invitation, multiline, onSave }: EditableTextProps) {
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

  if (editing) {
    const Field = multiline ? "textarea" : "input";
    return (
      <Field
        className={classes.field}
        aria-label={label}
        defaultValue={value}
        rows={multiline ? 4 : undefined}
        autoFocus
        onBlur={(event) => save(event.currentTarget.value)}
        onKeyDown={handleKey}
      />
    );
  }
  if (!value && !invitation) return null;
  return (
    <button
      ref={buttonRef}
      type="button"
      className={classes.text}
      data-empty={!value || undefined}
      aria-label={`${label}: ${value || "empty"}`}
      onClick={() => setEditing(true)}
    >
      {value || invitation}
    </button>
  );
}
