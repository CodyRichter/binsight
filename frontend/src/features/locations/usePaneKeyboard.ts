import { useEffect, type KeyboardEvent, type RefObject } from "react";

/** Leaves one tab stop in the pane, the lit row (or the first), so Tab passes it in one press. */
function keepOneTabStop(pane: HTMLElement) {
  const controls = [...pane.querySelectorAll<HTMLElement>("a, button")];
  const stop = pane.querySelector<HTMLElement>('a[aria-current="page"]') ?? controls[0];
  for (const control of controls) control.tabIndex = control === stop ? 0 : -1;
}

function toggleRow(link: HTMLElement, open: boolean) {
  const toggle = link.closest("li")?.querySelector<HTMLElement>("button[aria-expanded]");
  if (toggle?.getAttribute("aria-expanded") === String(!open)) toggle.click();
}

/** Up and Down move between the pane's rows; Right opens a branch and Left closes it. */
export function usePaneKeyboard(pane: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (pane.current) keepOneTabStop(pane.current);
  });
  return (event: KeyboardEvent<HTMLElement>) => {
    const links = [...event.currentTarget.querySelectorAll<HTMLElement>("a")];
    const index = links.findIndex((link) => link === document.activeElement);
    if (index < 0) return;
    const moves: Record<string, () => void> = {
      ArrowDown: () => links[index + 1]?.focus(),
      ArrowUp: () => links[index - 1]?.focus(),
      ArrowRight: () => toggleRow(links[index], true),
      ArrowLeft: () => toggleRow(links[index], false),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };
}
