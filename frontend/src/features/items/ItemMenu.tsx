import { Menu } from "@mantine/core";
import {
  IconArrowMerge,
  IconCopy,
  IconLink,
  IconPaperclip,
  IconStatusChange,
  IconTrash,
} from "@tabler/icons-react";
import { useDeleteItem } from "./useDeleteItem";
import { useDuplicateItem } from "./useItemDuplicates";
import { isArchived } from "./useStatusChange";
import type { Item } from "./useItems";

interface ItemMenuProps {
  item: Item;
  onChangeStatus: () => void;
  onLink: () => void;
  onAttach: () => void;
  onMerge: () => void;
}

/** What an item page's More menu holds: its status, then adding to it, then removing it. */
export function ItemMenu({ item, onChangeStatus, onLink, onAttach, onMerge }: ItemMenuProps) {
  const deleteItem = useDeleteItem();
  const duplicate = useDuplicateItem();
  const icon = { "aria-hidden": true, size: 20 } as const;
  return (
    <>
      {!isArchived(item) && (
        <>
          <Menu.Item leftSection={<IconStatusChange {...icon} />} onClick={onChangeStatus}>
            Change status…
          </Menu.Item>
          <Menu.Divider />
        </>
      )}
      <Menu.Item leftSection={<IconLink {...icon} />} onClick={onLink}>
        Link an item
      </Menu.Item>
      <Menu.Item leftSection={<IconPaperclip {...icon} />} onClick={onAttach}>
        Attach…
      </Menu.Item>
      <Menu.Item leftSection={<IconCopy {...icon} />} onClick={() => duplicate(item)}>
        Duplicate
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item leftSection={<IconArrowMerge {...icon} />} onClick={onMerge}>
        Merge into…
      </Menu.Item>
      <Menu.Item
        color="danger"
        leftSection={<IconTrash {...icon} />}
        onClick={() => deleteItem(item)}
      >
        Delete item
      </Menu.Item>
    </>
  );
}
