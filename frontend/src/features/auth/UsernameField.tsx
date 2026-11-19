import { TextInput } from "@mantine/core";

interface UsernameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/** The username box both sign-in forms open with. */
export function UsernameField({ value, onChange }: UsernameFieldProps) {
  return (
    <TextInput
      label="Username"
      autoComplete="username"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      autoFocus
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}
