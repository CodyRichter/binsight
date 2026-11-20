import { useState } from "react";
import { ListSection } from "@/components/ListSection";
import { LocationRow } from "@/components/LocationRow";

export function LocationTreeDemo() {
  const [garageOpen, setGarageOpen] = useState(true);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  return (
    <ListSection title="Locations" count={3}>
      <LocationRow
        name="Garage"
        to="/design"
        locationType="room"
        itemCount={148}
        tree
        depth={0}
        expanded={garageOpen}
        onToggle={() => setGarageOpen(!garageOpen)}
      />
      {garageOpen && (
        <>
          <LocationRow
            name="Network cables"
            to="/design"
            locationType="bin"
            code="K7Q-4MZ"
            itemCount={6}
            tree
            depth={1}
            current
          />
          <LocationRow
            name="Workbench"
            to="/design"
            locationType="furniture"
            itemCount={22}
            tree
            depth={1}
            expanded={workbenchOpen}
            onToggle={() => setWorkbenchOpen(!workbenchOpen)}
          />
          {workbenchOpen && (
            <LocationRow
              name="Top drawer"
              to="/design"
              locationType="drawer"
              itemCount={22}
              tree
              depth={2}
            />
          )}
        </>
      )}
    </ListSection>
  );
}
