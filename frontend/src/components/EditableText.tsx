import { useState, type KeyboardEvent } from "react";
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

  function save(typed: string) {
    setEditing(false);
    if (typed.trim() !== value) onSave(typed.trim());
  }

  function handleKey(event: KeyboardEvent<Field>) {
    if (event.key === "Enter" && !multiline) event.currentTarget.blur();
    if (event.key === "Escape") {
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
