import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActionIcon } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import type { CSSProperties, ReactNode, Ref } from "react";
import classes from "./LocationRow.module.css";

/** What a row needs to be dragged: its element, where it is drawn mid-drag, and its handle. */
export interface SortableRowParts {
  rowRef: Ref<HTMLLIElement>;
  rowStyle: CSSProperties;
  dragging: boolean;
  handle: ReactNode;
}

interface SortableRowProps {
  id: string;
  name: string;
  children: (parts: SortableRowParts) => ReactNode;
}

function SortableRow({ id, name, children }: SortableRowProps) {
  const sortable = useSortable({ id });
  const handle = (
    <ActionIcon
      ref={sortable.setActivatorNodeRef}
      className={classes.handle}
      aria-label={`Reorder ${name}`}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <IconGripVertical aria-hidden size={20} />
    </ActionIcon>
  );
  return children({
    rowRef: sortable.setNodeRef,
    rowStyle: {
      transform: CSS.Translate.toString(sortable.transform),
      transition: sortable.transition,
    },
    dragging: sortable.isDragging,
    handle,
  });
}

interface SortableListProps<Row extends { id: string; name: string }> {
  rows: Row[];
  /** A row dropped at a new place, counting from 0 among these rows. */
  onMove: (row: Row, index: number) => void;
  children: (row: Row, parts: SortableRowParts) => ReactNode;
}

function announcements(
  name: (id: string | number) => string,
  place: (id: string | number) => number,
): Announcements {
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${name(active.id)} is now at place ${place(over.id) + 1}.`
        : `${name(active.id)} is no longer over the list.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${name(active.id)} at place ${place(over.id) + 1}.`
        : `Dropped ${name(active.id)}.`,
    onDragCancel: ({ active }) => `Put ${name(active.id)} back.`,
  };
}

/** Rows put in order by dragging their handle, or with the keyboard: Space, the arrows, Space. */
export function SortableList<Row extends { id: string; name: string }>({
  rows,
  onMove,
  children,
}: SortableListProps<Row>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = rows.map((row) => row.id);
  const name = (id: string | number) => rows.find((row) => row.id === id)?.name ?? "";
  const place = (id: string | number) => ids.indexOf(String(id));
  const dropped = ({ active, over }: DragEndEvent) => {
    const moving = rows.find((row) => row.id === active.id);
    if (moving && over && active.id !== over.id) onMove(moving, place(over.id));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={dropped}
      // Its live region would otherwise sit inside the list, where only rows may.
      accessibility={{ announcements: announcements(name, place), container: document.body }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {rows.map((row) => (
          <SortableRow key={row.id} id={row.id} name={row.name}>
            {(parts) => children(row, parts)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}
