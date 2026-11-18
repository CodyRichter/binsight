import { Menu } from "@mantine/core";
import { IconCash, IconGift, IconHandGrab, IconTrashX, IconUserShare } from "@tabler/icons-react";
import { isArchived, useStatusChange, type SettableStatus } from "./useStatusChange";
import type { Item } from "./useItems";

const retiring: { status: SettableStatus; words: string; Icon: typeof IconCash }[] = [
  { status: "sold", words: "Sold", Icon: IconCash },
  { status: "given_away", words: "Given away", Icon: IconGift },
  { status: "thrown_away", words: "Thrown away", Icon: IconTrashX },
];

interface StatusMenuItemsProps {
  item: Item;
  onLend: () => void;
}

/** More's status entries: lend, in use, and retiring to the archive; none once archived. */
export function StatusMenuItems({ item, onLend }: StatusMenuItemsProps) {
  const changeStatus = useStatusChange();
  if (isArchived(item)) return null;
  return (
    <>
      <Menu.Item leftSection={<IconUserShare aria-hidden size={20} />} onClick={onLend}>
        Lend…
      </Menu.Item>
      {item.status !== "in_use" && (
        <Menu.Item
          leftSection={<IconHandGrab aria-hidden size={20} />}
          onClick={() => changeStatus(item, "in_use")}
        >
          Mark in use
        </Menu.Item>
      )}
      {retiring.map(({ status, words, Icon }) => (
        <Menu.Item
          key={status}
          leftSection={<Icon aria-hidden size={20} />}
          onClick={() => changeStatus(item, status)}
        >
          {words}
        </Menu.Item>
      ))}
    </>
  );
}
