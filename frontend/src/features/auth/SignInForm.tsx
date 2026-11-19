import { Button, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { useSignIn } from "./useAuthActions";
import { UsernameField } from "./UsernameField";

export function SignInForm() {
  const signIn = useSignIn();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <Stack
      component="form"
      gap="lg"
      onSubmit={(event) => {
        event.preventDefault();
        if (!signIn.isPending) signIn.mutate({ username, password });
      }}
    >
      <UsernameField
        value={username}
        onChange={(typed) => {
          setUsername(typed);
          signIn.reset();
        }}
      />
      <TextInput
        label="Password"
        type="password"
        autoComplete="current-password"
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
