import { Stack } from "@mantine/core";
import { useState } from "react";
import { AddBar } from "@/components/AddBar";
import { DuplicateSuggestion } from "@/components/DuplicateSuggestion";
import { ItemRow } from "@/components/ItemRow";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";
import { showToast } from "@/lib/toast";

interface Destination {
  code?: string;
  name: string;
}

interface AddedItem {
  name: string;
  photoUrl?: string;
}

const destinations: (Destination & { type: "bin" | "furniture"; count: number })[] = [
  { code: "B-014", name: "Network cables", type: "bin", count: 6 },
  { code: "B-015", name: "Power tools", type: "bin", count: 9 },
  { name: "Workbench", type: "furniture", count: 22 },
];

interface AddBarDemoProps {
  autoFocus?: boolean;
}

export function AddBarDemo({ autoFocus }: AddBarDemoProps) {
  const [destination, setDestination] = useState<Destination | null>(null);
  const [typed, setTyped] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [added, setAdded] = useState<AddedItem[]>([]);
  const where = destination?.code ? `Bin ${destination.code}` : (destination?.name ?? "Inbox");
  const existing = [...added.map((item) => item.name), "AA batteries"].find(
    (name) => typed && name.toLowerCase() === typed.toLowerCase(),
  );

  function add(items: AddedItem[]) {
    setAdded([...added, ...items]);
    showToast({ message: `Added to ${where}`, onUndo: () => setAdded(added) });
  }

  if (choosing) {
    return (
      <ListSection title="Add to">
        {destinations.map((place) => (
          <LocationRow
            key={place.name}
            name={place.name}
            code={place.code}
            locationType={place.type}
            itemCount={place.count}
            onPick={() => {
              setDestination(place);
              setChoosing(false);
            }}
          />
        ))}
      </ListSection>
    );
  }
  return (
    <Stack gap="lg">
      <AddBar
        destinationCode={destination?.code}
        destinationName={destination?.name}
        onChangeDestination={() => setChoosing(true)}
        onAdd={(names) => add(names.map((name) => ({ name })))}
        onAddSeveral={(names) => add(names.map((name) => ({ name })))}
        onAddByPhoto={(photo) => add([{ name: photo.name, photoUrl: URL.createObjectURL(photo) }])}
        onNameChange={setTyped}
        autoFocus={autoFocus}
        suggestion={(clearName) =>
          existing && (
            <DuplicateSuggestion
              message={`${existing} is already here`}
              onAccept={() => {
                clearName();
                showToast({ message: `Added 1 more ${existing}`, onUndo: () => undefined });
              }}
            />
          )
        }
      />
      {added.length > 0 && (
        <ListSection title="Added" count={added.length}>
          {added.map((item, index) => (
            <ItemRow key={index} name={item.name} photoUrl={item.photoUrl} to="/design" />
          ))}
        </ListSection>
      )}
    </Stack>
  );
}
