import { ActionIcon, Checkbox } from "@mantine/core";
import { IconArrowsMove } from "@tabler/icons-react";
import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { markedText, type Mark } from "./markedText";
import { Path, type PathSegment } from "./Path";
import { QuantityStepper } from "./QuantityStepper";
import { StatusBadge, type Status } from "./StatusBadge";
import { Thumbnail } from "./Thumbnail";
import classes from "./ItemRow.module.css";

interface ItemRowProps {
  /** Null for an item added by photo and not named yet; it reads "Unnamed". */
  name: string | null;
  to: string;
  path?: PathSegment[];
  photoUrl?: string;
  status?: Status;
  lentTo?: string;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  onMove?: () => void;
  /** The parts of the name a search matched. */
  marks?: Mark[];
  selected?: boolean;
  check?: { checked: boolean; onChange: (checked: boolean) => void };
}

function rowName(props: ItemRowProps, checkId: string): ReactNode {
  const name = markedText(props.name ?? "Unnamed", props.marks, classes.match);
  if (!props.check) {
    return (
      <Link className={classes.name} data-unnamed={props.name === null || undefined} to={props.to}>
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
        <ActionIcon
          className={classes.move}
          aria-label={`Move ${name ?? "Unnamed"}`}
          onClick={onMove}
        >
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
