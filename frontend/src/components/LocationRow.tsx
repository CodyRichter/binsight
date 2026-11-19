import { ActionIcon } from "@mantine/core";
import { IconChevronDown, IconChevronRight, IconPlus } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";
import { CheckedStamp } from "./CheckedStamp";
import { CodeChip } from "./CodeChip";
import { markedText, type Mark } from "./markedText";
import { locationTypeIcons, type LocationType } from "./locationTypeIcons";
import type { SortableRowParts } from "./SortableList";
import classes from "./LocationRow.module.css";

type LocationRowProps = {
  name: string;
  locationType: LocationType;
  code?: string;
  itemCount: number;
  /** The parts of the name a search matched. */
  marks?: Mark[];
  /** When its contents were last checked; shown only once stale, as in a view's rows. */
  lastChecked?: Date | null;
  onAddInside?: () => void;
  /** Given inside a SortableList, so the row can be dragged by its handle. */
  sortable?: SortableRowParts;
} & ({ to: string; onPick?: never } | { onPick: () => void; to?: never }) &
  (
    | { tree: true; depth: number; expanded?: boolean; onToggle?: () => void }
    | { tree?: never; depth?: never; expanded?: never; onToggle?: never }
  );

function toggleControl({ name, tree, expanded, onToggle }: LocationRowProps): ReactNode {
  if (!onToggle) return tree ? <span className={classes.toggleSpace} /> : null;
  const Chevron = expanded ? IconChevronDown : IconChevronRight;
  return (
    <ActionIcon
      className={classes.toggle}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${name}`}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <Chevron aria-hidden size={20} />
    </ActionIcon>
  );
}

function nameControl(props: LocationRowProps, shownName: ReactNode): ReactNode {
  return props.to !== undefined ? (
    <Link className={classes.name} to={props.to}>
      {shownName}
    </Link>
  ) : (
    <button type="button" className={classes.name} onClick={props.onPick}>
      {shownName}
    </button>
  );
}

function endControls({ name, onAddInside, sortable }: LocationRowProps): ReactNode {
  return (
    <>
      {onAddInside && (
        <ActionIcon
          className={classes.addInside}
          aria-label={`Add location inside ${name}`}
          onClick={onAddInside}
        >
          <IconPlus aria-hidden size={20} />
        </ActionIcon>
      )}
      {sortable?.handle}
    </>
  );
}

export function LocationRow(props: LocationRowProps) {
  const { name, code, itemCount, tree, depth = 0 } = props;
  const shownName = markedText(name, props.marks, classes.match);
  const TypeIcon = locationTypeIcons[props.locationType];
  const { sortable } = props;
  return (
    <li
      ref={sortable?.rowRef}
      className={classes.row}
      data-tree={tree || undefined}
      data-dragging={sortable?.dragging || undefined}
      style={{ "--depth": depth, ...sortable?.rowStyle } as CSSProperties}
    >
      {toggleControl(props)}
      <TypeIcon aria-hidden size={20} className={classes.type} />
      {nameControl(props, shownName)}
      {code && <CodeChip code={code} />}
      {props.lastChecked !== undefined && (
        <CheckedStamp lastChecked={props.lastChecked} onlyStale />
      )}
      <span className={classes.count}>{itemCount}</span>
      {endControls(props)}
    </li>
  );
}
