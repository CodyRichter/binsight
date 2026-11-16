import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Frame } from "@/components/Frame";
import { Sheet } from "@/components/Sheet";
import { AddBarDemo } from "./AddBarDemo";
import { sampleViews } from "./samples";

interface DesignFrameProps {
  children: ReactNode;
}

export function DesignFrame({ children }: DesignFrameProps) {
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  return (
    <Frame
      navigation={{ current: "home", inboxCount: 3 }}
      views={sampleViews}
      actions={{
        onAdd: () => setAdding(true),
        onScan: () => undefined,
        onSearch: () => undefined,
        onBack: () => navigate(-1),
      }}
    >
      {children}
      <Sheet opened={adding} title="Add" onClose={() => setAdding(false)}>
        <AddBarDemo autoFocus />
      </Sheet>
    </Frame>
  );
}
