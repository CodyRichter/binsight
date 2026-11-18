import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Frame } from "@/components/Frame";
import type { Destination, NavSection } from "@/components/navigation";
import { Sheet } from "@/components/Sheet";
import { AddBarDemo } from "./AddBarDemo";
import { sampleViews } from "./samples";

interface DesignFrameProps {
  current?: Destination | null;
  currentView?: string;
  parent?: string;
  destination?: boolean;
  selectionBar?: ReactNode;
  children: ReactNode;
}

export function DesignFrame({ current = "home", currentView, parent, ...props }: DesignFrameProps) {
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  // The List template's specimen ended with its first real page, so search here goes nowhere.
  const [query, setQuery] = useState("");
  const sections: NavSection[] = [
    {
      id: "views",
      title: "Views",
      to: "/views",
      current: current === "views" && currentView === undefined,
      items: sampleViews.map((view) => ({ ...view, current: view.to === currentView })),
    },
  ];
  return (
    <Frame
      navigation={{ current, inboxCount: 3 }}
      sections={sections}
      search={{ query, onChange: setQuery }}
      actions={{ onAdd: () => setAdding(true), onScan: () => navigate("/scan") }}
      parent={parent ?? "/design"}
      destination={props.destination}
      selectionBar={props.selectionBar}
    >
      {props.children}
      <Sheet opened={adding} title="Add" onClose={() => setAdding(false)}>
        <AddBarDemo autoFocus />
      </Sheet>
    </Frame>
  );
}
