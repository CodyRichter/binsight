import { TextInput } from "@mantine/core";
import { useState } from "react";

const differ = "The passwords differ. Type them again.";

interface NewPasswordFieldsProps {
  /** Whether the form was sent, so a mismatch is shown. */
  checked: boolean;
  error?: string;
  label?: string;
  /** The chosen password once both boxes match, otherwise null. */
  onChange: (password: string | null) => void;
}

/** A new password typed twice, so a slip of the finger is caught before it is saved. */
export function NewPasswordFields({
  checked,
  error,
  label = "Password",
  onChange,
}: NewPasswordFieldsProps) {
  const [password, setPassword] = useState("");
  const [repeated, setRepeated] = useState("");
  const typed = (first: string, second: string) => {
    setPassword(first);
    setRepeated(second);
    onChange(first === second ? first : null);
  };
  return (
    <>
      <TextInput
        label={label}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => typed(event.currentTarget.value, repeated)}
        error={error}
      />
      <TextInput
        label={`Repeat ${label.toLowerCase()}`}
        type="password"
        autoComplete="new-password"
        value={repeated}
        onChange={(event) => typed(password, event.currentTarget.value)}
        error={checked && password !== repeated ? differ : undefined}
      />
    </>
  );
}
