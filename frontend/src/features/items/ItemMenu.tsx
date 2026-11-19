import { Menu } from "@mantine/core";
import { IconArrowMerge, IconCopy, IconLink, IconPaperclip, IconTrash } from "@tabler/icons-react";
import { StatusMenuItems } from "./StatusMenuItems";
import { useDeleteItem } from "./useDeleteItem";
import { useDuplicateItem } from "./useItemDuplicates";
import type { Item } from "./useItems";

interface ItemMenuProps {
  item: Item;
  onLend: () => void;
  onLink: () => void;
  onAttach: () => void;
  onMerge: () => void;
}

/** What an item page's More menu holds: statuses, then linking, attaching, copying and removing. */
export function ItemMenu({ item, onLend, onLink, onAttach, onMerge }: ItemMenuProps) {
  const deleteItem = useDeleteItem();
  const duplicate = useDuplicateItem();
  const icon = { "aria-hidden": true, size: 20 } as const;
  return (
    <>
      <StatusMenuItems item={item} onLend={onLend} />
      <Menu.Item leftSection={<IconLink {...icon} />} onClick={onLink}>
        Link an item
      </Menu.Item>
      <Menu.Item leftSection={<IconPaperclip {...icon} />} onClick={onAttach}>
        Attach…
      </Menu.Item>
      <Menu.Item leftSection={<IconCopy {...icon} />} onClick={() => duplicate(item)}>
        Duplicate
      </Menu.Item>
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
