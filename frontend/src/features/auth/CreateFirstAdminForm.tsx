import { Button, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { NewPasswordFields } from "./NewPasswordFields";
import { useCreateFirstAdmin } from "./useAuthActions";
import { UsernameField } from "./UsernameField";

export function CreateFirstAdminForm() {
  const create = useCreateFirstAdmin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  return (
    <Stack
      component="form"
      gap="lg"
      onSubmit={(event) => {
        event.preventDefault();
        setChecked(true);
        if (password !== null && !create.isPending) create.mutate({ username, password });
      }}
    >
      <Text>Make the first account. It is an admin, and can add everyone else.</Text>
      <UsernameField
        value={username}
        onChange={(typed) => {
          setUsername(typed);
          create.reset();
        }}
      />
      <NewPasswordFields
        checked={checked}
        error={create.error?.message}
        onChange={(chosen) => {
          setPassword(chosen);
          setChecked(false);
          create.reset();
        }}
      />
      <Button type="submit" variant="primary">
        Create account
      </Button>
    </Stack>
  );
}
