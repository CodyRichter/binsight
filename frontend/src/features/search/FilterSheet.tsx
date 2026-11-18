import { NameRow } from "@/components/NameRow";
import { Sheet } from "@/components/Sheet";

export interface FilterChoice {
  value: string;
  name: string;
  itemCount?: number;
}

interface FilterSheetProps {
  opened: boolean;
  title: string;
  choices: FilterChoice[];
  onPick: (value: string) => void;
  onClose: () => void;
}

/** Picking the one value a search filter keeps. */
export function FilterSheet({ opened, title, choices, onPick, onClose }: FilterSheetProps) {
  const pick = (value: string) => {
    onClose();
    onPick(value);
  };
  return (
    <Sheet
      opened={opened}
      title={title}
      onClose={onClose}
      rows={choices.map((choice) => (
        <NameRow
          key={choice.value}
          name={choice.name}
          itemCount={choice.itemCount}
          onPick={() => pick(choice.value)}
        />
      ))}
    />
  );
}
