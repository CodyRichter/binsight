import { ActionIcon } from "@mantine/core";
import { IconChevronDown, IconChevronRight, IconPlus } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";
import { CodeChip } from "./CodeChip";
import { markedText, type Mark } from "./markedText";
import { locationTypeIcons, type LocationType } from "./locationTypeIcons";
import classes from "./LocationRow.module.css";

type LocationRowProps = {
  name: string;
  locationType: LocationType;
  code?: string;
  itemCount: number;
  /** The parts of the name a search matched. */
  marks?: Mark[];
  onAddInside?: () => void;
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

export function LocationRow(props: LocationRowProps) {
  const { name, code, itemCount, tree, depth = 0 } = props;
  const shownName = markedText(name, props.marks, classes.match);
  const TypeIcon = locationTypeIcons[props.locationType];
  return (
    <li
      className={classes.row}
      data-tree={tree || undefined}
      style={{ "--depth": depth } as CSSProperties}
    >
      {toggleControl(props)}
      <TypeIcon aria-hidden size={20} className={classes.type} />
      {props.to !== undefined ? (
        <Link className={classes.name} to={props.to}>
          {shownName}
        </Link>
      ) : (
        <button type="button" className={classes.name} onClick={props.onPick}>
          {shownName}
        </button>
      )}
      {code && <CodeChip code={code} />}
      <span className={classes.count}>{itemCount}</span>
      {props.onAddInside && (
        <ActionIcon
          className={classes.addInside}
          aria-label={`Add location inside ${name}`}
          onClick={props.onAddInside}
        >
          <IconPlus aria-hidden size={20} />
        </ActionIcon>
      )}
    </li>
  );
}
