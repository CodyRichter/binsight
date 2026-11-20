import { TextInput, Title } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { IconGrid } from "@/components/IconGrid";
import { LocationIcon } from "@/components/LocationIcon";
import type { LocationType } from "@/components/locationIcons";
import { NameRow } from "@/components/NameRow";
import { PhotoChoice } from "@/components/PhotoChoice";
import { Sheet } from "@/components/Sheet";
import { searchIcons } from "./iconSearch";
import { starterIcons } from "./starterIcons";
import type { Change } from "./useLocationChanges";
import type { Location } from "./useLocations";

const changeableTypes: LocationType[] = ["room", "furniture", "shelf", "bin", "drawer", "box"];

interface PhotoAndIconSheetProps {
  opened: boolean;
  location: Location;
  onPick: (change: Change) => void;
  onPhoto: (photo: File | null) => void;
  onClose: () => void;
}

// Fetched the first time the sheet opens, so no other page pays for it (decision 0019).
function useIconIndex(opened: boolean) {
  return useQuery({
    queryKey: ["icon-index"],
    queryFn: async () => (await import("virtual:icon-index")).default,
    enabled: opened,
    staleTime: Infinity,
  }).data;
}

/** Everything a location shows as its picture: its photo, its icon and its type. */
export function PhotoAndIconSheet(props: PhotoAndIconSheetProps) {
  const { opened, location, onPick, onPhoto, onClose } = props;
  const [query, setQuery] = useState("");
  const index = useIconIndex(opened);
  const found = index && query.trim() ? searchIcons(index, query) : undefined;
  const site = location.type === "site";
  const close = () => {
    setQuery("");
    onClose();
  };
  const pick = (change: Change, same: boolean) => {
    close();
    if (!same) onPick(change);
  };
  const typeRows = changeableTypes.map((type) => (
    <NameRow
      key={type}
      name={type.charAt(0).toUpperCase() + type.slice(1)}
      icon={<LocationIcon type={type} size={20} />}
      chosen={type === location.type}
      onPick={() => pick({ type }, type === location.type)}
    />
  ));
  return (
    <Sheet
      opened={opened}
      title="Photo and icon"
      onClose={close}
      rows={site ? undefined : typeRows}
    >
      <Title order={2}>Photo</Title>
      <PhotoChoice
        photoUrl={location.photo_url ?? undefined}
        inputLabel="Location photo"
        onPhoto={(photo) => {
          close();
          onPhoto(photo);
        }}
      />
      <Title order={2}>Icon</Title>
      <TextInput
        aria-label="Search icons"
        placeholder="Search icons"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        leftSection={<IconSearch aria-hidden size={20} />}
      />
      <IconGrid
        type={location.type}
        icons={found ? found.names : [null, ...starterIcons]}
        chosen={location.icon}
        total={found?.total}
        onPick={(icon) => pick({ icon }, icon === location.icon)}
      />
      {!site && <Title order={2}>Type</Title>}
    </Sheet>
  );
}
