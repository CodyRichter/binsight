import classes from "./EditableText.module.css";

interface ChosenValueProps {
  value: string | null;
  label: string;
  invitation: string;
  onChoose: () => void;
}

/** A value picked in a sheet rather than typed: it reads as editable text and opens the sheet. */
export function ChosenValue({ value, label, invitation, onChoose }: ChosenValueProps) {
  return (
    <button
      type="button"
      className={classes.text}
      data-empty={!value || undefined}
      aria-label={`${label}: ${value || invitation}`}
      onClick={onChoose}
    >
      {value || invitation}
    </button>
  );
}
