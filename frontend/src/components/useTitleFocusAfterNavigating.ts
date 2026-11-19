import { useEffect } from "react";
import { useLocation } from "react-router";

function focusTitle(): boolean {
  const title = document.querySelector<HTMLElement>("#content h1");
  title?.focus();
  return Boolean(title);
}

/** After moving to another page, focus goes to its title, as a screen reader expects. */
export function useTitleFocusAfterNavigating() {
  const { key } = useLocation();
  useEffect(() => {
    const typing = document.activeElement?.matches("input, textarea");
    if (key === "default" || typing || focusTitle()) return;
    // A page still loading has no title yet, so focus goes to it once it appears, unless moved.
    const content = document.querySelector("#content");
    if (!content) return;
    const waiting = new MutationObserver(() => {
      if (document.activeElement !== document.body && document.activeElement !== content) {
        waiting.disconnect();
      } else if (focusTitle()) waiting.disconnect();
    });
    waiting.observe(content, { childList: true, subtree: true });
    return () => waiting.disconnect();
  }, [key]);
}
