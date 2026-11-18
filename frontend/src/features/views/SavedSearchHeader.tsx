import { Button, Menu } from "@mantine/core";
import { IconPencil, IconPin, IconPinnedOff, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/PageHeader";
import { resultCount } from "@/features/search";
import { NameSheet } from "./NameSheet";
import { useChangeSavedSearch, useDeleteSavedSearch, type SavedSearch } from "./useSavedSearches";

/** A saved search's header: its name and count, Pin or Unpin, and Rename and Delete in More. */
export function SavedSearchHeader({ saved }: { saved: SavedSearch }) {
  const [renaming, setRenaming] = useState(false);
  const change = useChangeSavedSearch();
  const remove = useDeleteSavedSearch();
  const navigate = useNavigate();
  const PinIcon = saved.pinned ? IconPinnedOff : IconPin;
  const menu = (
    <>
      <Menu.Item
        leftSection={<IconPencil aria-hidden size={20} />}
        onClick={() => setRenaming(true)}
      >
        Rename…
      </Menu.Item>
      <Menu.Item
        color="danger"
        leftSection={<IconTrash aria-hidden size={20} />}
        onClick={() => {
          void navigate("/views", { replace: true });
          remove(saved);
        }}
      >
        Delete saved search
      </Menu.Item>
    </>
  );
  return (
    <>
      <PageHeader
        title={saved.name}
        counts={resultCount(saved.count)}
        actions={
          <Button
            leftSection={<PinIcon aria-hidden />}
            onClick={() => change({ id: saved.id, pinned: !saved.pinned })}
          >
            {saved.pinned ? "Unpin" : "Pin"}
          </Button>
        }
        menu={menu}
      />
      <NameSheet
        key={String(renaming)}
        opened={renaming}
        title="Rename"
        action="Rename"
        initialName={saved.name}
        onName={(name) => change({ id: saved.id, name })}
        onClose={() => setRenaming(false)}
      />
    </>
  );
}
