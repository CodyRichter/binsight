import { ActionIcon, Button, Input } from "@mantine/core";
import { IconArrowLeft, IconPlus, IconScan, IconSearch, IconX } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { barControl, barIconVars } from "./barControls";
import classes from "./TopBar.module.css";

interface TopBarProps {
  wide: boolean;
  onBack?: () => void;
  search: { query: string; onChange: (query: string) => void };
  autoFocusSearch?: boolean;
  onScan?: () => void;
  onAdd?: () => void;
}

const barButtonVars = () => ({
  root: {
    "--button-height": barControl,
    "--button-padding-x": "var(--bs-space-lg)",
    "--button-fz": "var(--mantine-font-size-md)",
  },
});
const barInputVars = () => ({
  wrapper: { "--input-height": barControl, "--input-fz": "var(--mantine-font-size-md)" },
});

export function TopBar({ wide, onBack, search, autoFocusSearch, onScan, onAdd }: TopBarProps) {
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (field.current && field.current.value !== search.query) {
      field.current.value = search.query;
    }
  }, [search.query]);
  const clearSearch = () => {
    if (field.current) field.current.value = "";
    field.current?.focus();
    search.onChange("");
  };
  const clear = search.query && (
    <ActionIcon aria-label="Clear search" vars={barIconVars} onClick={clearSearch}>
      <IconX aria-hidden size={20} />
    </ActionIcon>
  );
  return (
    <div className={classes.bar}>
      {onBack && (
        <ActionIcon aria-label="Back" vars={barIconVars} onClick={onBack}>
          <IconArrowLeft aria-hidden />
        </ActionIcon>
      )}
      <div
        className={classes.search}
        data-search
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            field.current?.focus();
          }
        }}
      >
        <Input
          type="search"
          aria-label="Search"
          placeholder="Search"
          ref={field}
          defaultValue={search.query}
          vars={barInputVars}
          // Typing moves to the results page, which mounts a new frame; this keeps the cursor there.
          autoFocus={autoFocusSearch}
          onChange={(event) => search.onChange(event.currentTarget.value)}
          leftSection={<IconSearch aria-hidden size={20} />}
          rightSection={clear}
          rightSectionPointerEvents="all"
        />
      </div>
      {wide ? (
        <>
          {onScan && (
            <Button leftSection={<IconScan aria-hidden />} vars={barButtonVars} onClick={onScan}>
              Scan
            </Button>
          )}
          {onAdd && (
            <Button
              variant="primary"
              leftSection={<IconPlus aria-hidden />}
              vars={barButtonVars}
              onClick={onAdd}
            >
              Add
            </Button>
          )}
        </>
      ) : (
        onScan && (
          <ActionIcon aria-label="Scan" vars={barIconVars} onClick={onScan}>
            <IconScan aria-hidden />
          </ActionIcon>
        )
      )}
    </div>
  );
}
