import { Textarea, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { DuplicateSuggestion } from "@/components/DuplicateSuggestion";
import { EditableText } from "@/components/EditableText";
import { showToast } from "@/lib/toast";
import { AddBarDemo } from "./AddBarDemo";
import { Specimen } from "./Specimen";

export function FieldsSpecimen() {
  const [summary, setSummary] = useState("Spare patch cables and adapters");
  const [emptySummary, setEmptySummary] = useState("");
  return (
    <Specimen title="Fields" gap="lg">
      <TextInput label="Name" defaultValue="Cat6 patch cable, 2 m" />
      <TextInput label="Serial number" placeholder="Optional" />
      <TextInput
        label="Label code"
        defaultValue="B-9999"
        error="No label has the code B-9999. Check the sticker and try again."
      />
      <TextInput
        aria-label="Search"
        placeholder="Search"
        leftSection={<IconSearch aria-hidden size={20} />}
      />
      <Textarea label="Names" placeholder="One name per line" autosize minRows={3} />
      <EditableText
        value={summary}
        label="Summary"
        invitation="Add a summary"
        onSave={setSummary}
      />
      <EditableText
        value={emptySummary}
        label="Summary"
        invitation="Add a summary"
        onSave={setEmptySummary}
      />
      <AddBarDemo />
      <DuplicateSuggestion
        message="AA batteries is in Network cables"
        onAccept={() =>
          showToast({ message: "Added 1 more AA batteries", onUndo: () => undefined })
        }
      />
    </Specimen>
  );
}
