import { DateInput, type DayOfWeek } from "@mantine/dates";
import { useRef, type FocusEvent, type KeyboardEvent } from "react";
import classes from "./EditableText.module.css";

interface DateFieldProps {
  /** The date as `YYYY-MM-DD`, or empty. */
  value: string;
  label: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function pad(part: number): string {
  return String(part).padStart(2, "0");
}

// A typed `YYYY-MM-DD` is taken as written; Date would read it as UTC and could shift the day.
function parseDate(text: string): string | null {
  const typed = text.trim();
  if (isoDate.test(typed)) return typed;
  const parsed = new Date(typed);
  if (!typed || Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

interface WeekInfo {
  firstDay: number;
}

// Intl.Locale's week info is not in TypeScript's library yet, and Firefox names it as a property.
function firstDayOfWeek(): DayOfWeek {
  const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
    getWeekInfo?: () => WeekInfo;
    weekInfo?: WeekInfo;
  };
  const info = locale.getWeekInfo?.() ?? locale.weekInfo;
  return ((info?.firstDay ?? 1) % 7) as DayOfWeek;
}

/** A date edited in place: typed, or picked from the calendar that opens with it. */
export function DateField({ value, label, onSave, onCancel }: DateFieldProps) {
  const typed = useRef(value);
  // Picking a day ends editing, and the field's removal can still blur it; only the first end counts.
  const ended = useRef(false);
  const end = (then: () => void) => {
    if (ended.current) return;
    ended.current = true;
    then();
  };
  const finish = (event: FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>) => {
    const text = event.currentTarget.value.trim();
    end(() => onSave(text ? typed.current : ""));
  };
  return (
    <DateInput
      aria-label={label}
      classNames={{ input: classes.field }}
      styles={{ input: { height: "auto", minHeight: 0 } }}
      defaultValue={value || null}
      valueFormat="MMM D, YYYY"
      dateParser={parseDate}
      placeholder="Mar 1, 2027"
      firstDayOfWeek={firstDayOfWeek()}
      autoFocus
      onChange={(picked) => (typed.current = picked ?? "")}
      getDayProps={(day) => ({ onClick: () => end(() => onSave(day)) })}
      onBlur={finish}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        // Focus returns to the value's button, which the same Enter would press, reopening it empty.
        if (event.key === "Enter" || event.key === "Escape") event.preventDefault();
        if (event.key === "Enter") finish(event);
        if (event.key === "Escape") end(onCancel);
      }}
    />
  );
}
