import { TextInput } from "@mantine/core";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { TaskPanel } from "@/components/TaskPanel";
import { TaskFrame } from "@/components/TaskFrame";
import { Scanner } from "./Scanner";

/** The in-app scanner: a scanned or typed label opens its location, as the phone's camera does. */
export function ScanTask() {
  const navigate = useNavigate();
  const { key } = useLocation();
  // Opened straight from an address, there is no page in the app to go back to.
  const close = () => (key === "default" ? navigate("/", { replace: true }) : navigate(-1));
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const open = (code: string) => navigate(`/l/${encodeURIComponent(code)}`);
  const openTyped = () => {
    if (typed.trim()) open(typed.trim());
  };
  const action = typing
    ? { label: "Open", onClick: openTyped }
    : { label: "Type the code", onClick: () => setTyping(true) };
  return (
    <TaskFrame name="Scan" onClose={close} action={action}>
      {typing ? (
        <TaskPanel onSubmit={openTyped}>
          <TextInput
            label="Code"
            placeholder="K7Q-4MZ"
            value={typed}
            onChange={(event) => setTyped(event.currentTarget.value)}
            autoFocus
          />
        </TaskPanel>
      ) : (
        <TaskPanel>
          <Scanner onCode={open} />
        </TaskPanel>
      )}
    </TaskFrame>
  );
}
