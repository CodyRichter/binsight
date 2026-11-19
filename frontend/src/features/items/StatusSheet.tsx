import { IconHandGrab, IconUserShare } from "@tabler/icons-react";
import { NameRow } from "@/components/NameRow";
import { Sheet } from "@/components/Sheet";
import { retiring } from "./statusChoices";
import { useStatusChange, type SettableStatus } from "./useStatusChange";
import type { Item } from "./useItems";

interface StatusSheetProps {
  item: Item;
  opened: boolean;
  onClose: () => void;
  /** Lending asks for a name, so the Lent to sheet takes this one's place. */
  onLend: () => void;
}

/** The statuses an item can be given from its More menu: lent, in use, or retired to the archive. */
export function StatusSheet({ item, opened, onClose, onLend }: StatusSheetProps) {
  const changeStatus = useStatusChange();
  const pick = (status: SettableStatus) => {
    onClose();
    changeStatus(item, status);
  };
  const rows = (
    <>
      <NameRow name="Lend…" icon={<IconUserShare aria-hidden size={20} />} onPick={onLend} />
      {item.status !== "in_use" && (
        <NameRow
          name="Mark in use"
          icon={<IconHandGrab aria-hidden size={20} />}
          onPick={() => pick("in_use")}
        />
      )}
      {retiring.map(({ status, words, Icon }) => (
        <NameRow
          key={status}
          name={words}
          icon={<Icon aria-hidden size={20} />}
          onPick={() => pick(status)}
        />
      ))}
    </>
  );
  return <Sheet opened={opened} title="Change status" onClose={onClose} rows={rows} />;
}
