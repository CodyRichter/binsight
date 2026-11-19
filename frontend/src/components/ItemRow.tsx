import { ActionIcon, Checkbox } from "@mantine/core";
import { IconArrowsMove, IconUnlink } from "@tabler/icons-react";
import { useId, type ReactNode } from "react";
import { Link } from "react-router";
import { CheckedStamp } from "./CheckedStamp";
import { markedText, type Mark } from "./markedText";
import { Path, type PathSegment } from "./Path";
import { QuantityStepper } from "./QuantityStepper";
import { StatusBadge, type Status } from "./StatusBadge";
import { Thumbnail } from "./Thumbnail";
import classes from "./ItemRow.module.css";

type ItemRowProps = {
  /** Null for an item added by photo and not named yet; it reads "Unnamed". */
  name: string | null;
  path?: PathSegment[];
  photoUrl?: string;
  status?: Status;
  lentTo?: string;
  /** Since when it has had its status, read after the badge: "Lent 2 days ago". */
  since?: string;
  /** When the item's home was last checked; shown only once stale, as in search results. */
  lastChecked?: Date | null;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  onMove?: () => void;
  /** On a linked item's row: removes the link, not the item. */
  onRemoveLink?: () => void;
  /** The parts of the name a search matched. */
  marks?: Mark[];
  selected?: boolean;
  check?: { checked: boolean; onChange: (checked: boolean) => void };
  /** For bulk edit: a box on the thumbnail's corner, the thumbnail its target, selects the row. */
  select?: { selected: boolean; onChange: (selected: boolean) => void };
} & (
  | { to: string; onPick?: never }
  // In a sheet the row picks the item instead of opening it.
  | { onPick: () => void; to?: never }
);

function rowName(props: ItemRowProps, checkId: string): ReactNode {
  const name = markedText(props.name ?? "Unnamed", props.marks, classes.match);
  const unnamed = props.name === null || undefined;
  if (props.to === undefined) {
    return (
      <button type="button" className={classes.name} data-unnamed={unnamed} onClick={props.onPick}>
        {name}
      </button>
    );
  }
  if (!props.check) {
    return (
      <Link className={classes.name} data-unnamed={unnamed} to={props.to}>
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

function metaLine(props: ItemRowProps): ReactNode {
  const { path, status = "in_place", lentTo, since, lastChecked } = props;
  if (!path && status === "in_place" && lastChecked === undefined) return null;
  return (
    <div className={classes.meta}>
      {path && <Path segments={path} />}
      <StatusBadge status={status} lentTo={lentTo} />
      {since && <span className={classes.since}>{since}</span>}
      {lastChecked !== undefined && <CheckedStamp lastChecked={lastChecked} onlyStale />}
    </div>
  );
}

function rowControls(props: ItemRowProps): ReactNode {
  const { name, quantity = 1, onQuantityChange, onMove, onRemoveLink } = props;
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
      {onRemoveLink && (
        <ActionIcon
          className={classes.move}
          aria-label={`Remove link to ${name ?? "Unnamed"}`}
          onClick={onRemoveLink}
        >
          <IconUnlink aria-hidden />
        </ActionIcon>
      )}
    </>
  );
}

function leading(props: ItemRowProps, checkId: string): ReactNode {
  const { check, select, photoUrl, name } = props;
  if (check) {
    return (
      <Checkbox
        id={checkId}
        className={classes.check}
        checked={check.checked}
        onChange={(event) => check.onChange(event.currentTarget.checked)}
      />
    );
  }
  if (!select) return <Thumbnail photoUrl={photoUrl} />;
  // The whole thumbnail is the box's target, so the box can be a small badge on its corner.
  return (
    <label className={classes.pick} data-selected={select.selected || undefined}>
      <Thumbnail photoUrl={photoUrl} />
      <Checkbox
        className={classes.pickBox}
        size="sm"
        aria-label={`Select ${name ?? "Unnamed"}`}
        checked={select.selected}
        onChange={(event) => select.onChange(event.currentTarget.checked)}
      />
    </label>
  );
}

export function ItemRow(props: ItemRowProps) {
  const checkId = useId();
  return (
    <li
      className={classes.row}
      data-selected={props.selected || props.select?.selected || undefined}
      data-movable={props.onMove || props.onRemoveLink ? true : undefined}
    >
      {leading(props, checkId)}
      <div className={classes.main}>
        {rowName(props, checkId)}
        {metaLine(props)}
      </div>
      {rowControls(props)}
    </li>
  );
}
