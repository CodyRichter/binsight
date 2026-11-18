import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { NameRow } from "@/components/NameRow";
import { Sheet } from "@/components/Sheet";
import { useLentToNames } from "./useLentToNames";

interface LendSheetProps {
  opened: boolean;
  onLend: (lentTo: string) => void;
  onClose: () => void;
}

/** Lending an item: to someone it was lent to before, or a name typed. */
export function LendSheet({ opened, onLend, onClose }: LendSheetProps) {
  const [query, setQuery] = useState("");
  const names = useLentToNames(opened).data?.items ?? [];
  const typed = query.trim();
  const shown = names.filter((each) => each.name.toLowerCase().includes(typed.toLowerCase()));
  const close = () => {
    setQuery("");
    onClose();
  };
  const lend = (name: string) => {
    close();
    onLend(name);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (typed) lend(typed);
  };
  return (
    <Sheet
      opened={opened}
      title="Lent to"
      onClose={close}
      onSubmit={submit}
      rows={shown.map((each) => (
        <NameRow key={each.name} name={each.name} onPick={() => lend(each.name)} />
      ))}
    >
      <TextInput
        label="Name"
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <Button type="submit" variant="primary">
        Lend
      </Button>
    </Sheet>
  );
}
