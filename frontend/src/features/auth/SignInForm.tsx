import { Button, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { useSignIn } from "./useAuthActions";

export function SignInForm() {
  const signIn = useSignIn();
  const [password, setPassword] = useState("");
  return (
    <Stack
      component="form"
      gap="lg"
      onSubmit={(event) => {
        event.preventDefault();
        if (!signIn.isPending) signIn.mutate(password);
      }}
    >
      <TextInput
        label="Password"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(event) => {
          setPassword(event.currentTarget.value);
          signIn.reset();
        }}
        error={signIn.error?.message}
      />
      <Button type="submit" variant="primary">
        Sign in
      </Button>
    </Stack>
  );
}
