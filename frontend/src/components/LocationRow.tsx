import { ActionIcon } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";
import { CodeChip } from "./CodeChip";
import { locationTypeIcons, type LocationType } from "./locationTypeIcons";
import classes from "./LocationRow.module.css";

type LocationRowProps = {
  name: string;
  locationType: LocationType;
  code?: string;
  itemCount: number;
  depth?: number;
  expanded?: boolean;
  onToggle?: () => void;
} & ({ to: string; onPick?: never } | { onPick: () => void; to?: never });

export function LocationRow(props: LocationRowProps) {
  const { name, code, itemCount, depth = 0, expanded, onToggle } = props;
  const TypeIcon = locationTypeIcons[props.locationType];
  const Chevron = expanded ? IconChevronDown : IconChevronRight;
  return (
    <li className={classes.row} style={{ "--depth": depth } as CSSProperties}>
      {onToggle ? (
        <ActionIcon
          className={classes.toggle}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${name}`}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <Chevron aria-hidden size={20} />
        </ActionIcon>
      ) : (
        <span className={classes.toggleSpace} />
      )}
      <TypeIcon aria-hidden size={20} className={classes.type} />
      {props.to !== undefined ? (
        <Link className={classes.name} to={props.to}>
          {name}
        </Link>
      ) : (
        <button type="button" className={classes.name} onClick={props.onPick}>
          {name}
        </button>
      )}
      {code && <CodeChip code={code} />}
      <span className={classes.count}>{itemCount}</span>
    </li>
  );
}
