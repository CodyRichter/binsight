import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { NameRow } from "@/components/NameRow";
import { Sheet } from "@/components/Sheet";
import { useTags } from "./useNames";

interface TagSheetProps {
  opened: boolean;
  current: string[];
  onAdd: (tag: string) => void;
  onClose: () => void;
}

/** Adding a tag to an item: one already in use, or a new one typed. */
export function TagSheet({ opened, current, onAdd, onClose }: TagSheetProps) {
  const [query, setQuery] = useState("");
  const tags = useTags(opened).data?.items ?? [];
  const typed = query.trim().toLowerCase();
  const shown = tags.filter((tag) => !current.includes(tag.name) && tag.name.includes(typed));
  const add = (tag: string) => {
    setQuery("");
    onClose();
    if (!current.includes(tag)) onAdd(tag);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (typed) add(typed);
  };
  return (
    <Sheet
      opened={opened}
      title="Add tag"
      onClose={() => {
        setQuery("");
        onClose();
      }}
      onSubmit={submit}
      rows={shown.map((tag) => (
        <NameRow
          key={tag.name}
          name={tag.name}
          itemCount={tag.item_count}
          onPick={() => add(tag.name)}
        />
      ))}
    >
      <TextInput
        label="Tag"
        placeholder="usb-c"
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <Button type="submit" variant="primary">
        Add
      </Button>
    </Sheet>
  );
}
