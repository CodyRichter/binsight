import { ActionIcon, Button, TextInput } from "@mantine/core";
import { IconArrowLeft, IconPlus, IconScan, IconSearch, IconX } from "@tabler/icons-react";
import { useRef } from "react";
import classes from "./TopBar.module.css";

interface TopBarProps {
  wide: boolean;
  onBack?: () => void;
  search: { query: string; onChange: (query: string) => void };
  onScan: () => void;
  onAdd: () => void;
}

export function TopBar({ wide, onBack, search, onScan, onAdd }: TopBarProps) {
  const field = useRef<HTMLInputElement>(null);
  const clearSearch = () => {
    if (field.current) field.current.value = "";
    field.current?.focus();
    search.onChange("");
  };
  const clear = search.query && (
    <ActionIcon aria-label="Clear search" onClick={clearSearch}>
      <IconX aria-hidden size={20} />
    </ActionIcon>
  );
  return (
    <div className={classes.bar}>
      {onBack && (
        <ActionIcon aria-label="Back" onClick={onBack}>
          <IconArrowLeft aria-hidden />
        </ActionIcon>
      )}
      <TextInput
        className={classes.search}
        type="search"
        aria-label="Search"
        placeholder="Search"
        ref={field}
        defaultValue={search.query}
        // Typing moves to the results page, which mounts a new frame; this keeps the cursor there.
        autoFocus={search.query !== ""}
        onChange={(event) => search.onChange(event.currentTarget.value)}
        leftSection={<IconSearch aria-hidden size={20} />}
        rightSection={clear}
        rightSectionPointerEvents="all"
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
