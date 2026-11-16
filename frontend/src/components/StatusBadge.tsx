import { IconArchive, IconHandGrab, IconUser, IconZoomQuestion } from "@tabler/icons-react";
import classes from "./StatusBadge.module.css";

export type Status =
  "in_place" | "in_use" | "lent_out" | "missing" | "sold" | "given_away" | "thrown_away";

interface StatusBadgeProps {
  status: Status;
  lentTo?: string;
}

const archivedWords = { sold: "Sold", given_away: "Given away", thrown_away: "Thrown away" };

function badgeLook(status: Exclude<Status, "in_place">, lentTo?: string) {
  if (status === "in_use") return { tone: "ink", Icon: IconHandGrab, words: "In use" };
  if (status === "lent_out") {
    return { tone: "lent", Icon: IconUser, words: lentTo ? `Lent to ${lentTo}` : "Lent out" };
  }
  if (status === "missing") return { tone: "danger", Icon: IconZoomQuestion, words: "Missing" };
  return { tone: "archived", Icon: IconArchive, words: archivedWords[status] };
}

export function StatusBadge({ status, lentTo }: StatusBadgeProps) {
  if (status === "in_place") return null;
  const { tone, Icon, words } = badgeLook(status, lentTo);
  return (
    <span className={classes.badge} data-tone={tone}>
      <Icon aria-hidden size={16} />
      {words}
    </span>
  );
}
