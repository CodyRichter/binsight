import { ActionIcon, Button, Menu } from "@mantine/core";
import {
  IconArrowsMove,
  IconCategory,
  IconDotsVertical,
  IconHandGrab,
  IconHome,
  IconTag,
  IconTrash,
  IconUserShare,
} from "@tabler/icons-react";
import { useContext, useState } from "react";
import { FrameAdditionsContext } from "@/components/frameAdditions";
import { SelectionBar } from "@/components/SelectionBar";
import { CategorySheet } from "./CategorySheet";
import { LendSheet } from "./LendSheet";
import { retiring } from "./statusChoices";
import { TagSheet } from "./TagSheet";
import { useBulkEdits } from "./useBulkEdit";
import type { SettableStatus } from "./useStatusChange";

interface ItemSelectionBarProps {
  ids: string[];
  /** The location whose page holds the list, left out of where to move to. */
  here: string | null;
  /** Ends the selection: on Close, and once an edit is stored. */
  onEnd: () => void;
}

interface MoreChoices {
  onCategory: () => void;
  onLend: () => void;
  onStatus: (status: SettableStatus) => void;
  onDelete: () => void;
}

function moreMenu({ onCategory, onLend, onStatus, onDelete }: MoreChoices) {
  const statuses = [
    { status: "in_use" as const, words: "Mark in use", Icon: IconHandGrab },
    { status: "in_place" as const, words: "Back in place", Icon: IconHome },
    ...retiring,
  ];
  return (
    <Menu position="top-end">
      <Menu.Target>
        <ActionIcon variant="default" aria-label="More">
          <IconDotsVertical aria-hidden />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconCategory aria-hidden size={20} />} onClick={onCategory}>
          Change category…
        </Menu.Item>
        <Menu.Item leftSection={<IconUserShare aria-hidden size={20} />} onClick={onLend}>
          Lend to…
        </Menu.Item>
        <Menu.Divider />
        {statuses.map(({ status, words, Icon }) => (
          <Menu.Item
            key={status}
            leftSection={<Icon aria-hidden size={20} />}
            onClick={() => onStatus(status)}
          >
            {words}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          color="danger"
          leftSection={<IconTrash aria-hidden size={20} />}
          onClick={onDelete}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** The bar shown while items are selected: Move, Tag, and More for category, lending, status and delete. */
export function ItemSelectionBar({ ids, here, onEnd }: ItemSelectionBarProps) {
  const { MoveSheet } = useContext(FrameAdditionsContext);
  const [sheet, setSheet] = useState<"move" | "tag" | "category" | "lend">();
  const edits = useBulkEdits(onEnd);
  const close = () => setSheet(undefined);
  const count = ids.length === 1 ? "1 item" : `${ids.length} items`;
  const actions = (
    <>
      {MoveSheet && (
        <Button leftSection={<IconArrowsMove aria-hidden />} onClick={() => setSheet("move")}>
          Move
        </Button>
      )}
      <Button leftSection={<IconTag aria-hidden />} onClick={() => setSheet("tag")}>
        Tag
      </Button>
      {moreMenu({
        onCategory: () => setSheet("category"),
        onLend: () => setSheet("lend"),
        onStatus: (status) => edits.status(ids, status),
        onDelete: () => edits.remove(ids, null),
      })}
    </>
  );
  return (
    <>
      <SelectionBar count={ids.length} actions={actions} onClose={onEnd} />
      {MoveSheet && (
        <MoveSheet
          opened={sheet === "move"}
          onClose={close}
          currentId={here}
          title={`Move ${count} to`}
          onPick={(place) => edits.move(ids, place)}
        />
      )}
      <TagSheet
        opened={sheet === "tag"}
        current={[]}
        onAdd={(tag) => edits.tag(ids, tag)}
        onClose={close}
      />
      <CategorySheet
        opened={sheet === "category"}
        current={undefined}
        onPick={(category) => edits.category(ids, category)}
        onClose={close}
      />
      <LendSheet
        opened={sheet === "lend"}
        onLend={(lentTo) => edits.lend(ids, lentTo)}
        onClose={close}
      />
    </>
  );
}
