import { Button, Stack, TextInput } from "@mantine/core";
import { useNavigate } from "react-router";
import { GateFrame } from "@/components/GateFrame";

export function GateSpecimen() {
  const navigate = useNavigate();
  return (
    <GateFrame>
      <Stack
        component="form"
        gap="lg"
        onSubmit={(event) => {
          event.preventDefault();
          navigate("/design");
        }}
      >
        <TextInput label="Password" type="password" autoComplete="current-password" />
        <Button type="submit" variant="primary">
          Sign in
        </Button>
      </Stack>
    </GateFrame>
  );
}
