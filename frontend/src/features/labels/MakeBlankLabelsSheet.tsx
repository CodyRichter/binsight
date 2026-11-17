import { Button, TextInput } from "@mantine/core";
import { useState, type FormEvent } from "react";
import { Sheet } from "@/components/Sheet";
import { useMakeBlankLabels } from "./useLabels";

interface MakeBlankLabelsSheetProps {
  opened: boolean;
  onClose: () => void;
}

const most = 100;

export function MakeBlankLabelsSheet({ opened, onClose }: MakeBlankLabelsSheetProps) {
  const make = useMakeBlankLabels();
  const [count, setCount] = useState("");
  const [error, setError] = useState<string | undefined>();

  function close() {
    setCount("");
    setError(undefined);
    onClose();
  }

  function makeNow(event: FormEvent) {
    event.preventDefault();
    const number = Number(count);
    if (!Number.isInteger(number) || number < 1 || number > most) {
      setError(`Make 1 to ${most} labels at a time.`);
      return;
    }
    make(number);
    close();
  }

  return (
    <Sheet opened={opened} title="Make blank labels" onClose={close} onSubmit={makeNow}>
      <TextInput
        label="How many"
        inputMode="numeric"
        data-autofocus
        value={count}
        error={error}
        onChange={(event) => {
          setCount(event.currentTarget.value);
          setError(undefined);
        }}
      />
      <Button type="submit" variant="primary">
        Make
      </Button>
    </Sheet>
  );
}
