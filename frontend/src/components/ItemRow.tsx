import { ActionIcon, Checkbox } from "@mantine/core";
import { IconArrowsMove } from "@tabler/icons-react";
import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { Path, type PathSegment } from "./Path";
import { QuantityStepper } from "./QuantityStepper";
import { StatusBadge, type Status } from "./StatusBadge";
import { Thumbnail } from "./Thumbnail";
import classes from "./ItemRow.module.css";

interface ItemRowProps {
  name: string;
  to: string;
  path?: PathSegment[];
  photoUrl?: string;
  status?: Status;
  lentTo?: string;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  onMove?: () => void;
  match?: string;
  selected?: boolean;
  check?: { checked: boolean; onChange: (checked: boolean) => void };
}

function markedName(name: string, match?: string): ReactNode {
  const start = match ? name.toLowerCase().indexOf(match.toLowerCase()) : -1;
  if (!match || start < 0) return name;
  const end = start + match.length;
  return (
    <>
      {name.slice(0, start)}
      <mark className={classes.match}>{name.slice(start, end)}</mark>
      {name.slice(end)}
    </>
  );
}

function rowName(props: ItemRowProps, checkId: string): ReactNode {
  const name = markedName(props.name, props.match);
  if (!props.check) {
    return (
      <Link className={classes.name} to={props.to}>
        {name}
      </Link>
    );
  }
  return (
    <label className={classes.name} htmlFor={checkId}>
      {name}
    </label>
  );
}

function rowControls({ name, quantity = 1, onQuantityChange, onMove }: ItemRowProps): ReactNode {
  return (
    <>
      {quantity > 1 && onQuantityChange && (
        <span className={classes.quantity}>
          <QuantityStepper value={quantity} onChange={onQuantityChange} />
        </span>
      )}
      {onMove && (
        <ActionIcon className={classes.move} aria-label={`Move ${name}`} onClick={onMove}>
          <IconArrowsMove aria-hidden />
        </ActionIcon>
      )}
    </>
  );
}

export function ItemRow(props: ItemRowProps) {
  const { path, photoUrl, status = "in_place", lentTo, check } = props;
  const checkId = useId();
  return (
    <li
      className={classes.row}
      data-selected={props.selected || undefined}
      data-movable={props.onMove ? true : undefined}
    >
      {check ? (
        <Checkbox
          id={checkId}
          className={classes.check}
          checked={check.checked}
          onChange={(event) => check.onChange(event.currentTarget.checked)}
        />
      ) : (
        <Thumbnail photoUrl={photoUrl} />
      )}
      <div className={classes.main}>
        {rowName(props, checkId)}
        {(path || status !== "in_place") && (
          <div className={classes.meta}>
            {path && <Path segments={path} />}
            <StatusBadge status={status} lentTo={lentTo} />
          </div>
        )}
      </div>
      {rowControls(props)}
    </li>
  );
}
