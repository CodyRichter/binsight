import type { ReactNode } from "react";

/** Where matched text starts and ends in a name, as search answers it. */
export interface Mark {
  start: number;
  end: number;
}

/** A name with its matched parts in `<mark>`, which the row styles with `highlight`. */
export function markedText(text: string, marks: Mark[] | undefined, className: string): ReactNode {
  if (!marks || marks.length === 0) return text;
  const parts: ReactNode[] = [];
  let at = 0;
  for (const { start, end } of marks) {
    parts.push(text.slice(at, start));
    parts.push(
      <mark key={start} className={className}>
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  parts.push(text.slice(at));
  return parts;
}
