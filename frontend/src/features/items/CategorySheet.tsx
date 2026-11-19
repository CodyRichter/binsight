import { Button, Group, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState, type FormEvent } from "react";
import { NameRow } from "@/components/NameRow";
import { Sheet } from "@/components/Sheet";
import { useCategories } from "./useNames";

interface CategorySheetProps {
  opened: boolean;
  /** The category items have now; undefined for several items, which may differ. */
  current: string | null | undefined;
  onPick: (category: string | null) => void;
  onClose: () => void;
}

/** Picking an item's category: one already in use, a new one by name, or none. */
export function CategorySheet({ opened, current, onPick, onClose }: CategorySheetProps) {
  const [query, setQuery] = useState("");
  const categories = useCategories(opened).data?.items ?? [];
  const typed = query.trim();
  const shown = categories.filter(
    (category) =>
      category.name !== current && category.name.toLowerCase().includes(typed.toLowerCase()),
  );
  const exact = categories.some((category) => category.name.toLowerCase() === typed.toLowerCase());
  const pick = (category: string | null) => {
    setQuery("");
    onClose();
    if (category !== current) onPick(category);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (typed)
      pick(
        categories.find((each) => each.name.toLowerCase() === typed.toLowerCase())?.name ?? typed,
      );
  };
  return (
    <Sheet
      opened={opened}
      title="Category"
      onClose={() => {
        setQuery("");
        onClose();
      }}
      onSubmit={submit}
      rows={[
        typed && !exact && (
          <NameRow key="make" name={`Make "${typed}"`} onPick={() => pick(typed)} />
        ),
        ...shown.map((category) => (
          <NameRow
            key={category.name}
            name={category.name}
            itemCount={category.item_count}
            onPick={() => pick(category.name)}
          />
        )),
      ]}
    >
      <TextInput
        aria-label="Category"
        placeholder="Search or make a category"
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<IconSearch aria-hidden size={20} />}
      />
      {current !== null && (
        <Group>
          <Button variant="subtle" onClick={() => pick(null)}>
            No category
          </Button>
        </Group>
      )}
    </Sheet>
  );
}
