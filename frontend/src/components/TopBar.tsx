import { ActionIcon, Button, TextInput } from "@mantine/core";
import { IconArrowLeft, IconPlus, IconScan, IconSearch } from "@tabler/icons-react";
import type { KeyboardEvent } from "react";
import classes from "./TopBar.module.css";

interface TopBarProps {
  wide: boolean;
  onBack?: () => void;
  onSearch: (query: string) => void;
  onScan: () => void;
  onAdd: () => void;
}

export function TopBar({ wide, onBack, onSearch, onScan, onAdd }: TopBarProps) {
  function search(event: KeyboardEvent<HTMLInputElement>) {
    const query = event.currentTarget.value.trim();
    if (event.key === "Enter" && query) onSearch(query);
  }

  return (
    <div className={classes.bar}>
      {!wide && onBack && (
        <ActionIcon aria-label="Back" onClick={onBack}>
          <IconArrowLeft aria-hidden />
        </ActionIcon>
      )}
      <TextInput
        className={classes.search}
        type="search"
        aria-label="Search"
        placeholder="Search"
        leftSection={<IconSearch aria-hidden size={20} />}
        onKeyDown={search}
      />
      {wide ? (
        <>
          <Button leftSection={<IconScan aria-hidden />} onClick={onScan}>
            Scan
          </Button>
          <Button variant="primary" leftSection={<IconPlus aria-hidden />} onClick={onAdd}>
            Add
          </Button>
        </>
      ) : (
        <ActionIcon aria-label="Scan" onClick={onScan}>
          <IconScan aria-hidden />
        </ActionIcon>
      )}
    </div>
  );
}
