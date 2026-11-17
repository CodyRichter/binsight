import { Button, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { useCreateOwner } from "./useAuthActions";

const differ = "The passwords differ. Type them again.";

export function CreateOwnerForm() {
  const createOwner = useCreateOwner();
  const [password, setPassword] = useState("");
  const [repeated, setRepeated] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const typed = () => {
    setMismatch(false);
    createOwner.reset();
  };
  return (
    <Stack
      component="form"
      gap="lg"
      onSubmit={(event) => {
        event.preventDefault();
        if (password !== repeated) setMismatch(true);
        else if (!createOwner.isPending) createOwner.mutate(password);
      }}
    >
      <TextInput
        label="Password"
        type="password"
        autoComplete="new-password"
        autoFocus
        value={password}
        onChange={(event) => {
          setPassword(event.currentTarget.value);
          typed();
        }}
        error={createOwner.error?.message}
      />
      <TextInput
        label="Repeat password"
        type="password"
        autoComplete="new-password"
        value={repeated}
        onChange={(event) => {
          setRepeated(event.currentTarget.value);
          typed();
        }}
        error={mismatch ? differ : undefined}
      />
      <Button type="submit" variant="primary">
        Set password
      </Button>
    </Stack>
  );
}
